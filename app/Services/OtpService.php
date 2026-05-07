<?php

namespace App\Services;

use App\Mail\CodigoOtpMail;
use App\Models\CodigoOtp;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class OtpService
{
    /**
     * Genera un nuevo código OTP.
     */
    public function generarOtp(int $usuarioId, string $fingerprint): array
    {
        $codigo = (string) random_int(100000, 999999);
        $tokenTemporal = Str::uuid()->toString();

        CodigoOtp::create([
            'usuario_id' => $usuarioId,
            'codigo' => $codigo,
            'token_temporal' => $tokenTemporal,
            'fingerprint_dispositivo' => $fingerprint,
            'usado' => false,
            'expira_en' => now()->addMinutes(10),
        ]);

        return [
            'token_temporal' => $tokenTemporal,
            'codigo' => $codigo,
        ];
    }

    /**
     * Envía el código por correo.
     */
    public function enviarCodigoPorCorreo(User $usuario, string $codigo, string $nombreDispositivo, string $ip): void
    {
        Mail::to($usuario->email)->send(new CodigoOtpMail($codigo, $nombreDispositivo, $ip));
    }

    /**
     * Valida el OTP proporcionado por el usuario.
     */
    public function validarOtp(string $tokenTemporal, string $codigo): CodigoOtp
    {
        $otp = CodigoOtp::where('token_temporal', $tokenTemporal)->first();

        if (!$otp) {
            throw new Exception('Token temporal inválido.');
        }

        if ($otp->usado) {
            throw new Exception('Este código ya fue utilizado.');
        }

        if ($otp->expira_en->isPast()) {
            throw new Exception('El código ha expirado. Por favor solicita uno nuevo.');
        }

        if ($otp->codigo !== $codigo) {
            $otp->increment('intentos_fallidos');
            
            if ($otp->intentos_fallidos >= 3) {
                $otp->update(['usado' => true]);
                throw new Exception('Demasiados intentos fallidos. El código ha sido invalidado.');
            }

            throw new Exception('El código ingresado es incorrecto.');
        }

        $otp->update(['usado' => true]);

        return $otp;
    }

    /**
     * Elimina OTPs expirados.
     */
    public function limpiarOtpsExpirados(): int
    {
        return CodigoOtp::where('expira_en', '<', now()->subDay())->delete();
    }
}
