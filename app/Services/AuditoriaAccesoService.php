<?php

namespace App\Services;

use App\Models\IntentoAcceso;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AuditoriaAccesoService
{
    /**
     * Registra un intento de acceso
     */
    public function registrarIntento(string $email, bool $exitoso, ?string $motivoFallo, Request $request): void
    {
        $usuario = User::where('email', $email)->first();

        IntentoAcceso::create([
            'email' => $email,
            'usuario_id' => $usuario?->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'exitoso' => $exitoso,
            'motivo_fallo' => $motivoFallo,
            'fecha_intento' => now(),
            // 'pais' => null, // Opcional: implementar con paquete GeoIP
            // 'ciudad' => null, // Opcional: implementar con paquete GeoIP
        ]);
    }

    /**
     * Cuenta intentos fallidos recientes para un email
     */
    public function contarIntentosFallidosRecientes(string $email, int $minutos = 15): int
    {
        return IntentoAcceso::where('email', $email)
            ->where('exitoso', false)
            ->where('fecha_intento', '>=', now()->subMinutes($minutos))
            ->count();
    }

    /**
     * Cuenta intentos fallidos recientes para una IP
     */
    public function contarIntentosFallidosPorIp(string $ip, int $minutos = 15): int
    {
        return IntentoAcceso::where('ip_address', $ip)
            ->where('exitoso', false)
            ->where('fecha_intento', '>=', now()->subMinutes($minutos))
            ->count();
    }

    /**
     * Limpia intentos de acceso antiguos
     */
    public function limpiarIntentosAntiguos(int $dias = 90): int
    {
        return IntentoAcceso::where('fecha_intento', '<', now()->subDays($dias))->delete();
    }
}
