<?php

namespace App\Services;

use App\Models\NotificacionSistema;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class NotificacionService
{
    /**
     * Envía una notificación a un usuario específico
     */
    public function enviarA(int $usuarioId, array $data): NotificacionSistema
    {
        return NotificacionSistema::create(array_merge($data, [
            'usuario_id' => $usuarioId,
            'leida' => false
        ]));
    }

    /**
     * Envía una notificación a todos los usuarios activos
     * Retorna el número de notificaciones creadas
     */
    public function enviarATodos(array $data): int
    {
        $usuarios = User::where('estado', 'activo')->pluck('id');
        $notificaciones = [];
        $now = now();

        foreach ($usuarios as $id) {
            $notificaciones[] = array_merge($data, [
                'usuario_id' => $id,
                'leida' => false,
                'created_at' => $now,
                'updated_at' => $now
            ]);
        }

        NotificacionSistema::insert($notificaciones);
        return count($notificaciones);
    }

    /**
     * Envía notificación a todos los usuarios con un rol específico
     */
    public function enviarARol(string $rol, array $data): int
    {
        $usuarios = User::whereHas('rol', function ($query) use ($rol) {
            $query->where('nombre', $rol);
        })->where('estado', 'activo')->pluck('id');

        $notificaciones = [];
        $now = now();

        foreach ($usuarios as $id) {
            $notificaciones[] = array_merge($data, [
                'usuario_id' => $id,
                'leida' => false,
                'created_at' => $now,
                'updated_at' => $now
            ]);
        }

        NotificacionSistema::insert($notificaciones);
        return count($notificaciones);
    }

    /**
     * Alias semántico: envía notificación a todos los usuarios de un rol.
     * Params: rol, titulo, mensaje, tipo (info|success|warning|error|security)
     */
    public function notificarAUsuariosConRol(string $rol, string $titulo, string $mensaje, string $tipo = 'info'): int
    {
        return $this->enviarARol($rol, [
            'tipo'    => $tipo,
            'titulo'  => $titulo,
            'mensaje' => $mensaje,
        ]);
    }

    /**
     * Envía una notificación al gerente con URL de acción opcional.
     */
    public function enviarAGerente(string $titulo, string $mensaje, string $tipo = 'info', ?string $urlAccion = null): int
    {
        $data = ['tipo' => $tipo, 'titulo' => $titulo, 'mensaje' => $mensaje];
        if ($urlAccion) {
            $data['url_accion'] = $urlAccion;
        }
        return $this->enviarARol('gerente', $data);
    }

    /**
     * Marca una notificación como leída verificando que pertenezca al usuario
     */
    public function marcarComoLeida(int $id, int $usuarioId): bool
    {
        $notificacion = NotificacionSistema::where('id', $id)
            ->where('usuario_id', $usuarioId)
            ->first();

        if ($notificacion && !$notificacion->leida) {
            $notificacion->update([
                'leida' => true,
                'leida_en' => now()
            ]);
            return true;
        }

        return false;
    }

    /**
     * Marca todas las notificaciones del usuario como leídas
     */
    public function marcarTodasComoLeidas(int $usuarioId): int
    {
        return NotificacionSistema::where('usuario_id', $usuarioId)
            ->noLeidas()
            ->update([
                'leida' => true,
                'leida_en' => now()
            ]);
    }

    /**
     * Obtiene las notificaciones no leídas más recientes
     */
    public function obtenerNoLeidas(int $usuarioId, int $limit = 10): Collection
    {
        return NotificacionSistema::where('usuario_id', $usuarioId)
            ->noLeidas()
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Obtiene historial paginado
     */
    public function obtenerTodas(int $usuarioId, int $perPage = 20): LengthAwarePaginator
    {
        return NotificacionSistema::where('usuario_id', $usuarioId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Cuenta el número de notificaciones no leídas
     */
    public function contarNoLeidas(int $usuarioId): int
    {
        return NotificacionSistema::where('usuario_id', $usuarioId)->noLeidas()->count();
    }
}
