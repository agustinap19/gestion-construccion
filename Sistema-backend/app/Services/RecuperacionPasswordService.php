<?php

namespace App\Services;

use App\Mail\PasswordCambiadaMail;
use App\Mail\RecuperacionPasswordMail;
use App\Models\DispositivoConfiable;
use App\Models\TokenRecuperacion;
use App\Models\User;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class RecuperacionPasswordService
{
    public function solicitar(string $email, Request $request): array
    {
        $mensajeGenerico = 'Si el correo está registrado recibirás un enlace en breve.';

        $user = User::where('email', $email)->first();

        // Anti-enumeración y rate limit
        if (!$user || $user->estado !== 'activo') {
            return ['mensaje' => $mensajeGenerico];
        }

        // Rate limit: máx 3 tokens vigentes en 1 hora
        $solicitudesRecientes = TokenRecuperacion::where('usuario_id', $user->id)
            ->where('created_at', '>=', now()->subHour())
            ->count();

        if ($solicitudesRecientes >= 3) {
            return ['mensaje' => $mensajeGenerico];
        }

        // Invalidar tokens previos
        TokenRecuperacion::where('usuario_id', $user->id)->vigente()->update(['usado' => true]);

        $tokenStr = Str::random(60);

        TokenRecuperacion::create([
            'usuario_id' => $user->id,
            'token' => $tokenStr,
            'expira_en' => now()->addHour(),
        ]);

        $frontendUrl = rtrim(env('FRONTEND_URL', config('app.url')), '/');
        $urlRecuperacion = "{$frontendUrl}/recuperar-password?token={$tokenStr}&email=" . urlencode($user->email);

        Mail::to($user->email)->send(new RecuperacionPasswordMail(
            $user,
            $urlRecuperacion,
            $request->ip() ?? 'Desconocida',
            $request->userAgent() ?? 'Desconocido'
        ));

        return ['mensaje' => $mensajeGenerico];
    }

    public function validarToken(string $tokenStr): TokenRecuperacion
    {
        $token = TokenRecuperacion::where('token', $tokenStr)->with('usuario')->first();

        if (!$token || $token->usado || $token->estaExpirado()) {
            throw new Exception('El enlace de recuperación es inválido o ha expirado.');
        }

        return $token;
    }

    public function restablecer(string $tokenStr, string $nuevaPassword, Request $request): void
    {
        $token = $this->validarToken($tokenStr);
        $user = $token->usuario;

        $user->tokens()->delete();
        DispositivoConfiable::where('usuario_id', $user->id)->update(['activo' => false]);

        $user->update([
            'password' => Hash::make($nuevaPassword),
            'intentos_fallidos' => 0,
        ]);

        $token->update(['usado' => true]);

        Mail::to($user->email)->send(new PasswordCambiadaMail(
            $user,
            $request->ip() ?? 'Desconocida',
            $request->userAgent() ?? 'Desconocido',
            now()->format('d/m/Y H:i:s')
        ));
    }
}
