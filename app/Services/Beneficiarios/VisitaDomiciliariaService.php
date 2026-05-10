<?php

namespace App\Services\Beneficiarios;

use App\Models\VisitaDomiciliaria;
use App\Models\Proyecto;
use App\Services\AuditoriaService;
use App\Exceptions\Beneficiarios\ProyectoNoSocialException;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;

class VisitaDomiciliariaService
{
    protected AuditoriaService $auditoria;

    public function __construct(AuditoriaService $auditoria)
    {
        $this->auditoria = $auditoria;
    }

    public function listarConFiltros(array $filtros, int $perPage = 20): LengthAwarePaginator
    {
        $query = VisitaDomiciliaria::with(['proyecto', 'beneficiario', 'visitador']);

        if (!empty($filtros['proyecto_id'])) {
            $query->delProyecto($filtros['proyecto_id']);
        }

        if (!empty($filtros['beneficiario_id'])) {
            $query->delBeneficiario($filtros['beneficiario_id']);
        }

        if (!empty($filtros['personal_id'])) {
            $query->where('personal_id', $filtros['personal_id']);
        }

        if (!empty($filtros['tipo_visita'])) {
            $query->where('tipo_visita', $filtros['tipo_visita']);
        }

        if (!empty($filtros['resultado'])) {
            $query->where('resultado', $filtros['resultado']);
        }

        if (!empty($filtros['fecha_desde'])) {
            $query->whereDate('fecha_visita', '>=', $filtros['fecha_desde']);
        }

        if (!empty($filtros['fecha_hasta'])) {
            $query->whereDate('fecha_visita', '<=', $filtros['fecha_hasta']);
        }

        if (isset($filtros['con_gasto_transporte']) && $filtros['con_gasto_transporte']) {
            $query->where('gasto_transporte', '>', 0);
        }

        $query->orderBy('fecha_visita', 'desc')->orderBy('hora_visita', 'desc');

        return $query->paginate($perPage);
    }

    public function crear(array $datos, int $actorId): VisitaDomiciliaria
    {
        return DB::transaction(function () use ($datos, $actorId) {
            $proyecto = Proyecto::findOrFail($datos['proyecto_id']);

            if (!$proyecto->es_social) {
                throw new ProyectoNoSocialException("Las visitas domiciliarias solo aplican a proyectos sociales.");
            }

            // Crear
            $visita = VisitaDomiciliaria::create($datos);

            // Auditoría
            $this->auditoria->registrarCreacion(
                'visita.creada',
                'visitas_domiciliarias',
                $visita->id,
                $datos
            );

            // TODO: Si es verificación y exitosa, podríamos actualizar una fecha de última verificación en el beneficiario

            return $visita->load('beneficiario', 'visitador');
        });
    }

    public function actualizar(int $id, array $datos, int $actorId): VisitaDomiciliaria
    {
        return DB::transaction(function () use ($id, $datos, $actorId) {
            $visita = VisitaDomiciliaria::findOrFail($id);

            // Protecciones
            unset($datos['proyecto_id'], $datos['beneficiario_id']);

            $datosAnteriores = $visita->getOriginal();
            $visita->update($datos);
            $cambios = $visita->getChanges();

            if (!empty($cambios)) {
                $this->auditoria->registrarActualizacion(
                    'visita.actualizada',
                    'visitas_domiciliarias',
                    $visita->id,
                    $datosAnteriores,
                    $cambios
                );
            }

            return $visita;
        });
    }

    public function eliminar(int $id, int $actorId): bool
    {
        return DB::transaction(function () use ($id, $actorId) {
            $visita = VisitaDomiciliaria::findOrFail($id);
            $visita->delete();

            $this->auditoria->registrarEliminacion(
                'visita.eliminada',
                'visitas_domiciliarias',
                $visita->id
            );

            return true;
        });
    }

    public function obtenerEstadisticasProyecto(int $proyectoId): array
    {
        $visitas = VisitaDomiciliaria::where('proyecto_id', $proyectoId)->get();

        return [
            'total' => $visitas->count(),
            'exitosas' => $visitas->where('resultado', 'exitosa')->count(),
            'no_exitosas' => $visitas->where('resultado', '!=', 'exitosa')->count(),
            'por_tipo' => [
                'inicial' => $visitas->where('tipo_visita', 'inicial')->count(),
                'seguimiento' => $visitas->where('tipo_visita', 'seguimiento')->count(),
                'verificacion' => $visitas->where('tipo_visita', 'verificacion')->count(),
                'cierre' => $visitas->where('tipo_visita', 'cierre')->count(),
                'otra' => $visitas->where('tipo_visita', 'otra')->count(),
            ],
            'gasto_total' => $visitas->sum('gasto_transporte'),
            'promedio_gasto' => round($visitas->avg('gasto_transporte') ?? 0, 2),
        ];
    }
}
