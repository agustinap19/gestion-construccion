<?php

namespace App\Services\Proyectos;

use App\Models\AsignacionPersonal;
use App\Models\Proyecto;
use App\Models\Personal;
use App\Services\NotificacionService;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class AsignacionPersonalService
{
    public function __construct(private NotificacionService $notificacion) {}

    public function listarPorProyecto(int $proyectoId): Collection
    {
        return AsignacionPersonal::with(['personal.usuario.rol', 'personal.rol', 'rol', 'asignador'])
            ->where('proyecto_id', $proyectoId)
            ->orderBy('estado')
            ->orderBy('rol_id')
            ->get();
    }

    public function asignar(array $datos, int $actorId): AsignacionPersonal
    {
        return DB::transaction(function () use ($datos, $actorId) {
            $proyecto = Proyecto::findOrFail($datos['proyecto_id']);
            $personal = Personal::findOrFail($datos['personal_id']);

            if ($personal->estado_laboral !== 'activo') {
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
            if (!empty($datos['es_responsable_principal'])) {
                $existeResp = AsignacionPersonal::where('proyecto_id', $datos['proyecto_id'])
                    ->where('es_responsable_principal', true)
                    ->where('estado', 'activa')
                    ->first();
                if ($existeResp) {
                    throw ValidationException::withMessages(['es_responsable_principal' => 'Ya existe un responsable principal activo. Finalice la asignación actual primero.']);
                }
            }

            $datos['usuario_asignador_id'] = $actorId;
            $datos['estado'] = 'activa';
            $datos['fecha_inicio'] = $datos['fecha_inicio'] ?? now()->toDateString();

            $asignacion = AsignacionPersonal::create($datos);

            // Notificar al usuario si el personal tiene acceso al sistema
            if ($personal->usuario_id) {
                $this->notificacion->enviarA($personal->usuario_id, [
                    'tipo'       => 'info',
                    'titulo'     => 'Asignado a proyecto',
                    'mensaje'    => "Has sido asignado al proyecto \"{$proyecto->nombre}\". Revisa tus tareas asignadas.",
                    'icono'      => 'briefcase',
                    'url_accion' => "/dashboard/proyectos/{$proyecto->id}",
                ]);
            }

            return $asignacion->load('personal', 'rol');
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
            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarActualizacion('asignacion_personal.actualizada', 'asignaciones_personal', $asignacion->id, $datosAnteriores, $cambios);

            return $asignacion->load('personal', 'rol');
        });
    }

    public function finalizar(int $id, int $actorId): AsignacionPersonal
    {
        return DB::transaction(function () use ($id) {
            $asignacion = AsignacionPersonal::findOrFail($id);
            $asignacion->estado = 'finalizada';
            $asignacion->fecha_fin = now()->toDateString();
            $asignacion->save();

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarCambioEstado('asignacion_personal.finalizada', 'asignaciones_personal', $asignacion->id, 'activa', 'finalizada');

            return $asignacion;
        });
    }

    public function eliminar(int $id, int $actorId): bool
    {
        return DB::transaction(function () use ($id) {
            $asignacion = AsignacionPersonal::findOrFail($id);
            $asignacion->delete();

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarEliminacion('asignacion_personal.eliminada', 'asignaciones_personal', $id, $asignacion->toArray());
            return true;
        });
    }
}
