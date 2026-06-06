<?php

namespace App\Services;

use App\Models\CodigoOtp;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthService
{
    public function __construct(
        protected AuditoriaAccesoService $auditoria,
        protected DispositivoService $dispositivoService,
        protected TotpService $totpService
    ) {}

    public function intentarLogin(array $credenciales, Request $request): array
    {
        $email       = $credenciales['email'];
        $fingerprint = $credenciales['fingerprint'];

        if ($this->auditoria->contarIntentosFallidosPorIp($request->ip()) >= 10) {
            $this->auditoria->registrarIntento($email, false, 'rate_limit_ip', $request);
            throw new \Exception('Demasiados intentos fallidos. Intenta nuevamente mas tarde.');
        }

        $user = User::where('email', $email)->first();

        $passwordCorrecta = $user
            ? Hash::check($credenciales['password'], $user->password)
            : (bool) Hash::check('dummy', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

        if (!$user) {
            $this->auditoria->registrarIntento($email, false, 'email_inexistente', $request);
            throw new \Exception('Correo o contrasena incorrectos.');
        }

        if ($user->estado === 'suspendido') {
            $this->auditoria->registrarIntento($email, false, 'cuenta_suspendida', $request);
            throw new \Exception('Tu cuenta ha sido bloqueada por seguridad tras 3 intentos fallidos. Comunicate con el soporte tecnico de la empresa para reactivar tu cuenta.');
        }

        if ($user->estado === 'inactivo') {
            $this->auditoria->registrarIntento($email, false, 'cuenta_inactiva', $request);
            throw new \Exception('Cuenta inactiva, comunicate con soporte tecnico.');
        }

        if (!$passwordCorrecta) {
            $user->increment('intentos_fallidos');
            $user->refresh();

            if ($user->intentos_fallidos >= 3) {
                $user->update(['estado' => 'suspendido']);
                $this->auditoria->registrarIntento($email, false, 'cuenta_suspendida_por_intentos', $request);
                throw new \Exception('Tu cuenta ha sido bloqueada por seguridad tras 3 intentos fallidos. Comunicate con el soporte tecnico de la empresa para reactivar tu cuenta.');
            }

            $this->auditoria->registrarIntento($email, false, 'password_incorrecto', $request);
            throw new \Exception('Correo o contrasena incorrectos.');
        }

        $user->update([
            'intentos_fallidos' => 0,
            'ultimo_acceso'     => now(),
        ]);

        if ($user->debe_cambiar_password) {
            $this->auditoria->registrarIntento($email, true, 'primer_login', $request);
            $token = $user->createToken('auth_token', ['*'], now()->addHours(8))->plainTextToken;
            $user->load('rol');

            return [
                'tipo_respuesta'        => 'login_exitoso',
                'token'                 => $token,
                'usuario'               => $user,
                'permisos'              => $user->getPermisos(),
                'debe_cambiar_password' => true,
            ];
        }

        if ($this->dispositivoService->esDispositivoConfiable($user->id, $fingerprint)) {
            $this->dispositivoService->actualizarUltimoUso($user->id, $fingerprint);
            $this->auditoria->registrarIntento($email, true, null, $request);

            $token = $user->createToken('auth_token', ['*'], now()->addHours(8))->plainTextToken;
            $user->load('rol');

            return [
                'tipo_respuesta'        => 'login_exitoso',
                'token'                 => $token,
                'usuario'               => $user,
                'permisos'              => $user->getPermisos(),
                'debe_cambiar_password' => false,
            ];
        }

        // Dispositivo nuevo → crear sesión TOTP (sin enviar email)
        $tokenTemporal = $this->crearSesionTotp($user, $fingerprint, $request->userAgent() ?? '', $request->ip());
        $this->auditoria->registrarIntento($email, true, 'pendiente_totp', $request);

        return [
            'tipo_respuesta' => 'requiere_2fa',
            'token_temporal' => $tokenTemporal,
        ];
    }

    public function verificarOtp(string $tokenTemporal, string $codigo, bool $confiarDispositivo, string $fingerprint, Request $request): array
    {
        $pendiente = CodigoOtp::where('token_temporal', $tokenTemporal)
            ->where('usado', false)
            ->where('expira_en', '>', now())
            ->first();

        if (!$pendiente) {
            throw new \Exception('Sesión de verificación inválida o expirada.');
        }

        $user = User::findOrFail($pendiente->usuario_id);

        if (!$user->totp_activo || !$user->totp_secret) {
            throw new \Exception('TOTP no configurado. Configura Google Authenticator desde tu perfil.');
        }

        if (!$this->totpService->verificarCodigo($user->totp_secret, $codigo)) {
            throw new \Exception('Código incorrecto.');
        }

        $pendiente->update(['usado' => true]);

        if ($confiarDispositivo && $fingerprint) {
            $this->dispositivoService->registrarDispositivo(
                $user->id,
                $fingerprint,
                $request->userAgent() ?? '',
                $request->ip()
            );
        }

        $user->update(['ultimo_acceso' => now()]);
        $this->auditoria->registrarIntento($user->email, true, '2fa_completado', $request);

        $token = $user->createToken('auth_token', ['*'], now()->addHours(8))->plainTextToken;
        $user->load('rol');

        return [
            'tipo_respuesta'        => 'login_exitoso',
            'token'                 => $token,
            'usuario'               => $user,
            'permisos'              => $user->getPermisos(),
            'debe_cambiar_password' => $user->debe_cambiar_password,
        ];
    }

    public function continuarSinCodigo(string $tokenTemporal, bool $confiarDispositivo, string $fingerprint, Request $request): array
    {
        $otp = CodigoOtp::where('token_temporal', $tokenTemporal)
            ->where('usado', false)
            ->where('expira_en', '>', now())
            ->first();

        if (!$otp) {
            throw new \Exception('Sesión inválida o expirada. Por favor inicia sesión nuevamente.');
        }

        $user = User::findOrFail($otp->usuario_id);
        $otp->update(['usado' => true]);

        if ($confiarDispositivo && $fingerprint) {
            $this->dispositivoService->registrarDispositivo(
                $user->id,
                $fingerprint,
                $request->userAgent() ?? '',
                $request->ip()
            );
        }

        $user->update(['ultimo_acceso' => now()]);
        $this->auditoria->registrarIntento($user->email, true, '2fa_completado', $request);

        $token = $user->createToken('auth_token', ['*'], now()->addHours(8))->plainTextToken;
        $user->load('rol');

        return [
            'tipo_respuesta'        => 'login_exitoso',
            'token'                 => $token,
            'usuario'               => $user,
            'permisos'              => $user->getPermisos(),
            'debe_cambiar_password' => $user->debe_cambiar_password,
        ];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();
    }

    private function crearSesionTotp(User $user, string $fingerprint, string $userAgent, string $ip): string
    {
        CodigoOtp::where('usuario_id', $user->id)
            ->where('fingerprint_dispositivo', $fingerprint)
            ->where('usado', false)
            ->update(['usado' => true]);

        $tokenTemporal = Str::uuid()->toString();

        CodigoOtp::create([
            'usuario_id'              => $user->id,
            'codigo'                  => Hash::make(Str::random(6)),
            'tipo'                    => 'nuevo_dispositivo',
            'token_temporal'          => $tokenTemporal,
            'fingerprint_dispositivo' => $fingerprint,
            'expira_en'               => now()->addMinutes(10),
            'usado'                   => false,
            'intentos_fallidos'       => 0,
        ]);

        return $tokenTemporal;
    }
}
