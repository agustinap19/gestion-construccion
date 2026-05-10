<?php

namespace App\Services\Proyectos;

use App\Models\AsignacionPersonal;
use App\Models\Proyecto;
use App\Models\Personal;
use App\Services\AuditoriaService;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class AsignacionPersonalService
{
    protected AuditoriaService $auditoria;

    public function __construct(AuditoriaService $auditoria)
    {
        $this->auditoria = $auditoria;
    }

    public function listarPorProyecto(int $proyectoId): Collection
    {
        return AsignacionPersonal::with(['personal', 'asignadoPor'])
            ->where('proyecto_id', $proyectoId)
            ->orderBy('rol_en_proyecto')
            ->get();
    }

    public function asignar(array $datos, int $actorId): AsignacionPersonal
    {
        return DB::transaction(function () use ($datos, $actorId) {
            $proyecto = Proyecto::findOrFail($datos['proyecto_id']);
            $personal = Personal::findOrFail($datos['personal_id']);

            if ($personal->estado !== 'activo') {
                throw ValidationException::withMessages(['personal_id' => 'El personal debe estar activo.']);
            }

            // Verificar duplicidad
            $existente = AsignacionPersonal::where('proyecto_id', $datos['proyecto_id'])
                ->where('personal_id', $datos['personal_id'])
                ->where('estado', 'activa')
                ->first();
            if ($existente) {
                throw ValidationException::withMessages(['personal_id' => 'Este personal ya está asignado al proyecto.']);
            }

            // Solo un responsable principal por proyecto
            if (($datos['rol_en_proyecto'] ?? '') === 'responsable_principal') {
                $existeResp = AsignacionPersonal::where('proyecto_id', $datos['proyecto_id'])
                    ->where('rol_en_proyecto', 'responsable_principal')
                    ->where('estado', 'activa')
                    ->first();
                if ($existeResp) {
                    throw ValidationException::withMessages(['rol_en_proyecto' => 'Ya existe un responsable principal. Finalice la asignación actual primero.']);
                }
            }

            $datos['asignado_por_id'] = $actorId;
            $datos['estado'] = 'activa';
            $datos['fecha_inicio'] = $datos['fecha_inicio'] ?? now()->toDateString();

            $asignacion = AsignacionPersonal::create($datos);

            $this->auditoria->registrarCreacion('asignacion_personal.creada', 'asignaciones_personal', $asignacion->id, $asignacion->toArray());

            return $asignacion->load('personal');
        });
    }

    public function actualizar(int $id, array $datos, int $actorId): AsignacionPersonal
    {
        return DB::transaction(function () use ($id, $datos) {
            $asignacion = AsignacionPersonal::findOrFail($id);
            unset($datos['proyecto_id'], $datos['personal_id'], $datos['estado']);

            $datosAnteriores = $asignacion->toArray();
            $asignacion->fill($datos);
            $cambios = $asignacion->getDirty();
            if (empty($cambios)) return $asignacion;

            $asignacion->save();
            $this->auditoria->registrarActualizacion('asignacion_personal.actualizada', 'asignaciones_personal', $asignacion->id, $datosAnteriores, $cambios);

            return $asignacion->load('personal');
        });
    }

    public function finalizar(int $id, int $actorId): AsignacionPersonal
    {
        return DB::transaction(function () use ($id) {
            $asignacion = AsignacionPersonal::findOrFail($id);
            $asignacion->estado = 'finalizada';
            $asignacion->fecha_fin = now()->toDateString();
            $asignacion->save();

            $this->auditoria->registrarCambioEstado('asignacion_personal.finalizada', 'asignaciones_personal', $asignacion->id, 'activa', 'finalizada');

            return $asignacion;
        });
    }

    public function eliminar(int $id, int $actorId): bool
    {
        return DB::transaction(function () use ($id) {
            $asignacion = AsignacionPersonal::findOrFail($id);
            $asignacion->delete();

            $this->auditoria->registrarEliminacion('asignacion_personal.eliminada', 'asignaciones_personal', $id, $asignacion->toArray());
            return true;
        });
    }
}
