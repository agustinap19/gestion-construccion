<?php

namespace App\Services\Clientes;

use App\Models\Cliente;
use App\Models\User;
use App\Services\NotificacionService;
use App\Exceptions\Clientes\ClienteDuplicadoException;
use App\Exceptions\Clientes\ClienteConDependenciasException;
use App\Exceptions\Clientes\OperacionNoPermitidaException;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;
use Carbon\Carbon;

class ClienteService
{
    public function __construct(
        protected NotificacionService $notificacionService
    ) {}

    public function listarConFiltros(array $filtros, int $perPage = 20): LengthAwarePaginator
    {
        $query = Cliente::with(['zona', 'creador', 'referidoPor']);

        if (!empty($filtros['busqueda'])) {
            $query->buscar($filtros['busqueda']);
        }

        if (!empty($filtros['tipo']) && $filtros['tipo'] !== 'todos') {
            $query->where('tipo', $filtros['tipo']);
        }

        if (!empty($filtros['estado']) && $filtros['estado'] !== 'todos') {
            $query->where('estado', $filtros['estado']);
        }

        if (!empty($filtros['documento_tipo']) && $filtros['documento_tipo'] !== 'todos') {
            $query->where('documento_tipo', $filtros['documento_tipo']);
        }

        if (!empty($filtros['zona_id'])) {
            $query->where('zona_id', $filtros['zona_id']);
        }

        if (!empty($filtros['origen']) && $filtros['origen'] !== 'todos') {
            $query->where('origen', $filtros['origen']);
        }

        if (!empty($filtros['creado_desde'])) {
            $query->whereDate('created_at', '>=', $filtros['creado_desde']);
        }

        if (!empty($filtros['creado_hasta'])) {
            $query->whereDate('created_at', '<=', $filtros['creado_hasta']);
        }

        $allowedSorts = ['nombre_completo', 'documento_numero', 'created_at', 'estado'];
        $ordenarPor = in_array($filtros['ordenar_por'] ?? '', $allowedSorts) ? $filtros['ordenar_por'] : 'created_at';
        $direccion = in_array(strtolower($filtros['direccion'] ?? ''), ['asc', 'desc']) ? strtolower($filtros['direccion']) : 'desc';

        $query->orderBy($ordenarPor, $direccion);

        return $query->paginate($perPage);
    }

    public function obtenerCompleto(int $id): array
    {
        $cliente = Cliente::with(['zona', 'creador', 'referidoPor'])->findOrFail($id);

        $referidos = $cliente->referidos()
            ->select('id', 'nombre_completo', 'nombre_comercial', 'tipo', 'created_at')
            ->get();

        $antiguedad_meses = Carbon::parse($cliente->created_at)->diffInMonths(now());

        return [
            'cliente'     => $cliente,
            'referidos'   => $referidos,
            'estadisticas' => [
                'cantidad_proyectos'       => 0,
                'monto_total_contratado'   => 0,
                'antiguedad_meses'         => $antiguedad_meses,
            ],
        ];
    }

    public function crear(array $datos, int $actorId): Cliente
    {
        if ($datos['tipo'] === 'empresa' && $datos['documento_tipo'] !== 'nit') {
            throw ValidationException::withMessages(['documento_tipo' => 'Las empresas deben usar NIT como documento.']);
        }
        if ($datos['tipo'] === 'persona_natural' && $datos['documento_tipo'] === 'nit') {
            throw ValidationException::withMessages(['documento_tipo' => 'Las personas naturales no pueden usar NIT.']);
        }

        $existe = Cliente::where('documento_tipo', $datos['documento_tipo'])
                         ->where('documento_numero', $datos['documento_numero'])
                         ->exists();
        if ($existe) {
            throw new ClienteDuplicadoException($datos['documento_tipo'], $datos['documento_numero']);
        }

        if (!empty($datos['cliente_referido_por'])) {
            $referente = Cliente::find($datos['cliente_referido_por']);
            if (!$referente || in_array($referente->estado, ['bloqueado', 'inactivo'])) {
                throw ValidationException::withMessages(['cliente_referido_por' => 'El cliente referente no es válido o está bloqueado.']);
            }
        }

        return DB::transaction(function () use ($datos, $actorId) {
            $datos['usuario_creador_id'] = $actorId;
            if (empty($datos['estado'])) {
                $datos['estado'] = 'activo';
            }

            $cliente = Cliente::create($datos);

            return $cliente->load(['zona', 'creador', 'referidoPor']);
        });
    }

