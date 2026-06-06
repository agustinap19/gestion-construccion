<?php

namespace App\Services;

use App\Models\DispositivoConfiable;
use Illuminate\Support\Collection;

class DispositivoService
{
    private const DIAS_CONFIANZA = 30;

    public function esDispositivoConfiable(int $usuarioId, string $fingerprint): bool
    {
        return DispositivoConfiable::where('usuario_id', $usuarioId)
            ->where('fingerprint', $fingerprint)
            ->where('activo', true)
            ->where('ultimo_uso', '>=', now()->subDays(self::DIAS_CONFIANZA))
            ->exists();
    }

    public function registrarDispositivo(int $usuarioId, string $fingerprint, string $userAgent, string $ip): DispositivoConfiable
    {
        $nombre = $this->parsearNombreDispositivo($userAgent);

        return DispositivoConfiable::updateOrCreate(
            ['usuario_id' => $usuarioId, 'fingerprint' => $fingerprint],
            [
                'nombre_dispositivo' => $nombre,
                'ip_registro' => $ip,
                'ultimo_uso' => now(),
                'activo' => true,
            ]
        );
    }

    public function actualizarUltimoUso(int $usuarioId, string $fingerprint): void
    {
        DispositivoConfiable::where('usuario_id', $usuarioId)
            ->where('fingerprint', $fingerprint)
            ->update(['ultimo_uso' => now()]);
    }

    public function revocarDispositivo(int $dispositivoId, int $usuarioId): void
    {
        DispositivoConfiable::where('id', $dispositivoId)
            ->where('usuario_id', $usuarioId)
            ->update(['activo' => false]);
    }

    public function revocarTodos(int $usuarioId): void
    {
        DispositivoConfiable::where('usuario_id', $usuarioId)->update(['activo' => false]);
    }

    public function listarDispositivosUsuario(int $usuarioId): Collection
    {
        return DispositivoConfiable::where('usuario_id', $usuarioId)
            ->where('activo', true)
            ->orderByDesc('ultimo_uso')
            ->get();
    }

    public function parsearNombreDispositivo(string $userAgent): string
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
