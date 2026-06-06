<?php

namespace App\Services\Proyectos;

use App\Models\FaseProyecto;
use App\Models\Proyecto;
use App\Services\NotificacionService;
use App\Exceptions\Proyectos\FaseConDependenciasException;
use App\Exceptions\Proyectos\TransicionEstadoNoPermitidaException;
use App\Exceptions\Proyectos\ProyectoEnEstadoNoModificableException;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class FaseProyectoService
{
    protected NotificacionService $notificacion;
    protected CalculoAvanceService $calculoAvance;

    public function __construct(NotificacionService $notificacion, CalculoAvanceService $calculoAvance)
    {
        $this->notificacion = $notificacion;
        $this->calculoAvance = $calculoAvance;
    }

    public function listarPorProyecto(int $proyectoId): Collection
    {
        return FaseProyecto::with(['fasePrerrequisito'])
            ->where('proyecto_id', $proyectoId)
            ->orderBy('orden')
            ->get();
    }

    public function obtenerCompleta(int $id): array
    {
        $fase = FaseProyecto::with(['proyecto', 'fasePrerrequisito'])->findOrFail($id);

        $dependientes = FaseProyecto::where('fase_prerrequisito_id', $id)->get(['id', 'nombre', 'estado']);

        return [
            'fase'                   => $fase,
            'dependientes'           => $dependientes,
            'transiciones_permitidas' => $fase->getTransicionesPermitidas(),
        ];
    }

    public function crear(array $datos, int $actorId): FaseProyecto
    {
        return DB::transaction(function () use ($datos, $actorId) {
            $proyecto = Proyecto::findOrFail($datos['proyecto_id']);

            if (in_array($proyecto->estado, ['cancelado', 'finalizado'])) {
                throw new ProyectoEnEstadoNoModificableException("No se pueden agregar fases al proyecto en estado '{$proyecto->estado}'.");
            }

            // Auto-asignar orden al final
            $maxOrden = FaseProyecto::where('proyecto_id', $proyecto->id)->max('orden') ?? 0;
            $datos['orden'] = $maxOrden + 1;

            if (empty($datos['estado'])) {
                $datos['estado'] = 'pendiente';
            }

            // Validar prerrequisito
            if (!empty($datos['fase_prerrequisito_id'])) {
                $prereq = FaseProyecto::where('id', $datos['fase_prerrequisito_id'])
                    ->where('proyecto_id', $proyecto->id)
                    ->first();
                if (!$prereq) {
                    throw ValidationException::withMessages(['fase_prerrequisito_id' => 'El prerrequisito debe pertenecer al mismo proyecto.']);
                }
            }

            $fase = FaseProyecto::create($datos);

            $this->calculoAvance->recalcularAvance($proyecto->id);

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarCreacion('fase.creada', 'fases_proyecto', $fase->id, $fase->toArray());

            return $fase->load('fasePrerrequisito');
        });
    }

    public function actualizar(int $id, array $datos, int $actorId): FaseProyecto
    {
        return DB::transaction(function () use ($id, $datos) {
            $fase = FaseProyecto::findOrFail($id);
            unset($datos['proyecto_id'], $datos['estado'], $datos['avance_porcentaje']);

            // Validar prerrequisito si cambia
            if (isset($datos['fase_prerrequisito_id']) && $datos['fase_prerrequisito_id']) {
                if ($datos['fase_prerrequisito_id'] == $id) {
                    throw ValidationException::withMessages(['fase_prerrequisito_id' => 'Una fase no puede ser su propio prerrequisito.']);
                }
                $prereq = FaseProyecto::where('id', $datos['fase_prerrequisito_id'])
                    ->where('proyecto_id', $fase->proyecto_id)
                    ->first();
                if (!$prereq) {
                    throw ValidationException::withMessages(['fase_prerrequisito_id' => 'El prerrequisito debe pertenecer al mismo proyecto.']);
                }
            }

            $fase->fill($datos);
            $cambios = $fase->getDirty();
            if (empty($cambios)) return $fase;

            $fase->save();

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarActualizacion('fase.actualizada', 'fases_proyecto', $fase->id, $datosAnteriores, $cambios);

            return $fase->load('fasePrerrequisito');
        });
    }

    public function cambiarEstado(int $id, string $nuevoEstado, ?string $razon, int $actorId): FaseProyecto
    {
        return DB::transaction(function () use ($id, $nuevoEstado, $razon) {
            $fase = FaseProyecto::with('fasePrerrequisito')->findOrFail($id);
            $estadoAnterior = $fase->estado;

            if (!$fase->puedeTransicionarA($nuevoEstado)) {
                $permitidos = implode(', ', $fase->getTransicionesPermitidas());
                throw new TransicionEstadoNoPermitidaException("No se puede pasar de '{$estadoAnterior}' a '{$nuevoEstado}'. Permitidos: {$permitidos}");
            }

            // No iniciar si prerrequisito no completado
            if ($nuevoEstado === 'en_progreso' && $fase->fasePrerrequisito) {
                if ($fase->fasePrerrequisito->estado !== 'completada') {
                    throw new TransicionEstadoNoPermitidaException("No se puede iniciar esta fase porque el prerrequisito '{$fase->fasePrerrequisito->nombre}' no está completado (estado: {$fase->fasePrerrequisito->estado}).");
                }
            }

            // Completar requiere 100% avance
            if ($nuevoEstado === 'completada' && $fase->avance_porcentaje < 100) {
                throw new TransicionEstadoNoPermitidaException("El avance debe ser 100% para completar la fase (actual: {$fase->avance_porcentaje}%).");
            }

            $fase->estado = $nuevoEstado;

            if ($nuevoEstado === 'en_progreso' && !$fase->fecha_inicio_real) {
                $fase->fecha_inicio_real = now()->toDateString();
            }
            if ($nuevoEstado === 'completada' && !$fase->fecha_fin_real) {
                $fase->fecha_fin_real = now()->toDateString();
            }

            $fase->save();
            $this->calculoAvance->recalcularAvance($fase->proyecto_id);

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarCambioEstado('fase.estado_cambiado', 'fases_proyecto', $fase->id, $estadoAnterior, $nuevoEstado, $razon);

            return $fase;
        });
    }

    public function actualizarAvance(int $id, float $porcentaje, int $actorId): FaseProyecto
    {
        return DB::transaction(function () use ($id, $porcentaje) {
            $fase = FaseProyecto::findOrFail($id);

            if ($porcentaje < 0 || $porcentaje > 100) {
                throw ValidationException::withMessages(['porcentaje' => 'El porcentaje debe estar entre 0 y 100.']);
            }

            $fase->avance_porcentaje = $porcentaje;
            $fase->save();

            $this->calculoAvance->recalcularAvance($fase->proyecto_id);

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarActualizacion('fase.avance_actualizado', 'fases_proyecto', $fase->id, ...);

            return $fase;
        });
    }

    public function reordenar(int $proyectoId, array $ordenIds, int $actorId): Collection
    {
        return DB::transaction(function () use ($proyectoId, $ordenIds) {
            foreach ($ordenIds as $index => $faseId) {
                FaseProyecto::where('id', $faseId)
                    ->where('proyecto_id', $proyectoId)
                    ->update(['orden' => $index + 1]);
            }

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrar('fases.reordenadas', 'proyectos', $proyectoId, [...]);

            return $this->listarPorProyecto($proyectoId);
        });
    }

    public function eliminar(int $id, int $actorId, string $razon): bool
    {
        return DB::transaction(function () use ($id, $razon) {
            $fase = FaseProyecto::findOrFail($id);

            if ($fase->avance_porcentaje > 0) {
                throw new FaseConDependenciasException("No se puede eliminar una fase con avance ({$fase->avance_porcentaje}%).");
            }

            // Verificar que nadie dependa de esta fase
            $dependientes = FaseProyecto::where('fase_prerrequisito_id', $id)->count();
            if ($dependientes > 0) {
                throw new FaseConDependenciasException("No se puede eliminar esta fase porque {$dependientes} fase(s) la tienen como prerrequisito.");
            }

            $proyectoId = $fase->proyecto_id;
            $fase->delete();

            // Reordenar fases restantes
            $fasesRestantes = FaseProyecto::where('proyecto_id', $proyectoId)->orderBy('orden')->get();
            foreach ($fasesRestantes as $i => $f) {
                $f->update(['orden' => $i + 1]);
            }

            $this->calculoAvance->recalcularAvance($proyectoId);

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarEliminacion('fase.eliminada', 'fases_proyecto', $id, [], $razon);
            return true;
        });
    }
}
