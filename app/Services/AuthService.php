<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function __construct(
        protected AuditoriaAccesoService $auditoria,
        protected DispositivoService $dispositivoService,
        protected OtpService $otpService
    ) {}

    public function intentarLogin(array $credenciales, Request $request): array
    {
        $email       = $credenciales['email'];
        $fingerprint = $credenciales['fingerprint'];

        // Rate limit por IP (10 intentos fallidos en 15 min)
        if ($this->auditoria->contarIntentosFallidosPorIp($request->ip()) >= 10) {
            $this->auditoria->registrarIntento($email, false, 'rate_limit_ip', $request);
            throw new \Exception('Demasiados intentos fallidos. Intenta nuevamente mas tarde.');
        }

        $user = User::where('email', $email)->first();

        // Anti-enumeracion: siempre ejecutar hash check aunque el usuario no exista
        $passwordCorrecta = $user
            ? Hash::check($credenciales['password'], $user->password)
            : (bool) Hash::check('dummy', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

        // Usuario no existe -> mismo mensaje que credenciales incorrectas
        if (!$user) {
            $this->auditoria->registrarIntento($email, false, 'email_inexistente', $request);
            throw new \Exception('Correo o contrasena incorrectos.');
        }

        // Cuenta suspendida
        if ($user->estado === 'suspendido') {
            $this->auditoria->registrarIntento($email, false, 'cuenta_suspendida', $request);
            throw new \Exception('Tu cuenta ha sido bloqueada por seguridad tras 3 intentos fallidos. Comunicate con el soporte tecnico de la empresa para reactivar tu cuenta.');
        }

        // Cuenta inactiva
        if ($user->estado === 'inactivo') {
            $this->auditoria->registrarIntento($email, false, 'cuenta_inactiva', $request);
            throw new \Exception('Cuenta inactiva, comunicate con soporte tecnico.');
        }

        // Password incorrecto
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

        // Credenciales validas: resetear contador
        $user->update([
            'intentos_fallidos' => 0,
            'ultimo_acceso'     => now(),
        ]);

        // Si debe cambiar contrasena: emitir token directamente (el frontend mostrara el modal)
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

        // Verificar dispositivo confiable
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

        // 2FA temporalmente deshabilitado — restaurar el bloque comentado para reactivar
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

        /*
        // Dispositivo nuevo -> enviar OTP (reactivar eliminando este bloque comentado y el bloque de arriba)
        $tokenTemporal = $this->otpService->generarYEnviar(
            $user,
            $fingerprint,
            $request->userAgent() ?? '',
            $request->ip()
        );

        $this->auditoria->registrarIntento($email, true, 'pendiente_otp', $request);

        $partes = explode('@', $user->email);
        $emailMascarado = substr($partes[0], 0, 2) . '***@' . $partes[1];

        return [
            'tipo_respuesta' => 'requiere_2fa',
            'token_temporal' => $tokenTemporal,
            'email_destino'  => $emailMascarado,
        ];
        */
    }

    public function verificarOtp(string $tokenTemporal, string $codigo, bool $confiarDispositivo, string $fingerprint, Request $request): array
    {
        $otp = $this->otpService->validar($tokenTemporal, $codigo);

        $user = User::findOrFail($otp->usuario_id);

        if ($confiarDispositivo) {
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
}
