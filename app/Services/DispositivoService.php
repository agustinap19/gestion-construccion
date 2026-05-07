<?php

namespace App\Services;

use App\Models\DispositivoConfiable;
use Illuminate\Support\Collection;

class DispositivoService
{
    /**
     * Verifica si el dispositivo es confiable para el usuario.
     */
    public function esDispositivoConfiable(int $usuarioId, string $fingerprint): bool
    {
        return DispositivoConfiable::where('usuario_id', $usuarioId)
            ->where('fingerprint', $fingerprint)
            ->where('activo', true)
            ->exists();
    }

    /**
     * Registra un nuevo dispositivo confiable.
     */
    public function registrarDispositivo(int $usuarioId, string $fingerprint, string $userAgent, string $ip, string $nombreDispositivo = null): DispositivoConfiable
    {
        if (!$nombreDispositivo) {
            $nombreDispositivo = $this->parsearNombreDispositivo($userAgent);
        }

        return DispositivoConfiable::updateOrCreate(
            ['usuario_id' => $usuarioId, 'fingerprint' => $fingerprint],
            [
                'nombre_dispositivo' => $nombreDispositivo,
                'user_agent' => $userAgent,
                'ip_registro' => $ip,
                'fecha_registro' => now(),
                'ultimo_uso' => now(),
                'activo' => true,
            ]
        );
    }

    /**
     * Actualiza la fecha de último uso.
     */
    public function actualizarUltimoUso(DispositivoConfiable $dispositivo): void
    {
        $dispositivo->update(['ultimo_uso' => now()]);
    }

    /**
     * Extrae un nombre legible del User Agent.
     */
    public function parsearNombreDispositivo(string $userAgent): string
    {
        $browser = 'Navegador Desconocido';
        $os = 'SO Desconocido';

        if (preg_match('/(?:MSIE |Trident\/.*; rv:)(\d+)/i', $userAgent)) {
            $browser = 'Internet Explorer';
        } elseif (preg_match('/Edg\//i', $userAgent)) {
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

        if (preg_match('/Windows NT 10.0/i', $userAgent)) {
            $os = 'Windows 10/11';
        } elseif (preg_match('/Windows NT 6.3/i', $userAgent)) {
            $os = 'Windows 8.1';
        } elseif (preg_match('/Windows NT 6.2/i', $userAgent)) {
            $os = 'Windows 8';
        } elseif (preg_match('/Windows NT 6.1/i', $userAgent)) {
            $os = 'Windows 7';
        } elseif (preg_match('/Mac OS X/i', $userAgent)) {
            $os = 'Mac OS';
        } elseif (preg_match('/Linux/i', $userAgent)) {
            $os = 'Linux';
        } elseif (preg_match('/Android/i', $userAgent)) {
            $os = 'Android';
        } elseif (preg_match('/iPhone/i', $userAgent) || preg_match('/iPad/i', $userAgent)) {
            $os = 'iOS';
        }

        return "$browser en $os";
    }

    /**
     * Lista todos los dispositivos confiables de un usuario.
     */
    public function listarDispositivosUsuario(int $usuarioId): Collection
    {
        return DispositivoConfiable::where('usuario_id', $usuarioId)->get();
    }

    /**
     * Revoca el acceso de un dispositivo confiable.
     */
    public function revocarDispositivo(int $dispositivoId, int $usuarioId): void
    {
        DispositivoConfiable::where('id', $dispositivoId)
            ->where('usuario_id', $usuarioId)
            ->update(['activo' => false]);
    }
}
