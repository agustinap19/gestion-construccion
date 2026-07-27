<?php

namespace App\Services\Almacenes;

use App\Models\Almacen;
use App\Models\MovimientoMaterial;
use App\Models\StockMaterial;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Exception;

class AlmacenService
{
    private const ROLES_ACCESO_TOTAL = ['super_admin', 'gerente_general'];

    private function esAccesoTotal(?User $actor): bool
    {
        if (!$actor) return true;
        return in_array($actor->rol?->nombre, self::ROLES_ACCESO_TOTAL);
    }

    private function aplicarScopeUsuario(\Illuminate\Database\Eloquent\Builder $query, ?User $actor): void
    {
        if ($this->esAccesoTotal($actor)) return;
        $query->whereHas('responsable', fn($q) => $q->where('usuario_id', $actor->id));
    }

    private function idsPermitidos(?User $actor): ?array
    {
        if ($this->esAccesoTotal($actor)) return null;
        return Almacen::whereHas('responsable', fn($q) => $q->where('usuario_id', $actor->id))
            ->pluck('id')->toArray();
    }

    public function listarConFiltros(array $filtros, int $perPage = 15, ?User $actor = null): LengthAwarePaginator
    {
        $query = Almacen::with(['proyecto:id,nombre,codigo,estado', 'responsable:id,nombre,apellido_paterno']);

        $this->aplicarScopeUsuario($query, $actor);

        if (!empty($filtros['busqueda'])) {
            $b = $filtros['busqueda'];
            $query->where(function ($q) use ($b) {
                $q->where('nombre', 'like', "%{$b}%")
                  ->orWhere('codigo', 'like', "%{$b}%")
                  ->orWhere('ubicacion', 'like', "%{$b}%");
            });
        }

        if (!empty($filtros['tipo']) && $filtros['tipo'] !== 'todos') {
            $query->where('tipo', $filtros['tipo']);
        }

        if (!empty($filtros['estado']) && $filtros['estado'] !== 'todos') {
            $query->where('estado', $filtros['estado']);
        }

        if (!empty($filtros['proyecto_id'])) {
            $query->where('proyecto_id', $filtros['proyecto_id']);
        }

        return $query->orderBy('tipo')->orderBy('nombre')->paginate($perPage);
    }

    public function obtenerConStock(int $id): array
    {
        $almacen = Almacen::with([
            'proyecto:id,nombre,codigo,categoria',
            'responsable:id,nombre,apellido_paterno',
        ])->findOrFail($id);

        $stocks = StockMaterial::with([
            'material:id,nombre,codigo,imagen_url,marca,unidad_medida_id',
            'material.categoria:id,nombre,color',
            'material.unidadMedida:id,nombre,simbolo',
        ])
        ->where('almacen_id', $id)
        ->get()
        ->map(function ($s) {
            return [
                'id'                   => $s->id,
                'material'             => $s->material,
                'cantidad'             => (float) $s->cantidad,
                'cantidad_reservada'   => (float) $s->cantidad_reservada,
                'cantidad_en_transito' => (float) $s->cantidad_en_transito,
                'cantidad_disponible'  => (float) ($s->cantidad - $s->cantidad_reservada),
                'costo_promedio'       => (float) $s->costo_promedio,
                'stock_minimo_alerta'  => $s->stock_minimo_alerta !== null
                    ? (float) $s->stock_minimo_alerta
                    : (float) ($s->material->stock_minimo ?? 0),
                'ultimo_precio_entrada'   => (float) ($s->ultimo_precio_entrada ?? 0),
                'ultima_fecha_movimiento' => $s->ultima_fecha_movimiento,
                'valor_total'             => (float) ($s->cantidad * $s->costo_promedio),
                'estado_stock'            => $s->estado_stock,
            ];
        });

        $resumen = [
            'total_items'       => $stocks->count(),
            'valor_inventario'  => $stocks->sum('valor_total'),
            'items_criticos'    => $stocks->where('estado_stock', 'critico')->count() + $stocks->where('estado_stock', 'agotado')->count(),
        ];

        return compact('almacen', 'stocks', 'resumen');
    }

