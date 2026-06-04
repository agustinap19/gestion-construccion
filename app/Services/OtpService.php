<?php

namespace App\Services;

use App\Mail\CodigoOtpMail;
use App\Models\CodigoOtp;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class OtpService
{
    public function generarYEnviar(User $usuario, string $fingerprint, string $userAgent, string $ip): string
    {
        // Invalidar OTPs previos del usuario para este fingerprint
        CodigoOtp::where('usuario_id', $usuario->id)
            ->where('fingerprint_dispositivo', $fingerprint)
            ->where('usado', false)
            ->update(['usado' => true]);

        $codigoPlano = (string) random_int(100000, 999999);
        $tokenTemporal = Str::uuid()->toString();

        CodigoOtp::create([
            'usuario_id' => $usuario->id,
            'codigo' => Hash::make($codigoPlano),
            'tipo' => 'nuevo_dispositivo',
            'token_temporal' => $tokenTemporal,
            'fingerprint_dispositivo' => $fingerprint,
            'expira_en' => now()->addMinutes(10),
            'usado' => false,
            'intentos_fallidos' => 0,
        ]);

        $nombreDispositivo = $this->parsearNombreDispositivo($userAgent);
        try {
            Mail::to($usuario->email)->send(new CodigoOtpMail($codigoPlano, $nombreDispositivo, $ip));
        } catch (\Exception $e) {
            \Log::warning('Email no enviado: ' . $e->getMessage());
        }

        return $tokenTemporal;
    }

    public function generarTokenTemporal(User $usuario, string $fingerprint): string
    {
        CodigoOtp::where('usuario_id', $usuario->id)
            ->where('fingerprint_dispositivo', $fingerprint)
            ->where('usado', false)
            ->update(['usado' => true]);

        $tokenTemporal = Str::uuid()->toString();

        CodigoOtp::create([
            'usuario_id'              => $usuario->id,
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

    public function validar(string $tokenTemporal, string $codigoIngresado): CodigoOtp
    {
        $otp = CodigoOtp::where('token_temporal', $tokenTemporal)->first();

        if (!$otp) {
            throw new Exception('Sesión de verificación inválida o expirada.');
        }

        if ($otp->usado) {
            throw new Exception('Este código ya fue utilizado.');
        }

        if ($otp->expira_en->isPast()) {
            throw new Exception('El código ha expirado. Por favor solicita uno nuevo.');
        }

        if ($otp->intentos_fallidos >= 5) {
            $otp->update(['usado' => true]);
            throw new Exception('Demasiados intentos fallidos. Por favor solicita un nuevo código.');
        }

        if (!Hash::check($codigoIngresado, $otp->codigo)) {
            $otp->increment('intentos_fallidos');
            $restantes = 5 - ($otp->intentos_fallidos);
            throw new Exception("Código incorrecto. Te quedan {$restantes} intentos.");
        }

        $otp->update(['usado' => true]);
        return $otp;
    }

    public function purgarExpirados(): int
    {
        return CodigoOtp::where('expira_en', '<', now()->subHour())->delete();
    }

    private function parsearNombreDispositivo(string $userAgent): string
    {
        $browser = 'Navegador Desconocido';
        $os = 'SO Desconocido';

        if (preg_match('/Edg\//i', $userAgent)) {
            $browser = 'Edge';
        } elseif (preg_match('/Firefox\//i', $userAgent)) {
            $browser = 'Firefox';
        } elseif (preg_match('/OPR\//i', $userAgent) || preg_match('/Opera\//i', $userAgent)) {
            $browser = 'Opera';
        } elseif (preg_match('/Chrome\//i', $userAgent)) {
            $browser = 'Chrome';
        } elseif (preg_match('/Safari\//i', $userAgent)) {
            $browser = 'Safari';
        }

        if (preg_match('/Windows NT 10/i', $userAgent)) {
            $os = 'Windows 10/11';
        } elseif (preg_match('/Mac OS X/i', $userAgent)) {
            $os = 'Mac OS';
        } elseif (preg_match('/Linux/i', $userAgent)) {
            $os = 'Linux';
        } elseif (preg_match('/Android/i', $userAgent)) {
            $os = 'Android';
        } elseif (preg_match('/iPhone|iPad/i', $userAgent)) {
            $os = 'iOS';
        }

        return "{$browser} en {$os}";
    }
}
