<?php

namespace App\Services\Proyectos;

use App\Models\Vivienda;
use App\Models\Proyecto;
use App\Models\Beneficiario;
use App\Services\NotificacionService;
use App\Exceptions\Proyectos\ViviendaConDependenciasException;
use App\Exceptions\Proyectos\TransicionEstadoNoPermitidaException;
use App\Exceptions\Proyectos\ProyectoEnEstadoNoModificableException;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;

class ViviendaService
{
    protected NotificacionService $notificacion;
    protected CalculoAvanceService $calculoAvance;

    public function __construct(NotificacionService $notificacion, CalculoAvanceService $calculoAvance)
    {
        $this->notificacion = $notificacion;
        $this->calculoAvance = $calculoAvance;
    }

    public function listarPorProyecto(int $proyectoId, array $filtros = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = Vivienda::with(['beneficiario', 'tipoVivienda'])
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

        $query->orderBy('codigo', 'asc');
        return $query->paginate($perPage);
    }

    public function obtenerCompleta(int $id): array
    {
        $vivienda = Vivienda::with(['proyecto', 'beneficiario', 'tipoVivienda'])->findOrFail($id);

        return [
            'vivienda'               => $vivienda,
            'transiciones_permitidas' => $vivienda->getTransicionesPermitidas(),
        ];
    }

    public function crear(array $datos, int $actorId): Vivienda
    {
        return DB::transaction(function () use ($datos, $actorId) {
            $proyecto = Proyecto::findOrFail($datos['proyecto_id']);

            if (in_array($proyecto->estado, ['cancelado', 'finalizado'])) {
                throw new ProyectoEnEstadoNoModificableException("No se pueden agregar viviendas al proyecto en estado '{$proyecto->estado}'.");
            }

            // Generar código VIV-{codigo_proyecto}-{secuencial}
            $cantidadActual = Vivienda::withTrashed()->where('proyecto_id', $proyecto->id)->count();
            $secuencia = str_pad($cantidadActual + 1, 3, '0', STR_PAD_LEFT);
            $datos['codigo'] = "VIV-{$proyecto->codigo}-{$secuencia}";

            if (empty($datos['estado'])) {
                $datos['estado'] = 'planificada';
            }

            $vivienda = Vivienda::create($datos);

            if (!empty($datos['beneficiario_id'])) {
                $this->validarYAsignarBeneficiario($vivienda, $datos['beneficiario_id']);
            }

            $this->calculoAvance->recalcularAvance($proyecto->id);

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarCreacion('vivienda.creada', 'viviendas', $vivienda->id, $vivienda->toArray());

            return $vivienda->load(['beneficiario', 'tipoVivienda']);
        });
    }

    public function crearMultiples(int $proyectoId, int $cantidad, ?int $tipoViviendaId, int $actorId): array
    {
        $viviendas = [];
        for ($i = 0; $i < $cantidad; $i++) {
            $datos = [
                'proyecto_id'     => $proyectoId,
                'tipo_vivienda_id' => $tipoViviendaId,
            ];
            $viviendas[] = $this->crear($datos, $actorId);
        }

        return $viviendas;
    }

    public function actualizar(int $id, array $datos, int $actorId): Vivienda
    {
        return DB::transaction(function () use ($id, $datos) {
            $vivienda = Vivienda::findOrFail($id);

            unset($datos['proyecto_id'], $datos['codigo'], $datos['estado']);

            $vivienda->fill($datos);
            $cambios = $vivienda->getDirty();

            if (empty($cambios)) return $vivienda;

            $vivienda->save();

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarActualizacion('vivienda.actualizada', 'viviendas', $vivienda->id, ...);

            return $vivienda;
        });
    }

    public function cambiarEstado(int $id, string $nuevoEstado, ?string $razon, int $actorId): Vivienda
    {
        return DB::transaction(function () use ($id, $nuevoEstado, $razon) {
            $vivienda = Vivienda::findOrFail($id);
            $estadoAnterior = $vivienda->estado;

            if (!$vivienda->puedeTransicionarA($nuevoEstado)) {
                $permitidos = implode(', ', $vivienda->getTransicionesPermitidas());
                throw new TransicionEstadoNoPermitidaException("No se puede pasar de '{$estadoAnterior}' a '{$nuevoEstado}'. Permitidos: {$permitidos}");
            }

            $vivienda->estado = $nuevoEstado;

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

            $this->calculoAvance->recalcularAvance($vivienda->proyecto_id);

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarCambioEstado('vivienda.estado_cambiado', 'viviendas', $vivienda->id, $estadoAnterior, $nuevoEstado, $razon);

            return $vivienda;
        });
    }

    public function asignarBeneficiario(int $viviendaId, int $beneficiarioId, int $actorId): Vivienda
    {
        return DB::transaction(function () use ($viviendaId, $beneficiarioId) {
            $vivienda = Vivienda::findOrFail($viviendaId);
            $this->validarYAsignarBeneficiario($vivienda, $beneficiarioId);
            $vivienda->save();

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrar('vivienda.beneficiario_asignado', ...);

            return $vivienda->load('beneficiario');
        });
    }

    public function desasignarBeneficiario(int $viviendaId, int $actorId): Vivienda
    {
        return DB::transaction(function () use ($viviendaId) {
            $vivienda = Vivienda::findOrFail($viviendaId);
            $vivienda->beneficiario_id = null;
            $vivienda->save();

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrar('vivienda.beneficiario_desasignado', ...);

            return $vivienda;
        });
    }

    public function eliminar(int $id, int $actorId, string $razon): bool
    {
        return DB::transaction(function () use ($id, $razon) {
            $vivienda = Vivienda::findOrFail($id);

            if ($vivienda->porcentaje_avance > 0) {
                throw new ViviendaConDependenciasException("No se puede eliminar una vivienda con avance ({$vivienda->porcentaje_avance}%). Revierta el estado primero.");
            }
            if ($vivienda->beneficiario_id) {
                throw new ViviendaConDependenciasException("No se puede eliminar una vivienda con beneficiario asignado. Desasigne primero.");
            }

            $proyectoId = $vivienda->proyecto_id;
            $vivienda->delete();

            $this->calculoAvance->recalcularAvance($proyectoId);

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarEliminacion('vivienda.eliminada', 'viviendas', $vivienda->id, [], $razon);
            return true;
        });
    }

    private function validarYAsignarBeneficiario(Vivienda $vivienda, int $beneficiarioId): void
    {
        $beneficiario = Beneficiario::findOrFail($beneficiarioId);

        if ($beneficiario->proyecto_id !== $vivienda->proyecto_id) {
            throw ValidationException::withMessages(['beneficiario_id' => 'El beneficiario debe pertenecer al mismo proyecto.']);
        }

        $otraVivienda = Vivienda::where('beneficiario_id', $beneficiarioId)
            ->where('id', '!=', $vivienda->id)
            ->first();
        if ($otraVivienda) {
            throw ValidationException::withMessages(['beneficiario_id' => "Este beneficiario ya está asignado a la vivienda {$otraVivienda->codigo}."]);
        }

        $vivienda->beneficiario_id = $beneficiarioId;

        if ($beneficiario->latitud_terreno && $beneficiario->longitud_terreno) {
            $vivienda->latitud = $beneficiario->latitud_terreno;
            $vivienda->longitud = $beneficiario->longitud_terreno;
        }
    }
}
