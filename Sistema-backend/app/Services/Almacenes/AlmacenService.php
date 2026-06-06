<?php

namespace App\Services\Almacenes;

use App\Models\Almacen;
use App\Models\StockMaterial;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Exception;

class AlmacenService
{
    public function listarConFiltros(array $filtros, int $perPage = 15): LengthAwarePaginator
    {
        $query = Almacen::with(['proyecto:id,nombre,codigo,estado', 'responsable:id,nombre,apellido_paterno']);

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

        $almacen->update(array_filter([
            'nombre'             => $datos['nombre']             ?? $almacen->nombre,
            'descripcion'        => $datos['descripcion']        ?? $almacen->descripcion,
            'ubicacion'          => $datos['ubicacion']          ?? $almacen->ubicacion,
            'responsable_id'     => $datos['responsable_id']     ?? $almacen->responsable_id,
            'capacidad_estimada' => $datos['capacidad_estimada'] ?? $almacen->capacidad_estimada,
        ], fn($v) => $v !== null));

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

    public function estadisticasResumen(): array
    {
        $total   = Almacen::count();
        $activos = Almacen::where('estado', 'activo')->count();
        $central = Almacen::where('tipo', 'central')->first();

        return compact('total', 'activos', 'central');
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
