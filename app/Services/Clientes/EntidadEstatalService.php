<?php

namespace App\Services\Clientes;

use App\Models\EntidadEstatal;
use App\Models\Auditoria;
use App\Models\User;
use App\Services\AuditoriaService;
use App\Services\NotificacionService;
use App\Exceptions\Clientes\EntidadDuplicadaException;
use App\Exceptions\Clientes\EntidadConDependenciasException;
use App\Exceptions\Clientes\OperacionNoPermitidaException;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;
use Carbon\Carbon;

class EntidadEstatalService
{
    protected $auditoriaService;
    protected $notificacionService;

    public function __construct(AuditoriaService $auditoriaService, NotificacionService $notificacionService)
    {
        $this->auditoriaService = $auditoriaService;
        $this->notificacionService = $notificacionService;
    }

    public function listarConFiltros(array $filtros, int $perPage = 20): LengthAwarePaginator
    {
        $query = EntidadEstatal::with(['zona', 'creador']);

        if (!empty($filtros['busqueda'])) {
            $term = '%' . $filtros['busqueda'] . '%';
            $query->where(function ($q) use ($term) {
                $q->where('nombre', 'LIKE', $term)
                  ->orWhere('sigla', 'LIKE', $term)
                  ->orWhere('nit', 'LIKE', $term);
            });
        }

        if (!empty($filtros['nivel']) && $filtros['nivel'] !== 'todos') {
            $query->porNivel($filtros['nivel']);
        }

        if (!empty($filtros['estado']) && $filtros['estado'] !== 'todos') {
            $query->where('estado', $filtros['estado']);
        }

        if (!empty($filtros['zona_id'])) {
            $query->where('zona_id', $filtros['zona_id']);
        }

        $allowedSorts = ['nombre', 'nit', 'created_at', 'estado'];
        $ordenarPor = in_array($filtros['ordenar_por'] ?? '', $allowedSorts) ? $filtros['ordenar_por'] : 'created_at';
        $direccion = in_array(strtolower($filtros['direccion'] ?? ''), ['asc', 'desc']) ? strtolower($filtros['direccion']) : 'desc';

        $query->orderBy($ordenarPor, $direccion);

        return $query->paginate($perPage);
    }

    public function obtenerCompleto(int $id): array
    {
        $entidad = EntidadEstatal::with(['zona', 'creador'])->findOrFail($id);
        
        $auditoria = Auditoria::with('actor:id,email')
            ->where('tabla_afectada', 'entidades_estatales')
            ->where('registro_id', $id)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        $antiguedad_meses = Carbon::parse($entidad->created_at)->diffInMonths(now());

        return [
            'entidad' => $entidad,
            'auditoria' => $auditoria,
            'estadisticas' => [
                'cantidad_proyectos' => 0, // Placeholder
                'monto_historico_contratado' => 0, // Placeholder
                'antiguedad_meses' => $antiguedad_meses
            ]
        ];
    }

    public function crear(array $datos, int $actorId): EntidadEstatal
    {
        // Validación NIT único en toda la tabla (incluso soft-deleted si es necesario, pero `unique` rules ya cubren. Aquí reforzamos)
        $existeNit = EntidadEstatal::where('nit', $datos['nit'])->exists();
        if ($existeNit) {
            throw new EntidadDuplicadaException('nit', $datos['nit']);
        }

        // Validación combinada de negocio
        $existeCombo = EntidadEstatal::where('nombre', $datos['nombre'])
            ->where('nivel', $datos['nivel'])
            ->where('zona_id', $datos['zona_id'])
            ->exists();
        
        if ($existeCombo) {
            throw new EntidadDuplicadaException('nombre_nivel_zona', $datos['nombre']);
        }

        return DB::transaction(function () use ($datos, $actorId) {
            $datos['usuario_creador_id'] = $actorId;
            if (empty($datos['estado'])) {
                $datos['estado'] = 'activa';
            }

            $entidad = EntidadEstatal::create($datos);

            $this->auditoriaService->registrarCreacion(
                'entidad.creada',
                'entidades_estatales',
                $entidad->id,
                $entidad->toArray()
            );

            $this->notificacionService->notificarAUsuariosConRol(
                'gerente',
                "Nueva entidad estatal registrada",
                "Se registró: {$entidad->nombre_completo}.",
                'info'
            );

            return $entidad->load(['zona', 'creador']);
        });
    }

