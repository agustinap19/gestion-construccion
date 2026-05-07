<?php

namespace App\Services;

use App\Models\User;
use App\Models\TokenRecuperacion;
use App\Models\DispositivoConfiable;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Mail\RecuperacionPasswordMail;
use App\Mail\PasswordCambiadaMail;
use App\Mail\SolicitudRecuperacionManualMail;
use Exception;

class RecuperacionPasswordService
{
    public function __construct(
        protected AuditoriaAccesoService $auditoriaService,
        protected RostroService $rostroService
    ) {}

    /**
     * Paso 1: Solicitar recuperación de contraseña (envío de email)
     */
    public function solicitarRecuperacion(string $email, Request $request): array
    {
        $user = User::where('email', $email)->first();

        // Anti-enumeración de usuarios: Si no existe, simulamos éxito
        if (!$user) {
            $this->auditoriaService->registrarIntento($email, false, 'recuperacion_email_inexistente', $request);
            return ['mensaje' => 'Si el correo está registrado en nuestro sistema, recibirás un enlace de recuperación en breve.'];
        }

        // Si está inactivo o suspendido, tampoco permitimos recuperar automáticamente
        if ($user->estado !== 'activo') {
            $this->auditoriaService->registrarIntento($email, false, 'recuperacion_usuario_' . $user->estado, $request);
            return ['mensaje' => 'Si el correo está registrado en nuestro sistema, recibirás un enlace de recuperación en breve.'];
        }

        // Invalidar tokens previos vigentes
        TokenRecuperacion::where('usuario_id', $user->id)->vigente()->update(['usado' => true, 'usado_en' => now()]);

        // Generar nuevo token
        $tokenStr = Str::random(60);
        
        $token = TokenRecuperacion::create([
            'usuario_id' => $user->id,
            'token' => $tokenStr,
            'email' => $user->email,
            'ip_solicitud' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'expira_en' => now()->addHour(),
        ]);

        // Generar URL para el frontend
        $frontendUrl = env('FRONTEND_URL', 'http://127.0.0.1:8000');
        $urlRecuperacion = "{$frontendUrl}/recuperar-password/verificar/{$tokenStr}";

        // Enviar correo
        Mail::to($user->email)->send(new RecuperacionPasswordMail(
            $user, 
            $urlRecuperacion, 
            $request->ip() ?? 'Desconocida', 
            $request->userAgent() ?? 'Desconocido'
        ));

        $this->auditoriaService->registrarIntento($email, true, 'recuperacion_password_solicitada', $request);

        return ['mensaje' => 'Si el correo está registrado en nuestro sistema, recibirás un enlace de recuperación en breve.'];
    }

    /**
     * Valida que un token exista, no esté usado y no haya expirado
     */
    public function validarToken(string $tokenStr): TokenRecuperacion
    {
        $token = TokenRecuperacion::where('token', $tokenStr)->with('usuario')->first();

        if (!$token || $token->usado || $token->estaExpirado()) {
            throw new Exception('El enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo.');
        }

        return $token;
    }

    /**
     * Paso 2: Verificar rostro biométrico durante el flujo de recuperación
     */
    public function verificarRostroRecuperacion(string $tokenStr, array $descriptorNuevo, Request $request): array
    {
        $token = $this->validarToken($tokenStr);
        $user = $token->usuario;

        // Si el usuario no tiene rostro registrado, debe ir a recuperación manual
        if (!$user->rostro_registrado) {
            $this->notificarAdminSolicitudManual($user);
            return [
                'rostro_disponible' => false, 
                'mensaje' => 'Tu cuenta no tiene biometría facial registrada. Hemos notificado al administrador para que te asista manualmente.'
            ];
        }

        // Comparar rostro
        $rostroCoincide = false;
        try {
            $rostroCoincide = $this->rostroService->verificarRostroUsuario($user->id, $descriptorNuevo);
        } catch (Exception $e) {
            // Manejar error interno del servicio de rostro (ej: formato inválido)
            throw new Exception('Error procesando la biometría facial.');
        }

        if (!$rostroCoincide) {
            $this->auditoriaService->registrarIntento($user->email, false, 'recuperacion_rostro_no_coincide', $request);
            
            // Lógica para prevenir ataques de fuerza bruta facial en la recuperación
            $intentosPrevios = \App\Models\IntentoAcceso::where('email', $user->email)
                ->where('motivo', 'recuperacion_rostro_no_coincide')
                ->where('created_at', '>=', $token->created_at)
                ->count();
                
            if ($intentosPrevios >= 3) {
                $token->update(['usado' => true, 'usado_en' => now()]);
                throw new Exception('Has excedido el número máximo de intentos biométricos fallidos. El enlace ha sido invalidado.');
            }

            throw new Exception('El rostro no coincide con el registrado en el sistema.');
        }

        // Éxito
        $token->update(['rostro_verificado' => true]);
        $this->auditoriaService->registrarIntento($user->email, true, 'recuperacion_rostro_verificado', $request);

        return [
            'rostro_disponible' => true,
            'verificado' => true
        ];
    }

    /**
     * Paso 3: Cambiar la contraseña después de verificar rostro
     */
    public function cambiarPasswordRecuperacion(string $tokenStr, string $nuevaPassword, Request $request): User
    {
        $token = $this->validarToken($tokenStr);
        
        if (!$token->rostro_verificado) {
            throw new Exception('Debes verificar tu identidad mediante reconocimiento facial antes de cambiar la contraseña.');
        }

        $user = $token->usuario;

        // Actualizar contraseña y resetear bloqueos
        $user->update([
            'password' => Hash::make($nuevaPassword),
            'intentos_fallidos' => 0,
            'bloqueado_hasta' => null,
            'debe_cambiar_password' => false
        ]);

        // Marcar token como consumido
        $token->update([
            'usado' => true,
            'usado_en' => now()
        ]);

        // INVALIDAR TODAS LAS SESIONES (Sanctum Tokens)
        $user->tokens()->delete();

        // INVALIDAR TODOS LOS DISPOSITIVOS CONFIABLES (Para forzar 2FA en el próximo login)
        DispositivoConfiable::where('usuario_id', $user->id)->update(['activo' => false]);

        // Enviar correo confirmando el cambio
        Mail::to($user->email)->send(new PasswordCambiadaMail(
            $user,
            $request->ip() ?? 'Desconocida',
            $request->userAgent() ?? 'Desconocido',
            now()->format('d/m/Y H:i:s')
        ));

        $this->auditoriaService->registrarIntento($user->email, true, 'recuperacion_password_exitosa', $request);

        return $user;
    }

    /**
     * Envía un correo a los gerentes cuando un usuario sin rostro pide recuperación
     */
    protected function notificarAdminSolicitudManual(User $usuario): void
    {
        // Encontrar usuarios con rol Gerente (id = 2) o Admin (id = 1)
        // Adaptar según cómo estén definidos los roles. Asumiendo Admin=1, Gerente=2.
        $admins = User::whereHas('rol', function ($query) {
            $query->whereIn('nombre', ['Administrador', 'Gerente']);
        })->where('estado', 'activo')->get();

        foreach ($admins as $admin) {
            Mail::to($admin->email)->send(new SolicitudRecuperacionManualMail($usuario));
        }
    }
}
