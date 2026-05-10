<?php

namespace App\Services\Proyectos;

use App\Models\FaseProyecto;
use App\Models\Proyecto;
use App\Services\AuditoriaService;
use App\Services\NotificacionService;
use App\Exceptions\Proyectos\CategoriaProyectoIncompatibleException;
use App\Exceptions\Proyectos\FaseConDependenciasException;
use App\Exceptions\Proyectos\TransicionEstadoNoPermitidaException;
use App\Exceptions\Proyectos\ProyectoEnEstadoNoModificableException;
use App\Exceptions\Proyectos\PesoPorcentualInvalidoException;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class FaseProyectoService
{
    protected AuditoriaService $auditoria;
    protected NotificacionService $notificacion;
    protected CalculoAvanceService $calculoAvance;

    public function __construct(AuditoriaService $auditoria, NotificacionService $notificacion, CalculoAvanceService $calculoAvance)
    {
        $this->auditoria = $auditoria;
        $this->notificacion = $notificacion;
        $this->calculoAvance = $calculoAvance;
    }

    public function listarPorProyecto(int $proyectoId): Collection
    {
        return FaseProyecto::with(['prerrequisito', 'creador'])
            ->where('proyecto_id', $proyectoId)
            ->orderBy('orden')
            ->get();
    }

    public function obtenerCompleta(int $id): array
    {
        $fase = FaseProyecto::with(['proyecto', 'prerrequisito', 'creador'])->findOrFail($id);

        // Fases que dependen de esta
        $dependientes = FaseProyecto::where('fase_prerrequisito_id', $id)->get(['id', 'nombre', 'codigo', 'estado']);

        return [
            'fase' => $fase,
            'dependientes' => $dependientes,
            'transiciones_permitidas' => $fase->getTransicionesPermitidas(),
        ];
    }

    public function crear(array $datos, int $actorId): FaseProyecto
    {
        return DB::transaction(function () use ($datos, $actorId) {
            $proyecto = Proyecto::findOrFail($datos['proyecto_id']);

            if (!$proyecto->es_privado) {
                throw new CategoriaProyectoIncompatibleException('Solo los proyectos privados pueden tener fases.');
            }
            if (in_array($proyecto->estado, ['cancelado', 'finalizado'])) {
                throw new ProyectoEnEstadoNoModificableException("No se pueden agregar fases al proyecto en estado '{$proyecto->estado}'.");
            }

            // Auto-asignar orden al final
            $maxOrden = FaseProyecto::where('proyecto_id', $proyecto->id)->max('orden') ?? 0;
            $datos['orden'] = $maxOrden + 1;

            // Generar código FAS-{codigo_proyecto}-{secuencial}
            $cantidadActual = FaseProyecto::withTrashed()->where('proyecto_id', $proyecto->id)->count();
            $secuencia = str_pad($cantidadActual + 1, 3, '0', STR_PAD_LEFT);
            $datos['codigo'] = "FAS-{$proyecto->codigo}-{$secuencia}";

            $datos['usuario_creador_id'] = $actorId;
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

            $this->calculoAvance->validarConsistenciaUnidades($proyecto->id);
            $this->calculoAvance->recalcularAvance($proyecto->id);

            $this->auditoria->registrarCreacion('fase.creada', 'fases_proyecto', $fase->id, $fase->toArray());

            return $fase->load('prerrequisito');
        });
    }

    public function actualizar(int $id, array $datos, int $actorId): FaseProyecto
    {
        return DB::transaction(function () use ($id, $datos, $actorId) {
            $fase = FaseProyecto::findOrFail($id);
            unset($datos['proyecto_id'], $datos['codigo'], $datos['estado'], $datos['porcentaje_avance_interno']);

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

            $datosAnteriores = $fase->toArray();
            $fase->fill($datos);
            $cambios = $fase->getDirty();
            if (empty($cambios)) return $fase;

            $fase->save();

            // Si cambia peso_porcentual, recalcular avance del proyecto
            if (isset($cambios['peso_porcentual'])) {
                $this->calculoAvance->recalcularAvance($fase->proyecto_id);
            }

            $this->auditoria->registrarActualizacion('fase.actualizada', 'fases_proyecto', $fase->id, $datosAnteriores, $cambios);

            return $fase->load('prerrequisito');
        });
    }

    public function cambiarEstado(int $id, string $nuevoEstado, ?string $razon, int $actorId): FaseProyecto
    {
        return DB::transaction(function () use ($id, $nuevoEstado, $razon) {
            $fase = FaseProyecto::with('prerrequisito')->findOrFail($id);
            $estadoAnterior = $fase->estado;

            if (!$fase->puedeTransicionarA($nuevoEstado)) {
                $permitidos = implode(', ', $fase->getTransicionesPermitidas());
                throw new TransicionEstadoNoPermitidaException("No se puede pasar de '{$estadoAnterior}' a '{$nuevoEstado}'. Permitidos: {$permitidos}");
            }

            // Regla 42: No iniciar si prerrequisito no completado
            if ($nuevoEstado === 'en_proceso' && $fase->prerrequisito) {
                if ($fase->prerrequisito->estado !== 'completada') {
                    throw new TransicionEstadoNoPermitidaException("No se puede iniciar esta fase porque el prerrequisito '{$fase->prerrequisito->nombre}' no está completado (estado: {$fase->prerrequisito->estado}).");
                }
            }

            // Regla: completar requiere 100% avance interno
            if ($nuevoEstado === 'completada' && $fase->porcentaje_avance_interno < 100) {
                throw new TransicionEstadoNoPermitidaException("El avance interno debe ser 100% para completar la fase (actual: {$fase->porcentaje_avance_interno}%).");
            }

            $fase->estado = $nuevoEstado;

            // Registrar fecha inicio real
            if ($nuevoEstado === 'en_proceso' && !$fase->fecha_inicio_real) {
                $fase->fecha_inicio_real = now()->toDateString();
            }
            if ($nuevoEstado === 'completada' && !$fase->fecha_fin_real) {
                $fase->fecha_fin_real = now()->toDateString();
            }

            $fase->save();
            $this->calculoAvance->recalcularAvance($fase->proyecto_id);

            $this->auditoria->registrarCambioEstado('fase.estado_cambiado', 'fases_proyecto', $fase->id, $estadoAnterior, $nuevoEstado, $razon);

            return $fase;
        });
    }

    public function actualizarAvanceInterno(int $id, float $porcentaje, int $actorId): FaseProyecto
    {
        return DB::transaction(function () use ($id, $porcentaje) {
            $fase = FaseProyecto::findOrFail($id);

            if ($porcentaje < 0 || $porcentaje > 100) {
                throw ValidationException::withMessages(['porcentaje' => 'El porcentaje debe estar entre 0 y 100.']);
            }

            $anterior = $fase->porcentaje_avance_interno;
            $fase->porcentaje_avance_interno = $porcentaje;
            $fase->save();

            $this->calculoAvance->recalcularAvance($fase->proyecto_id);

            $this->auditoria->registrarActualizacion('fase.avance_actualizado', 'fases_proyecto', $fase->id, ['porcentaje_avance_interno' => $anterior], ['porcentaje_avance_interno' => $porcentaje]);

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

            $this->auditoria->registrar('fases.reordenadas', 'proyectos', $proyectoId, [
                'datos_nuevos' => ['orden' => $ordenIds],
            ]);

            return $this->listarPorProyecto($proyectoId);
        });
    }

    public function eliminar(int $id, int $actorId, string $razon): bool
    {
        return DB::transaction(function () use ($id, $razon) {
            $fase = FaseProyecto::findOrFail($id);

            if ($fase->porcentaje_avance_interno > 0) {
                throw new FaseConDependenciasException("No se puede eliminar una fase con avance ({$fase->porcentaje_avance_interno}%).");
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

            $this->calculoAvance->validarConsistenciaUnidades($proyectoId);
            $this->calculoAvance->recalcularAvance($proyectoId);

            $this->auditoria->registrarEliminacion('fase.eliminada', 'fases_proyecto', $id, [], $razon);
            return true;
        });
    }

    public function validarSumaPesos(int $proyectoId): array
    {
        $suma = FaseProyecto::where('proyecto_id', $proyectoId)
            ->whereNotIn('estado', ['cancelada'])
            ->sum('peso_porcentual');

        return [
            'suma' => round($suma, 2),
            'valida' => abs($suma - 100) < 0.01,
            'diferencia' => round(100 - $suma, 2),
        ];
    }
}