    public function actualizar(int $id, array $datos, int $actorId): EntidadEstatal
    {
        $entidad = EntidadEstatal::findOrFail($id);
        
        // Unicidad NIT
        if (isset($datos['nit'])) {
            $existeNit = EntidadEstatal::where('nit', $datos['nit'])->where('id', '!=', $id)->exists();
            if ($existeNit) {
                throw new EntidadDuplicadaException('nit', $datos['nit']);
            }
        }

        unset($datos['usuario_creador_id']);
        unset($datos['estado']);

        $datosAnteriores = $entidad->toArray();
        $entidad->fill($datos);
        
        $cambiosReales = [];
        $nuevosReales = [];
        foreach ($entidad->getDirty() as $atributo => $valorNuevo) {
            $cambiosReales[$atributo] = $datosAnteriores[$atributo] ?? null;
            $nuevosReales[$atributo] = $valorNuevo;
        }

        if (empty($cambiosReales)) {
            return $entidad;
        }

        return DB::transaction(function () use ($entidad, $actorId, $cambiosReales, $nuevosReales) {
            $entidad->save();

            $this->auditoriaService->registrarActualizacion(
                'entidad.actualizada',
                'entidades_estatales',
                $entidad->id,
                $cambiosReales,
                $nuevosReales
            );

            return $entidad->load(['zona', 'creador']);
        });
    }

    public function cambiarEstado(int $id, string $nuevoEstado, ?string $razon, int $actorId): EntidadEstatal
    {
        $entidad = EntidadEstatal::findOrFail($id);
        
        if ($entidad->estado === $nuevoEstado) {
            return $entidad;
        }

        if ($nuevoEstado === 'en_disputa' && empty($razon)) {
            throw ValidationException::withMessages(['razon' => 'Debe especificar una razón al marcar a la entidad en disputa.']);
        }

        return DB::transaction(function () use ($entidad, $nuevoEstado, $razon, $actorId) {
            $estadoAnterior = $entidad->estado;
            $entidad->estado = $nuevoEstado;
            $entidad->save();

            $this->auditoriaService->registrarCambioEstado(
                'entidad.estado_cambiado',
                'entidades_estatales',
                $entidad->id,
                $estadoAnterior,
                $nuevoEstado,
                $razon
            );

            if ($nuevoEstado === 'en_disputa') {
                $mensaje = "La entidad {$entidad->nombre_completo} ha sido marcada en disputa por: {$razon}";
                $this->notificacionService->notificarAUsuariosConRol('gerente', "Entidad en Disputa", $mensaje, 'warning');
                $this->notificacionService->notificarAUsuariosConRol('encargado_finanzas', "Entidad en Disputa", $mensaje, 'warning');
            }

            return $entidad;
        });
    }

    public function eliminar(int $id, int $actorId, ?string $razon): bool
    {
        $entidad = EntidadEstatal::findOrFail($id);

        /*
        if ($entidad->proyectos()->count() > 0) {
            throw new EntidadConDependenciasException(
                "Esta entidad estatal tiene proyectos asociados. Reasígnalos o termínalos antes de eliminar.",
                'proyectos',
                $entidad->proyectos()->count()
            );
        }
        */

        return DB::transaction(function () use ($entidad, $actorId, $razon) {
            $entidad->delete();

            $this->auditoriaService->registrarEliminacion(
                'entidad.eliminada',
                'entidades_estatales',
                $entidad->id,
                $entidad->toArray(),
                $razon
            );

            return true;
        });
    }

    public function restaurar(int $id, int $actorId): EntidadEstatal
    {
        $actor = User::with('rol')->find($actorId);
        if (!$actor || !$actor->rol || $actor->rol->nombre !== 'gerente') {
            throw new OperacionNoPermitidaException('Solo el gerente puede restaurar entidades eliminadas.');
        }

        $entidad = EntidadEstatal::onlyTrashed()->findOrFail($id);
        
        return DB::transaction(function () use ($entidad, $actorId) {
            $entidad->restore();

            $this->auditoriaService->registrarActualizacion(
                'entidad.restaurada',
                'entidades_estatales',
                $entidad->id,
                ['deleted_at' => $entidad->deleted_at],
                ['deleted_at' => null]
            );

            return $entidad;
        });
    }

    public function obtenerEstadisticasGenerales(): array
    {
        $baseQuery = EntidadEstatal::query();
        $totalActivas = (clone $baseQuery)->activas()->count();
        $totalInactivas = (clone $baseQuery)->where('estado', 'inactiva')->count();
        $totalDisputa = (clone $baseQuery)->where('estado', 'en_disputa')->count();

        $distribucionNivel = DB::table('entidades_estatales')
            ->select('nivel', DB::raw('count(*) as count'))
            ->whereNull('deleted_at')
            ->groupBy('nivel')
            ->pluck('count', 'nivel')
            ->toArray();

        return [
            'total_activas' => $totalActivas,
            'total_inactivas' => $totalInactivas,
            'total_disputa' => $totalDisputa,
            'distribucion_nivel' => $distribucionNivel,
            'top_entidades_proyectos' => [] // Placeholder
        ];
    }
}
