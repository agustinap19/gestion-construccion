<?php

namespace App\Services;

use App\Models\IntentoAcceso;
use Illuminate\Http\Request;

class AuditoriaAccesoService
{
    public function registrarIntento(string $email, bool $exitoso, ?string $motivo, Request $request): void
    {
        IntentoAcceso::create([
            'email' => $email,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'exitoso' => $exitoso,
            'motivo' => $motivo,
            'created_at' => now(),
        ]);
    }

    public function contarIntentosFallidosRecientes(string $email, int $minutos = 15): int
    {
        return IntentoAcceso::where('email', $email)
            ->where('exitoso', false)
            ->where('created_at', '>=', now()->subMinutes($minutos))
            ->count();
    }

    public function contarIntentosFallidosPorIp(string $ip, int $minutos = 15): int
    {
        return IntentoAcceso::where('ip_address', $ip)
            ->where('exitoso', false)
            ->where('created_at', '>=', now()->subMinutes($minutos))
            ->count();
    }

    public function limpiarIntentosAntiguos(int $dias = 90): int
    {
        return IntentoAcceso::where('created_at', '<', now()->subDays($dias))->delete();
    }
}
