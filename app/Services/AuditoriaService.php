<?php

namespace App\Services;

use App\Models\Auditoria;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;

class AuditoriaService
{
    /**
     * Registra un evento de auditoría.
     *
     * @param string $evento Tipo de evento (ej: "rol.creado")
     * @param string $tablaAfectada Tabla que fue modificada
     * @param int|null $registroId ID del registro afectado
     * @param array $datos Datos adicionales: usuario_objetivo_id, datos_anteriores, datos_nuevos, razon
     * @return Auditoria
     */
    public function registrar(string $evento, string $tablaAfectada, ?int $registroId, array $datos = []): Auditoria
    {
        return Auditoria::create([
            'usuario_actor_id' => Auth::id(),
            'usuario_objetivo_id' => $datos['usuario_objetivo_id'] ?? null,
            'evento' => $evento,
            'tabla_afectada' => $tablaAfectada,
            'registro_id' => $registroId,
            'datos_anteriores' => $datos['datos_anteriores'] ?? null,
            'datos_nuevos' => $datos['datos_nuevos'] ?? null,
            'razon' => $datos['razon'] ?? null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Obtiene el histórico de cambios para un registro específico de una tabla.
     *
     * @param string $tabla Nombre de la tabla
     * @param int $registroId ID del registro
     * @return Collection
     */
    public function obtenerPorTabla(string $tabla, int $registroId): Collection
    {
        return Auditoria::with('actor:id,nombre,apellido_paterno,foto_url')
            ->where('tabla_afectada', $tabla)
            ->where('registro_id', $registroId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Obtiene los eventos realizados por un usuario específico (paginado).
     *
     * @param int $usuarioId ID del usuario actor
     * @param int $perPage Registros por página
     * @return LengthAwarePaginator
     */
    public function obtenerPorActor(int $usuarioId, int $perPage = 20): LengthAwarePaginator
    {
        return Auditoria::with('actor:id,nombre,apellido_paterno,foto_url')
            ->where('usuario_actor_id', $usuarioId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }
}
