<?php

namespace App\Services;

use App\Exceptions\Auth\CredencialesInvalidasException;
use App\Exceptions\Auth\CuentaBloqueadaException;
use App\Exceptions\Auth\DemasiadosIntentosException;
use App\Exceptions\Auth\UsuarioInactivoException;
use App\Models\User;
use App\Models\CodigoOtp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Exception;

class AuthService
{
    public function __construct(
        protected AuditoriaAccesoService $auditoriaService,
        protected DispositivoService $dispositivoService,
        protected OtpService $otpService,
        protected RostroService $rostroService
    ) {}

    /**
     * Authenticate user with rate limiting and security checks.
     */
    public function login(array $credentials, Request $request): array
    {
        // a) Verificar rate limiting por IP
        if ($this->auditoriaService->contarIntentosFallidosPorIp($request->ip()) >= 10) {
            $this->auditoriaService->registrarIntento($credentials['email'], false, 'rate_limit_ip_excedido', $request);
            throw new DemasiadosIntentosException();
        }

        // b) Verificar rate limiting por email
        if ($this->auditoriaService->contarIntentosFallidosRecientes($credentials['email']) >= 5) {
            $this->auditoriaService->registrarIntento($credentials['email'], false, 'rate_limit_email_excedido', $request);
            throw new DemasiadosIntentosException();
        }

        $user = User::where('email', $credentials['email'])->first();

        // c) Buscar usuario por email
        if (!$user) {
            $this->auditoriaService->registrarIntento($credentials['email'], false, 'email_inexistente', $request);
            Hash::check('dummy', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
            throw new CredencialesInvalidasException();
        }

        // d) Verificar si está bloqueado temporalmente
        if ($user->bloqueado_hasta && $user->bloqueado_hasta->isFuture()) {
            $this->auditoriaService->registrarIntento($credentials['email'], false, 'cuenta_bloqueada_temporal', $request);
            $minutosRestantes = (int) ceil(now()->diffInMinutes($user->bloqueado_hasta));
            if ($minutosRestantes < 1) $minutosRestantes = 1;
            throw new CuentaBloqueadaException($minutosRestantes);
        }

        // e) Verificar estado
        if ($user->estado !== 'activo') {
            $this->auditoriaService->registrarIntento($credentials['email'], false, 'usuario_' . $user->estado, $request);
            throw new UsuarioInactivoException();
        }

        // f) Verificar password
        if (!Hash::check($credentials['password'], $user->password)) {
            $user->increment('intentos_fallidos');
            
            if ($user->intentos_fallidos == 5) {
                $user->update(['bloqueado_hasta' => now()->addMinutes(15)]);
                $this->auditoriaService->registrarIntento($credentials['email'], false, 'password_incorrecto_bloqueo_temporal', $request);
            } elseif ($user->intentos_fallidos >= 10) {
                $user->update(['estado' => 'suspendido']);
                $this->auditoriaService->registrarIntento($credentials['email'], false, 'password_incorrecto_suspension', $request);
            } else {
                $this->auditoriaService->registrarIntento($credentials['email'], false, 'password_incorrecto', $request);
            }
            
            throw new CredencialesInvalidasException();
        }

        // g) Password correcto
        $fingerprint = $credentials['fingerprint'];
        
        // h) Verificar si es el primer login (no tiene rostro registrado aún)
        if ($user->debe_cambiar_password || !$user->rostro_registrado) {
            // Como es su primer acceso, confiamos en este dispositivo inicial
            if (!$this->dispositivoService->esDispositivoConfiable($user->id, $fingerprint)) {
                $this->dispositivoService->registrarDispositivo(
                    $user->id, 
                    $fingerprint, 
                    $request->userAgent() ?? '', 
                    $request->ip()
                );
            }

            $user->update([
                'intentos_fallidos' => 0,
                'bloqueado_hasta' => null,
                'ultimo_acceso' => now()
            ]);

            $this->auditoriaService->registrarIntento($credentials['email'], true, 'primer_login', $request);

            $token = $user->createToken('auth_token')->plainTextToken;
            $user->load('rol');

            return [
                'tipo_respuesta' => 'login_exitoso',
                'token' => $token,
                'usuario' => $user,
                'permisos' => $user->getPermisos(),
            ];
        }
        
        // i) Verificar si es dispositivo confiable
        if ($this->dispositivoService->esDispositivoConfiable($user->id, $fingerprint)) {
            // Flujo normal: actualizar último uso y retornar token
            $dispositivo = \App\Models\DispositivoConfiable::where('usuario_id', $user->id)
                ->where('fingerprint', $fingerprint)->first();
            $this->dispositivoService->actualizarUltimoUso($dispositivo);

            $user->update([
                'intentos_fallidos' => 0,
                'bloqueado_hasta' => null,
                'ultimo_acceso' => now()
            ]);

            $this->auditoriaService->registrarIntento($credentials['email'], true, null, $request);

            $token = $user->createToken('auth_token')->plainTextToken;
            $user->load('rol');

            return [
                'tipo_respuesta' => 'login_exitoso',
                'token' => $token,
                'usuario' => $user,
                'permisos' => $user->getPermisos(),
            ];
        } else {
            // Flujo 2FA: dispositivo nuevo
            $otpData = $this->otpService->generarOtp($user->id, $fingerprint);
            $nombreDispositivo = $this->dispositivoService->parsearNombreDispositivo($request->userAgent() ?? '');
            
            $this->otpService->enviarCodigoPorCorreo($user, $otpData['codigo'], $nombreDispositivo, $request->ip());
            
            $this->auditoriaService->registrarIntento($credentials['email'], true, 'pendiente_2fa', $request);

            // Enmascarar email
            $emailParts = explode('@', $user->email);
            $maskedEmail = substr($emailParts[0], 0, 1) . '***@' . $emailParts[1];

            return [
                'tipo_respuesta' => 'requiere_2fa',
                'token_temporal' => $otpData['token_temporal'],
                'email_destino' => $maskedEmail,
                'mensaje' => 'Se envió un código de verificación a tu correo',
            ];
        }
    }

    /**
     * Verificar código OTP para 2FA
     */
    public function verificarOtp(string $tokenTemporal, string $codigo, Request $request): array
    {
        $otp = $this->otpService->validarOtp($tokenTemporal, $codigo);
        
        return [
            'tipo_respuesta' => 'requiere_rostro',
            'token_temporal' => $tokenTemporal,
            'mensaje' => 'Código verificado. Verifica tu rostro.',
        ];
    }

    /**
     * Verificar rostro para 2FA
     */
    public function verificarRostro2FA(string $tokenTemporal, array $descriptorFacial, Request $request): array
    {
        // Buscar el OTP (debe estar usado = true)
        $otp = CodigoOtp::where('token_temporal', $tokenTemporal)->where('usado', true)->first();
        
        if (!$otp) {
            throw new Exception('Sesión de verificación inválida o expirada.');
        }

        $user = User::find($otp->usuario_id);
        
        if (!$user) {
            throw new Exception('Usuario no encontrado.');
        }

        try {
            $rostroCoincide = $this->rostroService->verificarRostroUsuario($user->id, $descriptorFacial);
            
            if (!$rostroCoincide) {
                $this->auditoriaService->registrarIntento($user->email, false, 'rostro_no_coincide_2fa', $request);
                throw new Exception('El rostro no coincide con el registrado.');
            }
        } catch (Exception $e) {
            $this->auditoriaService->registrarIntento($user->email, false, 'rostro_error_2fa', $request);
            throw new Exception($e->getMessage());
        }

        // Rostro validado -> Registrar dispositivo como confiable
        $this->dispositivoService->registrarDispositivo(
            $user->id, 
            $otp->fingerprint_dispositivo, 
            $request->userAgent() ?? '', 
            $request->ip()
        );

        // Completar login
        $user->update([
            'intentos_fallidos' => 0,
            'bloqueado_hasta' => null,
            'ultimo_acceso' => now()
        ]);

        $this->auditoriaService->registrarIntento($user->email, true, '2fa_completado', $request);

        $token = $user->createToken('auth_token')->plainTextToken;
        $user->load('rol');

        return [
            'tipo_respuesta' => 'login_exitoso',
            'token' => $token,
            'usuario' => $user,
            'permisos' => $user->getPermisos(),
        ];
    }

    /**
     * Logout user by revoking their current token.
     */
    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();
    }
}