    public function crear(array $datos, int $actorId): Almacen
    {
        return DB::transaction(function () use ($datos, $actorId) {
            if (($datos['tipo'] ?? '') === 'central') {
                $this->validarSingletonCentral();
            }

            $datos['codigo'] = $datos['codigo'] ?? $this->generarCodigo($datos['tipo'] ?? 'obra');

            if (Almacen::where('codigo', $datos['codigo'])->exists()) {
                throw new Exception("El código '{$datos['codigo']}' ya está en uso.");
            }

            return Almacen::create([
                'codigo'              => $datos['codigo'],
                'nombre'              => $datos['nombre'],
                'descripcion'         => $datos['descripcion'] ?? null,
                'proyecto_id'         => $datos['proyecto_id'] ?? null,
                'ubicacion'           => $datos['ubicacion'] ?? null,
                'latitud'             => isset($datos['latitud'])  && $datos['latitud']  !== '' ? (float) $datos['latitud']  : null,
                'longitud'            => isset($datos['longitud']) && $datos['longitud'] !== '' ? (float) $datos['longitud'] : null,
                'tipo'                => $datos['tipo'] ?? 'obra',
                'estado'              => 'activo',
                'responsable_id'      => $datos['responsable_id'] ?? null,
                'capacidad_estimada'  => $datos['capacidad_estimada'] ?? null,
            ]);
        });
    }

    public function actualizar(int $id, array $datos, int $actorId): Almacen
    {
        $almacen = Almacen::findOrFail($id);

        // No se puede cambiar el tipo de un almacén central
        if ($almacen->tipo === 'central' && isset($datos['tipo']) && $datos['tipo'] !== 'central') {
            throw new Exception('No se puede cambiar el tipo del almacén central.');
        }

        $campos = [
            'nombre'             => $datos['nombre']             ?? $almacen->nombre,
            'descripcion'        => $datos['descripcion']        ?? $almacen->descripcion,
            'ubicacion'          => $datos['ubicacion']          ?? $almacen->ubicacion,
            'responsable_id'     => $datos['responsable_id']     ?? $almacen->responsable_id,
            'capacidad_estimada' => $datos['capacidad_estimada'] ?? $almacen->capacidad_estimada,
        ];

        if (array_key_exists('latitud', $datos)) {
            $campos['latitud']  = $datos['latitud']  !== '' && $datos['latitud']  !== null ? (float) $datos['latitud']  : null;
        }
        if (array_key_exists('longitud', $datos)) {
            $campos['longitud'] = $datos['longitud'] !== '' && $datos['longitud'] !== null ? (float) $datos['longitud'] : null;
        }

        $almacen->update(array_filter($campos, fn($v) => $v !== null));

        return $almacen->fresh();
    }

    public function cambiarEstado(int $id, string $estado, int $actorId): Almacen
    {
        $almacen = Almacen::findOrFail($id);

        if ($almacen->tipo === 'central') {
            throw new Exception('El almacén central no puede cambiar de estado.');
        }

        $almacen->update(['estado' => $estado]);
        return $almacen;
    }

    public function estadisticasResumen(?User $actor = null): array
    {
        $base = Almacen::query();
        $this->aplicarScopeUsuario($base, $actor);

        $total   = (clone $base)->count();
        $activos = (clone $base)->where('estado', 'activo')->count();
        $central = (clone $base)->where('tipo', 'central')->first();

        return compact('total', 'activos', 'central');
    }

