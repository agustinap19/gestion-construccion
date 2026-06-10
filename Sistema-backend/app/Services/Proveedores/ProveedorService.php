<?php

namespace App\Services\Proveedores;

use App\Models\Proveedor;
use App\Models\CategoriaProveedor;
use App\Models\MovimientoAlmacen;
use App\Models\ZonaGeografica;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Exception;

class ProveedorService
{
    public function listarConFiltros(array $filtros, int $perPage = 15): LengthAwarePaginator
    {
        $query = Proveedor::with(['categoria:id,nombre', 'zona:id,nombre,departamento']);

        if (!empty($filtros['busqueda'])) {
            $query->buscar($filtros['busqueda']);
        }

        if (!empty($filtros['estado']) && $filtros['estado'] !== 'todos') {
            $query->where('estado', $filtros['estado']);
        }

        if (!empty($filtros['tipo']) && $filtros['tipo'] !== 'todos') {
            $query->where('tipo', $filtros['tipo']);
        }

        if (!empty($filtros['categoria_id'])) {
            $query->where('categoria_id', $filtros['categoria_id']);
        }

        return $query->orderBy('razon_social')->paginate($perPage);
    }

    public function obtener(int $id): array
    {
        $proveedor = Proveedor::with([
            'categoria:id,nombre,descripcion',
            'zona:id,nombre,departamento,provincia,municipio',
            'registradoPor:id,nombre,apellido_paterno',
        ])->findOrFail($id);

        $totalCompras = MovimientoAlmacen::where('proveedor_id', $id)
            ->where('tipo', 'entrada_compra')
            ->where('estado', 'completado')
            ->count();

        $montoTotalCompras = (float) MovimientoAlmacen::where('proveedor_id', $id)
            ->where('tipo', 'entrada_compra')
            ->where('estado', 'completado')
            ->sum('monto_total');

        $ultimaCompra = MovimientoAlmacen::where('proveedor_id', $id)
            ->where('tipo', 'entrada_compra')
            ->orderByDesc('fecha_movimiento')
            ->value('fecha_movimiento');

        return array_merge($proveedor->toArray(), [
            'total_compras'       => $totalCompras,
            'monto_total_compras' => round($montoTotalCompras, 2),
            'ultima_compra'       => $ultimaCompra,
        ]);
    }

    public function crear(array $datos, int $actorId): Proveedor
    {
        return DB::transaction(function () use ($datos, $actorId) {
            $datos['codigo']            = $datos['codigo'] ?? $this->generarCodigo();
            $datos['registrado_por_id'] = $actorId;

            if (Proveedor::where('codigo', $datos['codigo'])->exists()) {
                throw new Exception("El código '{$datos['codigo']}' ya está en uso.");
            }

            if (!empty($datos['nit']) && Proveedor::where('nit', $datos['nit'])->exists()) {
                throw new Exception("El NIT '{$datos['nit']}' ya está registrado.");
            }

            return Proveedor::create($datos);
        });
    }

    public function actualizar(int $id, array $datos): Proveedor
    {
        $proveedor = Proveedor::findOrFail($id);

        if (!empty($datos['nit']) && $datos['nit'] !== $proveedor->nit) {
            if (Proveedor::where('nit', $datos['nit'])->where('id', '!=', $id)->exists()) {
                throw new Exception("El NIT '{$datos['nit']}' ya está registrado.");
            }
        }

        $proveedor->update($datos);
        return $proveedor->fresh(['categoria:id,nombre', 'zona:id,nombre,departamento']);
    }

    public function cambiarEstado(int $id, string $estado): Proveedor
    {
        $proveedor = Proveedor::findOrFail($id);
        $proveedor->update(['estado' => $estado]);
        return $proveedor;
    }

    public function estadisticas(): array
    {
        $total    = Proveedor::count();
        $activos  = Proveedor::where('estado', 'activo')->count();
        $inactivos = Proveedor::where('estado', 'inactivo')->count();
        $bloqueados = Proveedor::where('estado', 'bloqueado')->count();

        $porTipo = Proveedor::selectRaw('tipo, COUNT(*) as cantidad')
            ->groupBy('tipo')
            ->pluck('cantidad', 'tipo');

        $porCategoria = Proveedor::selectRaw('categoria_id, COUNT(*) as cantidad')
            ->with('categoria:id,nombre')
            ->groupBy('categoria_id')
            ->get()
            ->map(fn($r) => [
                'categoria' => $r->categoria?->nombre ?? 'Sin categoría',
                'cantidad'  => (int) $r->cantidad,
            ])
            ->values();

        $calificacionPromedio = round((float) (Proveedor::whereNotNull('calificacion')->avg('calificacion') ?? 0), 2);

        $totalEntradas = MovimientoAlmacen::where('tipo', 'entrada_compra')
            ->whereNotNull('proveedor_id')
            ->distinct('proveedor_id')
            ->count('proveedor_id');

        return compact('total', 'activos', 'inactivos', 'bloqueados', 'porTipo', 'porCategoria', 'calificacionPromedio', 'totalEntradas');
    }

    public function categorias(): array
    {
        return CategoriaProveedor::orderBy('nombre')->get(['id', 'nombre', 'descripcion'])->toArray();
    }

    public function crearCategoria(string $nombre, ?string $descripcion = null): CategoriaProveedor
    {
        return CategoriaProveedor::create(['nombre' => $nombre, 'descripcion' => $descripcion]);
    }

    public function zonas(): array
    {
        return ZonaGeografica::where('estado', 'activa')->orderBy('nombre')->get(['id', 'nombre', 'departamento', 'municipio'])->toArray();
    }

    private function generarCodigo(): string
    {
        $ultimo = Proveedor::withTrashed()
            ->where('codigo', 'like', 'PROV-%')
            ->orderByRaw('LENGTH(codigo) DESC, codigo DESC')
            ->value('codigo');

        if ($ultimo) {
            $numero = (int) substr($ultimo, 5);
            return 'PROV-' . str_pad($numero + 1, 4, '0', STR_PAD_LEFT);
        }

        return 'PROV-0001';
    }
}