    public function actualizar(int $id, array $datos, int $actorId): Cliente
    {
        $cliente = Cliente::findOrFail($id);

        $nuevoTipo    = $datos['tipo'] ?? $cliente->tipo;
        $nuevoDocTipo = $datos['documento_tipo'] ?? $cliente->documento_tipo;

        if ($nuevoTipo === 'empresa' && $nuevoDocTipo !== 'nit') {
            throw ValidationException::withMessages(['documento_tipo' => 'Las empresas deben usar NIT como documento.']);
        }
        if ($nuevoTipo === 'persona_natural' && $nuevoDocTipo === 'nit') {
            throw ValidationException::withMessages(['documento_tipo' => 'Las personas naturales no pueden usar NIT.']);
        }

        if (isset($datos['documento_numero']) || isset($datos['documento_tipo'])) {
            $docNum = $datos['documento_numero'] ?? $cliente->documento_numero;
            $existe = Cliente::where('documento_tipo', $nuevoDocTipo)
                             ->where('documento_numero', $docNum)
                             ->where('id', '!=', $id)
                             ->exists();
            if ($existe) {
                throw new ClienteDuplicadoException($nuevoDocTipo, $docNum);
            }
        }

        unset($datos['usuario_creador_id'], $datos['estado']);

        $cliente->fill($datos);

        if (empty($cliente->getDirty())) {
            return $cliente;
        }

        return DB::transaction(function () use ($cliente) {
            $cliente->save();
            return $cliente->load(['zona', 'creador', 'referidoPor']);
        });
    }

    public function cambiarEstado(int $id, string $nuevoEstado, ?string $razon, int $actorId): Cliente
    {
        $cliente = Cliente::findOrFail($id);

        if ($cliente->estado === $nuevoEstado) {
            return $cliente;
        }

        $actor     = User::with('rol')->find($actorId);
        $esGerente = $actor && $actor->rol && $actor->rol->nombre === 'gerente';

        if (in_array('bloqueado', [$nuevoEstado, $cliente->estado]) && !$esGerente) {
            throw new OperacionNoPermitidaException('Solo el gerente puede bloquear o desbloquear un cliente.');
        }

        if ($nuevoEstado === 'bloqueado' && empty($razon)) {
            throw ValidationException::withMessages(['razon' => 'Debe especificar una razón al bloquear al cliente.']);
        }

        return DB::transaction(function () use ($cliente, $nuevoEstado, $razon) {
            $cliente->estado = $nuevoEstado;
            $cliente->save();

            if ($nuevoEstado === 'bloqueado') {
                $this->notificacionService->notificarAUsuariosConRol(
                    'gerente',
                    "Cliente bloqueado: {$cliente->nombre_visible}",
                    "El cliente ha sido bloqueado por: {$razon}",
                    'warning'
                );
            }

            return $cliente;
        });
    }

    public function eliminar(int $id, int $actorId, ?string $razon): bool
    {
        $cliente = Cliente::withCount('referidos')->findOrFail($id);

        if ($cliente->referidos_count > 0) {
            throw new ClienteConDependenciasException(
                "Este cliente refirió a {$cliente->referidos_count} clientes. Resuelve esas referencias antes de eliminar.",
                'referidos',
                $cliente->referidos_count
            );
        }

        return DB::transaction(function () use ($cliente) {
            $cliente->delete();

            $this->notificacionService->notificarAUsuariosConRol(
                'gerente',
                "Cliente eliminado",
                "El cliente {$cliente->nombre_visible} fue eliminado del sistema.",
                'info'
            );

            return true;
        });
    }

    public function restaurar(int $id, int $actorId): Cliente
    {
        $actor = User::with('rol')->find($actorId);
        if (!$actor || !$actor->rol || $actor->rol->nombre !== 'gerente') {
            throw new OperacionNoPermitidaException('Solo el gerente puede restaurar clientes eliminados.');
        }

        $cliente = Cliente::onlyTrashed()->findOrFail($id);

        return DB::transaction(function () use ($cliente) {
            $cliente->restore();
            return $cliente;
        });
    }

    public function obtenerEstadisticasGenerales(): array
    {
        $baseQuery = Cliente::query();
        $totalActivos     = (clone $baseQuery)->activos()->count();
        $totalInactivos   = (clone $baseQuery)->where('estado', 'inactivo')->count();
        $totalPotenciales = (clone $baseQuery)->where('estado', 'potencial')->count();
        $totalBloqueados  = (clone $baseQuery)->where('estado', 'bloqueado')->count();

        $totalPersonas = (clone $baseQuery)->personas()->count();
        $totalEmpresas = (clone $baseQuery)->empresas()->count();

        $creadosUltimoMes = (clone $baseQuery)->where('created_at', '>=', now()->subMonth())->count();

        $topReferentes = Cliente::withCount('referidos')
            ->having('referidos_count', '>', 0)
            ->orderBy('referidos_count', 'desc')
            ->limit(5)
            ->get(['id', 'nombre_completo', 'nombre_comercial', 'tipo']);

        $distribucionOrigen = DB::table('clientes')
            ->select('origen', DB::raw('count(*) as count'))
            ->whereNull('deleted_at')
            ->groupBy('origen')
            ->pluck('count', 'origen')
            ->toArray();

        return [
            'total_activos'              => $totalActivos,
            'total_inactivos'            => $totalInactivos,
            'total_potenciales'          => $totalPotenciales,
            'total_bloqueados'           => $totalBloqueados,
            'total_personas_naturales'   => $totalPersonas,
            'total_empresas'             => $totalEmpresas,
            'clientes_creados_ultimo_mes' => $creadosUltimoMes,
            'top_referentes'             => $topReferentes,
            'distribucion_origen'        => $distribucionOrigen,
        ];
    }
}
