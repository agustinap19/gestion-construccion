<?php

namespace App\Services\Activos;

use App\Models\Activo;
use App\Models\AsignacionActivo;
use App\Models\Proyecto;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Exception;

class AsignacionActivoService
{
    public const ESTADOS_PROYECTO_ACTIVO = ['adjudicado', 'en_ejecucion'];

    public const TRANSICIONES_PERMITIDAS = [
        'planificada' => ['activa', 'cancelada'],
        'activa'      => ['completada', 'cancelada'],
        'completada'  => [],
        'cancelada'   => [],
    ];

    public function listarConFiltros(array $filtros, int $perPage = 20): LengthAwarePaginator
    {
        $query = AsignacionActivo::with([
            'activo:id,nombre,codigo',
            'proyecto:id,nombre,codigo,categoria',
            'vivienda:id,codigo,beneficiario_id',
            'vivienda.beneficiario:id,nombre,apellido_paterno,apellido_materno',
            'creadoPor:id,nombre,apellido_paterno',
            'actasEntrega' => fn ($q) => $q->latest(),
        ]);

        if (!empty($filtros['activo_id'])) {
            $query->where('activo_id', $filtros['activo_id']);
        }
        if (!empty($filtros['proyecto_id'])) {
            $query->where('proyecto_id', $filtros['proyecto_id']);
        }
        if (!empty($filtros['estado'])) {
            $query->where('estado', $filtros['estado']);
        }
        if (!empty($filtros['tipo'])) {
            $categoria = $filtros['tipo'] === 'social' ? 'social' : 'privado';
            $query->whereHas('proyecto', fn ($q) => $q->where('categoria', $categoria));
        }

        return $query
            ->orderByRaw("FIELD(estado, 'activa', 'planificada', 'completada', 'cancelada')")
            ->latest('fecha_inicio')
            ->paginate($perPage);
    }

    public function verificarDisponibilidad(int $activoId, string $desde, string $hasta, ?int $excluirAsignacionId = null): array
    {
        $conflicto = $this->buscarConflicto($activoId, $desde, $hasta, $excluirAsignacionId);

        return [
            'disponible' => !$conflicto,
            'conflicto'  => $conflicto ? [
                'asignacion_id'      => $conflicto->id,
                'proyecto'           => $conflicto->proyecto?->nombre,
                'fecha_inicio'       => $conflicto->fecha_inicio,
                'fecha_fin_estimada' => $conflicto->fecha_fin_estimada,
            ] : null,
        ];
    }

    private function buscarConflicto(int $activoId, string $desde, string $hasta, ?int $excluirAsignacionId = null)
    {
        $query = AsignacionActivo::with('proyecto:id,nombre')
            ->where('activo_id', $activoId)
            ->whereNotIn('estado', ['cancelada', 'completada'])
            ->where(function ($q) use ($desde, $hasta) {
                $q->whereBetween('fecha_inicio', [$desde, $hasta])
                  ->orWhereBetween('fecha_fin_estimada', [$desde, $hasta])
                  ->orWhere(function ($q2) use ($desde, $hasta) {
                      $q2->where('fecha_inicio', '<=', $desde)
                         ->where('fecha_fin_estimada', '>=', $hasta);
                  });
            });

        if ($excluirAsignacionId) {
            $query->where('id', '!=', $excluirAsignacionId);
        }

        return $query->first();
    }

    public function crear(int $activoId, array $datos, int $userId): array
    {
        $activo = Activo::findOrFail($activoId);

        if ($activo->estado !== 'disponible') {
            throw ValidationException::withMessages([
                'activo' => "El activo {$activo->nombre} no está disponible (estado: {$activo->estado})",
            ]);
        }

        if ($this->buscarConflicto($activoId, $datos['fecha_inicio'], $datos['fecha_fin_estimada'])) {
            throw ValidationException::withMessages([
                'fechas' => 'El activo tiene una asignación que se superpone con esas fechas.',
            ]);
        }

        $proyecto = Proyecto::findOrFail($datos['proyecto_id']);

        if (!in_array($proyecto->estado, self::ESTADOS_PROYECTO_ACTIVO, true)) {
            throw ValidationException::withMessages([
                'proyecto' => 'El proyecto no está en estado activo.',
            ]);
        }

        $warnings = [];
        $umbral = (float) $activo->horas_mantenimiento_cada * 0.90;
        if ($umbral > 0 && (float) $activo->horas_uso_acumuladas >= $umbral) {
            $warnings[] = 'Este activo necesita mantenimiento pronto.';

            if (empty($datos['forzar_pese_a_advertencia'])) {
                throw ValidationException::withMessages([
                    'advertencia' => 'Este activo necesita mantenimiento pronto. Confirme para asignar de todas formas.',
                ]);
            }
        }

        return DB::transaction(function () use ($activo, $proyecto, $datos, $userId, $warnings) {
            $esSocial = $proyecto->categoria === 'social';

            $asignacion = AsignacionActivo::create([
                'activo_id'               => $activo->id,
                'proyecto_id'             => $proyecto->id,
                'vivienda_id'             => $datos['vivienda_id'] ?? null,
                'fecha_inicio'            => $datos['fecha_inicio'],
                'fecha_fin_estimada'      => $datos['fecha_fin_estimada'],
                'horas_dia_estimadas'     => $datos['horas_dia_estimadas'] ?? 8,
                'notas'                   => $datos['notas'] ?? null,
                'estado'                  => $esSocial ? 'planificada' : 'activa',
                'created_by'              => $userId,
            ]);

            return ['asignacion' => $asignacion->fresh(['activo', 'proyecto', 'vivienda']), 'warnings' => $warnings];
        });
    }

    public function actualizar(int $id, array $datos): AsignacionActivo
    {
        $asignacion = AsignacionActivo::findOrFail($id);

        if (isset($datos['fecha_inicio']) || isset($datos['fecha_fin_estimada'])) {
            $desde = $datos['fecha_inicio'] ?? $asignacion->fecha_inicio->format('Y-m-d');
            $hasta = $datos['fecha_fin_estimada'] ?? $asignacion->fecha_fin_estimada->format('Y-m-d');

            if ($this->buscarConflicto($asignacion->activo_id, $desde, $hasta, $asignacion->id)) {
                throw ValidationException::withMessages([
                    'fechas' => 'El activo tiene una asignación que se superpone con esas fechas.',
                ]);
            }
        }

        $asignacion->update($datos);
        return $asignacion->fresh(['activo', 'proyecto', 'vivienda']);
    }

    public function cambiarEstado(int $id, string $nuevoEstado, array $extra = []): AsignacionActivo
    {
        $asignacion = AsignacionActivo::findOrFail($id);

        if (!in_array($nuevoEstado, self::TRANSICIONES_PERMITIDAS[$asignacion->estado] ?? [], true)) {
            throw new Exception("No se puede pasar de '{$asignacion->estado}' a '{$nuevoEstado}'.");
        }

        $asignacion->fill($extra);
        $asignacion->estado = $nuevoEstado;
        $asignacion->save();

        return $asignacion->fresh(['activo', 'proyecto', 'vivienda']);
    }

    public function eliminar(int $id): void
    {
        $asignacion = AsignacionActivo::findOrFail($id);

        if (in_array($asignacion->estado, ['activa', 'planificada'], true)) {
            throw new Exception('No se puede eliminar una asignación activa o planificada; cámbiela a cancelada primero.');
        }

        $asignacion->delete();
    }
}