    public function dashboard(?User $actor = null): array
    {
        $ids = $this->idsPermitidos($actor);

        $baseA = fn() => tap(Almacen::query(),      fn($q) => $ids !== null && $q->whereIn('id', $ids));
        $baseS = fn() => tap(StockMaterial::query(), fn($q) => $ids !== null && $q->whereIn('almacen_id', $ids));
        $baseM = fn() => tap(MovimientoMaterial::query(), fn($q) => $ids !== null && $q->whereIn('almacen_id', $ids));

        // ── KPIs ──────────────────────────────────────────────────────────────
        $total     = $baseA()->count();
        $activos   = $baseA()->where('estado', 'activo')->count();
        $inactivos = $baseA()->where('estado', 'inactivo')->count();
        $cerrados  = $baseA()->where('estado', 'cerrado')->count();

        $valorTotal = (float) ($baseS()->selectRaw('COALESCE(SUM(cantidad * costo_promedio), 0) as total')->first()?->total ?? 0);

        $itemsCriticos = $baseS()->whereRaw(
            '(cantidad - COALESCE(cantidad_reservada, 0)) <= COALESCE(stock_minimo_alerta, 0)'
        )->where('cantidad', '>', 0)->count();

        $itemsAgotados = $baseS()->where('cantidad', '<=', 0)->count();

        // ── Distribución por tipo ─────────────────────────────────────────────
        $porTipo = $baseA()->selectRaw('tipo, COUNT(*) as cantidad')
            ->groupBy('tipo')
            ->get()
            ->map(fn($r) => ['tipo' => $r->tipo, 'cantidad' => (int) $r->cantidad])
            ->values();

        // ── Movimientos últimos 3 meses ───────────────────────────────────────
        $mesesEsp = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        $desde    = Carbon::now()->subMonths(2)->startOfMonth();

        $movs = $baseM()->selectRaw(
            "DATE_FORMAT(fecha_movimiento, '%Y-%m') as mes,
             SUM(CASE WHEN tipo IN ('entrada','transferencia_entrada','ajuste_positivo','inventario_inicial') THEN 1 ELSE 0 END) as entradas,
             SUM(CASE WHEN tipo IN ('salida','transferencia_salida','ajuste_negativo') THEN 1 ELSE 0 END) as salidas"
        )
        ->where('fecha_movimiento', '>=', $desde)
        ->groupBy('mes')
        ->get()
        ->keyBy('mes');

        $movimientosPorMes = [];
        for ($i = 2; $i >= 0; $i--) {
            $d   = Carbon::now()->subMonths($i);
            $key = $d->format('Y-m');
            $movimientosPorMes[] = [
                'mes'      => $key,
                'label'    => $mesesEsp[(int) $d->format('m')],
                'entradas' => (int) ($movs[$key]?->entradas ?? 0),
                'salidas'  => (int) ($movs[$key]?->salidas ?? 0),
            ];
        }

        // ── Top 5 materiales por valor ────────────────────────────────────────
        $topMateriales = $baseS()->selectRaw(
            'material_id, SUM(cantidad * costo_promedio) as valor_total, SUM(cantidad) as cantidad_total'
        )
        ->with('material:id,nombre,codigo')
        ->where('cantidad', '>', 0)
        ->groupBy('material_id')
        ->orderByDesc('valor_total')
        ->limit(5)
        ->get()
        ->map(fn($s) => [
            'nombre'      => $s->material?->nombre ?? 'Sin nombre',
            'codigo'      => $s->material?->codigo ?? '',
            'valor_total' => round((float) $s->valor_total, 2),
        ])
        ->values();

        // ── Stocks críticos (tabla de alerta) ─────────────────────────────────
        $stocksCriticos = $baseS()->with([
            'material:id,nombre,codigo,unidad_medida_id',
            'material.unidadMedida:id,simbolo',
            'almacen:id,nombre',
        ])
        ->whereRaw('(cantidad - COALESCE(cantidad_reservada, 0)) <= COALESCE(stock_minimo_alerta, 0)')
        ->where('cantidad', '>', 0)
        ->orderByRaw('(cantidad - COALESCE(cantidad_reservada, 0)) ASC')
        ->limit(8)
        ->get()
        ->map(fn($s) => [
            'material'   => $s->material?->nombre ?? 'Desconocido',
            'codigo'     => $s->material?->codigo ?? '',
            'almacen'    => $s->almacen?->nombre ?? 'Desconocido',
            'disponible' => max(0, round((float) ($s->cantidad - $s->cantidad_reservada), 2)),
            'minimo'     => round((float) ($s->stock_minimo_alerta ?? 0), 2),
            'unidad'     => $s->material?->unidadMedida?->simbolo ?? '',
            'estado'     => $s->estado_stock,
        ])
        ->values();

        // ── Resumen por almacén ───────────────────────────────────────────────
        $almacenesData  = $baseA()->with(['proyecto:id,nombre'])->get();
        $almacenIds     = $almacenesData->pluck('id');

        $stockPorAlmacen = StockMaterial::selectRaw(
            'almacen_id,
             COUNT(*) as total_items,
             COALESCE(SUM(cantidad * costo_promedio), 0) as valor_inventario,
             SUM(CASE WHEN (cantidad - COALESCE(cantidad_reservada,0)) <= COALESCE(stock_minimo_alerta,0) AND cantidad > 0 THEN 1 ELSE 0 END) as items_criticos'
        )
        ->whereIn('almacen_id', $almacenIds)
        ->where('cantidad', '>', 0)
        ->groupBy('almacen_id')
        ->get()
        ->keyBy('almacen_id');

        $almacenesResumen = $almacenesData->map(fn($a) => [
            'id'               => $a->id,
            'nombre'           => $a->nombre,
            'codigo'           => $a->codigo,
            'tipo'             => $a->tipo,
            'estado'           => $a->estado,
            'ubicacion'        => $a->ubicacion,
            'latitud'          => $a->latitud  !== null ? (float) $a->latitud  : null,
            'longitud'         => $a->longitud !== null ? (float) $a->longitud : null,
            'proyecto'         => $a->proyecto?->nombre,
            'total_items'      => (int)   ($stockPorAlmacen[$a->id]?->total_items      ?? 0),
            'valor_inventario' => round((float) ($stockPorAlmacen[$a->id]?->valor_inventario ?? 0), 2),
            'items_criticos'   => (int)   ($stockPorAlmacen[$a->id]?->items_criticos   ?? 0),
        ])->values();

        return [
            'kpis' => [
                'total'          => $total,
                'activos'        => $activos,
                'inactivos'      => $inactivos,
                'cerrados'       => $cerrados,
                'valor_total'    => round($valorTotal, 2),
                'items_criticos' => $itemsCriticos,
                'items_agotados' => $itemsAgotados,
            ],
            'por_tipo'            => $porTipo,
            'movimientos_por_mes' => $movimientosPorMes,
            'top_materiales'      => $topMateriales,
            'stocks_criticos'     => $stocksCriticos,
            'almacenes_resumen'   => $almacenesResumen,
        ];
    }

    private function validarSingletonCentral(): void
    {
        if (Almacen::where('tipo', 'central')->exists()) {
            throw new Exception('Solo puede existir un almacén central en el sistema.');
        }
    }

    private function generarCodigo(string $tipo): string
    {
        $prefijo = $tipo === 'central' ? 'ALM-C' : ($tipo === 'temporal' ? 'ALM-T' : 'ALM');
        $ultimo  = Almacen::withTrashed()
            ->where('codigo', 'like', "{$prefijo}-%")
            ->orderByRaw('LENGTH(codigo) DESC, codigo DESC')
            ->value('codigo');

        if ($ultimo) {
            $numero = (int) substr($ultimo, strlen($prefijo) + 1);
            return $prefijo . '-' . str_pad($numero + 1, 4, '0', STR_PAD_LEFT);
        }

        return $prefijo . '-0001';
    }
}
