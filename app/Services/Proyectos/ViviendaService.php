<?php

namespace App\Services\Proyectos;

use App\Models\Vivienda;
use App\Models\Proyecto;
use App\Models\Beneficiario;
use App\Services\AuditoriaService;
use App\Services\NotificacionService;
use App\Exceptions\Proyectos\CategoriaProyectoIncompatibleException;
use App\Exceptions\Proyectos\ViviendaConDependenciasException;
use App\Exceptions\Proyectos\TransicionEstadoNoPermitidaException;
use App\Exceptions\Proyectos\ProyectoEnEstadoNoModificableException;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;

class ViviendaService
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

    public function listarPorProyecto(int $proyectoId, array $filtros = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = Vivienda::with(['beneficiario', 'tipoVivienda', 'creador'])
            ->delProyecto($proyectoId);

        if (!empty($filtros['estado']) && $filtros['estado'] !== 'todos') {
            $query->porEstado($filtros['estado']);
        }
        if (!empty($filtros['busqueda'])) {
            $term = '%' . $filtros['busqueda'] . '%';
            $query->where(function ($q) use ($term) {
                $q->where('codigo', 'LIKE', $term)
                  ->orWhereHas('beneficiario', fn($b) => $b->where('nombre', 'LIKE', $term)->orWhere('apellido_paterno', 'LIKE', $term));
            });
        }
        if (isset($filtros['sin_beneficiario']) && $filtros['sin_beneficiario']) {
            $query->sinBeneficiario();
        }
        if (isset($filtros['con_observaciones']) && $filtros['con_observaciones']) {
            $query->conObservaciones();
        }

        $query->orderBy('codigo', 'asc');
        return $query->paginate($perPage);
    }

    public function obtenerCompleta(int $id): array
    {
        $vivienda = Vivienda::with(['proyecto', 'beneficiario', 'tipoVivienda', 'creador'])->findOrFail($id);

        return [
            'vivienda' => $vivienda,
            'transiciones_permitidas' => $vivienda->getTransicionesPermitidas(),
        ];
    }

    public function crear(array $datos, int $actorId): Vivienda
    {
        return DB::transaction(function () use ($datos, $actorId) {
            $proyecto = Proyecto::findOrFail($datos['proyecto_id']);

            // Regla 30: Solo proyectos sociales
            if (!$proyecto->es_social) {
                throw new CategoriaProyectoIncompatibleException('Solo los proyectos sociales pueden tener viviendas.');
            }
            if (in_array($proyecto->estado, ['cancelado', 'finalizado'])) {
                throw new ProyectoEnEstadoNoModificableException("No se pueden agregar viviendas al proyecto en estado '{$proyecto->estado}'.");
            }

            // Regla 28-29: Generar código VIV-{codigo_proyecto}-{secuencial}
            $cantidadActual = Vivienda::withTrashed()->where('proyecto_id', $proyecto->id)->count();
            $secuencia = str_pad($cantidadActual + 1, 3, '0', STR_PAD_LEFT);
            $datos['codigo'] = "VIV-{$proyecto->codigo}-{$secuencia}";

            $datos['usuario_creador_id'] = $actorId;
            if (empty($datos['estado'])) {
                $datos['estado'] = 'planificada';
            }
            $datos['porcentaje_avance'] = Vivienda::AVANCE_POR_ESTADO[$datos['estado']] ?? 0;

            // Regla 34: Heredar tipo vivienda del proyecto si no se especifica (futuro)
            $vivienda = Vivienda::create($datos);

            // Regla 32: Si tiene beneficiario, validar mismo proyecto y copiar coords
            if (!empty($datos['beneficiario_id'])) {
                $this->validarYAsignarBeneficiario($vivienda, $datos['beneficiario_id']);
            }

            // Actualizar cantidad_unidades y avance
            $this->calculoAvance->validarConsistenciaUnidades($proyecto->id);
            $this->calculoAvance->recalcularAvance($proyecto->id);

            $this->auditoria->registrarCreacion('vivienda.creada', 'viviendas', $vivienda->id, $vivienda->toArray());

            return $vivienda->load(['beneficiario', 'tipoVivienda']);
        });
    }

    public function crearMultiples(int $proyectoId, int $cantidad, ?int $tipoViviendaId, int $actorId): array
    {
        $proyecto = Proyecto::findOrFail($proyectoId);
        if (!$proyecto->es_social) {
            throw new CategoriaProyectoIncompatibleException('Solo los proyectos sociales pueden tener viviendas.');
        }

        $viviendas = [];
        for ($i = 0; $i < $cantidad; $i++) {
            $datos = [
                'proyecto_id' => $proyectoId,
                'tipo_vivienda_id' => $tipoViviendaId,
            ];
            $viviendas[] = $this->crear($datos, $actorId);
        }

        return $viviendas;
    }

    public function actualizar(int $id, array $datos, int $actorId): Vivienda
    {
        return DB::transaction(function () use ($id, $datos, $actorId) {
            $vivienda = Vivienda::findOrFail($id);

            // No permitir cambiar proyecto_id ni codigo
            unset($datos['proyecto_id'], $datos['codigo'], $datos['estado'], $datos['porcentaje_avance']);

            $datosAnteriores = $vivienda->toArray();
            $vivienda->fill($datos);
            $cambios = $vivienda->getDirty();

            if (empty($cambios)) return $vivienda;

            $vivienda->save();
            $this->auditoria->registrarActualizacion('vivienda.actualizada', 'viviendas', $vivienda->id, $datosAnteriores, $cambios);

            return $vivienda;
        });
    }

    public function cambiarEstado(int $id, string $nuevoEstado, ?string $razon, int $actorId): Vivienda
    {
        return DB::transaction(function () use ($id, $nuevoEstado, $razon, $actorId) {
            $vivienda = Vivienda::findOrFail($id);
            $estadoAnterior = $vivienda->estado;

            if (!$vivienda->puedeTransicionarA($nuevoEstado)) {
                $permitidos = implode(', ', $vivienda->getTransicionesPermitidas());
                throw new TransicionEstadoNoPermitidaException("No se puede pasar de '{$estadoAnterior}' a '{$nuevoEstado}'. Permitidos: {$permitidos}");
            }

            $vivienda->estado = $nuevoEstado;

            // Regla 37: Calcular avance por estado
            $avance = $vivienda->calcularAvancePorEstado($nuevoEstado);
            $vivienda->porcentaje_avance = $avance;

            // Flag de observaciones
            if ($nuevoEstado === 'con_observaciones') {
                $vivienda->tiene_observaciones_activas = true;
                if ($razon) {
                    $obs = $vivienda->observaciones ? $vivienda->observaciones . "\n\n" : "";
                    $vivienda->observaciones = $obs . "[Observación - " . date('Y-m-d') . "]: {$razon}";
                }
            } else {
                $vivienda->tiene_observaciones_activas = false;
            }

            $vivienda->save();

            // Regla 14: Recalcular avance del proyecto
            $this->calculoAvance->recalcularAvance($vivienda->proyecto_id);

            $this->auditoria->registrarCambioEstado('vivienda.estado_cambiado', 'viviendas', $vivienda->id, $estadoAnterior, $nuevoEstado, $razon);

            return $vivienda;
        });
    }

    public function asignarBeneficiario(int $viviendaId, int $beneficiarioId, int $actorId): Vivienda
    {
        return DB::transaction(function () use ($viviendaId, $beneficiarioId, $actorId) {
            $vivienda = Vivienda::findOrFail($viviendaId);
            $this->validarYAsignarBeneficiario($vivienda, $beneficiarioId);
            $vivienda->save();

            $this->auditoria->registrar('vivienda.beneficiario_asignado', 'viviendas', $vivienda->id, [
                'datos_nuevos' => ['beneficiario_id' => $beneficiarioId],
            ]);

            return $vivienda->load('beneficiario');
        });
    }

    public function desasignarBeneficiario(int $viviendaId, int $actorId): Vivienda
    {
        return DB::transaction(function () use ($viviendaId, $actorId) {
            $vivienda = Vivienda::findOrFail($viviendaId);
            $anteriorId = $vivienda->beneficiario_id;

            $vivienda->beneficiario_id = null;
            $vivienda->save();

            $this->auditoria->registrar('vivienda.beneficiario_desasignado', 'viviendas', $vivienda->id, [
                'datos_anteriores' => ['beneficiario_id' => $anteriorId],
                'datos_nuevos' => ['beneficiario_id' => null],
            ]);

            return $vivienda;
        });
    }

    public function eliminar(int $id, int $actorId, string $razon): bool
    {
        return DB::transaction(function () use ($id, $razon) {
            $vivienda = Vivienda::findOrFail($id);

            // Regla 38: No eliminar si avance > 0
            if ($vivienda->porcentaje_avance > 0) {
                throw new ViviendaConDependenciasException("No se puede eliminar una vivienda con avance ({$vivienda->porcentaje_avance}%). Revierta el estado primero.");
            }
            // Regla 39: No eliminar si tiene beneficiario
            if ($vivienda->beneficiario_id) {
                throw new ViviendaConDependenciasException("No se puede eliminar una vivienda con beneficiario asignado. Desasigne primero.");
            }

            $proyectoId = $vivienda->proyecto_id;
            $vivienda->delete();

            $this->calculoAvance->validarConsistenciaUnidades($proyectoId);
            $this->calculoAvance->recalcularAvance($proyectoId);

            $this->auditoria->registrarEliminacion('vivienda.eliminada', 'viviendas', $vivienda->id, [], $razon);
            return true;
        });
    }

    private function validarYAsignarBeneficiario(Vivienda $vivienda, int $beneficiarioId): void
    {
        $beneficiario = Beneficiario::findOrFail($beneficiarioId);

        // Regla 32: Beneficiario debe pertenecer al mismo proyecto
        if ($beneficiario->proyecto_id !== $vivienda->proyecto_id) {
            throw ValidationException::withMessages(['beneficiario_id' => 'El beneficiario debe pertenecer al mismo proyecto.']);
        }

        // Verificar que no esté asignado a otra vivienda
        $otraVivienda = Vivienda::where('beneficiario_id', $beneficiarioId)
            ->where('id', '!=', $vivienda->id)
            ->first();
        if ($otraVivienda) {
            throw ValidationException::withMessages(['beneficiario_id' => "Este beneficiario ya está asignado a la vivienda {$otraVivienda->codigo}."]);
        }

        $vivienda->beneficiario_id = $beneficiarioId;

        // Regla 33: Copiar coordenadas del beneficiario
        if ($beneficiario->latitud_terreno && $beneficiario->longitud_terreno) {
            $vivienda->latitud = $beneficiario->latitud_terreno;
            $vivienda->longitud = $beneficiario->longitud_terreno;
        }
    }
}
