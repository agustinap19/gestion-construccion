<?php

namespace App\Services\Almacenes;

use App\Models\CategoriaConstructiva;
use App\Models\ItemConstructivo;
use App\Models\RecetaItem;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Exception;

class BibliotecaConstructivaService
{
    // ─── Categorías Constructivas ────────────────────────────────────────────

    public function listarCategorias(): array
    {
        return CategoriaConstructiva::orderBy('orden')->orderBy('nombre')->get()->toArray();
    }

    public function crearCategoria(array $datos): CategoriaConstructiva
    {
        return CategoriaConstructiva::create([
            'nombre'      => $datos['nombre'],
            'color'       => $datos['color'] ?? '#6366f1',
            'orden'       => $datos['orden'] ?? 0,
            'descripcion' => $datos['descripcion'] ?? null,
            'estado'      => $datos['estado'] ?? true,
        ]);
    }

    public function actualizarCategoria(int $id, array $datos): CategoriaConstructiva
    {
        $cat = CategoriaConstructiva::findOrFail($id);
        $cat->update(array_filter([
            'nombre'      => $datos['nombre']      ?? $cat->nombre,
            'color'       => $datos['color']       ?? $cat->color,
            'orden'       => $datos['orden']        ?? $cat->orden,
            'descripcion' => $datos['descripcion'] ?? $cat->descripcion,
            'estado'      => $datos['estado']       ?? $cat->estado,
        ], fn($v) => $v !== null));
        return $cat->fresh();
    }

    public function eliminarCategoria(int $id): void
    {
        $cat = CategoriaConstructiva::findOrFail($id);
        if ($cat->itemsConstructivos()->exists()) {
            throw new Exception('No se puede eliminar: hay ítems constructivos en esta categoría.');
        }
        $cat->delete();
    }

    // ─── Ítems Constructivos ─────────────────────────────────────────────────

    public function listarItems(array $filtros, int $perPage = 20): LengthAwarePaginator
    {
        $q = ItemConstructivo::with([
            'categoria:id,nombre,color',
            'recetas.material:id,nombre,codigo',
            'recetas.material.unidadMedida:id,simbolo',
        ]);

        if (!empty($filtros['busqueda'])) {
            $b = $filtros['busqueda'];
            $q->where(fn($sq) => $sq
                ->where('nombre', 'like', "%{$b}%")
                ->orWhere('codigo', 'like', "%{$b}%")
                ->orWhere('descripcion', 'like', "%{$b}%")
            );
        }

        if (!empty($filtros['categoria_id'])) {
            $q->where('categoria_constructiva_id', $filtros['categoria_id']);
        }

        if (!empty($filtros['unidad_base']) && $filtros['unidad_base'] !== 'todas') {
            $q->where('unidad_base', $filtros['unidad_base']);
        }

        if (isset($filtros['estado']) && $filtros['estado'] !== 'todos') {
            $q->where('estado', (bool) $filtros['estado']);
        }

        return $q->orderBy('categoria_constructiva_id')->orderBy('codigo')->paginate($perPage);
    }

    public function obtenerItem(int $id): ItemConstructivo
    {
        return ItemConstructivo::with([
            'categoria:id,nombre,color',
            'recetas.material:id,nombre,codigo,precio_referencial',
            'recetas.material.unidadMedida:id,nombre,simbolo',
        ])->findOrFail($id);
    }

    public function crearItem(array $datos, int $actorId): ItemConstructivo
    {
        return DB::transaction(function () use ($datos, $actorId) {
            $codigo = $datos['codigo'] ?? ItemConstructivo::generarCodigo();

            if (ItemConstructivo::where('codigo', $codigo)->exists()) {
                throw new Exception("El código '{$codigo}' ya está en uso.");
            }

            $item = ItemConstructivo::create([
                'codigo'                      => $codigo,
                'nombre'                      => $datos['nombre'],
                'descripcion'                 => $datos['descripcion'] ?? null,
                'categoria_constructiva_id'   => $datos['categoria_constructiva_id'],
                'unidad_base'                 => $datos['unidad_base'],
                'rendimiento_horas_hombre'    => $datos['rendimiento_horas_hombre'] ?? null,
                'precio_unitario_referencial' => $datos['precio_unitario_referencial'] ?? null,
                'estado'                      => $datos['estado'] ?? true,
                'usuario_creador_id'          => $actorId,
            ]);

            if (!empty($datos['receta'])) {
                $this->sincronizarReceta($item->id, $datos['receta']);
            }

            $this->recalcularPrecioReferencial($item);

            return $item->fresh(['categoria', 'recetas.material.unidadMedida']);
        });
    }

    public function actualizarItem(int $id, array $datos, int $actorId): ItemConstructivo
    {
        return DB::transaction(function () use ($id, $datos, $actorId) {
            $item = ItemConstructivo::findOrFail($id);

            if (isset($datos['codigo']) && $datos['codigo'] !== $item->codigo) {
                if (ItemConstructivo::where('codigo', $datos['codigo'])->where('id', '!=', $id)->exists()) {
                    throw new Exception("El código '{$datos['codigo']}' ya está en uso.");
                }
            }

            $item->update(array_filter([
                'codigo'                      => $datos['codigo']                      ?? $item->codigo,
                'nombre'                      => $datos['nombre']                      ?? $item->nombre,
                'descripcion'                 => $datos['descripcion']                 ?? $item->descripcion,
                'categoria_constructiva_id'   => $datos['categoria_constructiva_id']   ?? $item->categoria_constructiva_id,
                'unidad_base'                 => $datos['unidad_base']                 ?? $item->unidad_base,
                'rendimiento_horas_hombre'    => $datos['rendimiento_horas_hombre']    ?? $item->rendimiento_horas_hombre,
                'precio_unitario_referencial' => $datos['precio_unitario_referencial'] ?? $item->precio_unitario_referencial,
                'estado'                      => $datos['estado']                      ?? $item->estado,
                'usuario_actualizador_id'     => $actorId,
            ], fn($v) => $v !== null));

            if (isset($datos['receta'])) {
                $this->sincronizarReceta($item->id, $datos['receta']);
            }

            $this->recalcularPrecioReferencial($item);

            return $item->fresh(['categoria', 'recetas.material.unidadMedida']);
        });
    }

    public function cambiarEstado(int $id, bool $estado, int $actorId): ItemConstructivo
    {
        $item = ItemConstructivo::findOrFail($id);
        $item->update(['estado' => $estado, 'usuario_actualizador_id' => $actorId]);
        return $item;
    }

    public function eliminarItem(int $id): void
    {
        $item = ItemConstructivo::findOrFail($id);
        if ($item->presupuestoItems()->exists()) {
            throw new Exception('No se puede eliminar: el ítem está en uso en proyectos.');
        }
        $item->recetas()->delete();
        $item->delete();
    }

    // ─── Receta paramétrica ──────────────────────────────────────────────────

    public function sincronizarReceta(int $itemId, array $ingredientes): void
    {
        $materialIds = array_column($ingredientes, 'material_id');
        if (count($materialIds) !== count(array_unique($materialIds))) {
            throw new Exception('La receta contiene materiales duplicados.');
        }

        RecetaItem::where('item_constructivo_id', $itemId)->delete();

        foreach ($ingredientes as $ing) {
            if ((float) ($ing['cantidad_por_unidad_base'] ?? 0) <= 0) {
                throw new Exception("La cantidad por unidad base del material ID {$ing['material_id']} debe ser mayor a cero.");
            }
            RecetaItem::create([
                'item_constructivo_id'     => $itemId,
                'material_id'              => $ing['material_id'],
                'cantidad_por_unidad_base' => $ing['cantidad_por_unidad_base'],
                'unidad_material'          => $ing['unidad_material'] ?? null,
                'notas'                    => $ing['notas'] ?? null,
            ]);
        }
    }

    // ─── Importación masiva ──────────────────────────────────────────────────

    public function importarDesdeArray(array $filas, int $actorId): array
    {
        $creados  = 0;
        $actualizados = 0;
        $errores  = [];

        DB::transaction(function () use ($filas, $actorId, &$creados, &$actualizados, &$errores) {
            foreach ($filas as $i => $fila) {
                $fila_num = $i + 2;
                try {
                    $cat = CategoriaConstructiva::where('nombre', $fila['categoria'] ?? '')->first();
                    if (!$cat) {
                        $errores[] = "Fila {$fila_num}: Categoría '{$fila['categoria']}' no existe.";
                        continue;
                    }

                    $unidades = ['m3', 'm2', 'ml', 'pza', 'glb', 'kg'];
                    if (!in_array($fila['unidad_base'] ?? '', $unidades)) {
                        $errores[] = "Fila {$fila_num}: Unidad base '{$fila['unidad_base']}' inválida. Use: " . implode(', ', $unidades);
                        continue;
                    }

                    $existente = !empty($fila['codigo'])
                        ? ItemConstructivo::where('codigo', $fila['codigo'])->first()
                        : null;

                    if ($existente) {
                        $existente->update([
                            'nombre'                    => $fila['nombre'],
                            'descripcion'               => $fila['descripcion'] ?? null,
                            'categoria_constructiva_id' => $cat->id,
                            'unidad_base'               => $fila['unidad_base'],
                            'usuario_actualizador_id'   => $actorId,
                        ]);
                        $actualizados++;
                    } else {
                        $codigo = !empty($fila['codigo']) ? $fila['codigo'] : ItemConstructivo::generarCodigo();
                        ItemConstructivo::create([
                            'codigo'                    => $codigo,
                            'nombre'                    => $fila['nombre'],
                            'descripcion'               => $fila['descripcion'] ?? null,
                            'categoria_constructiva_id' => $cat->id,
                            'unidad_base'               => $fila['unidad_base'],
                            'estado'                    => true,
                            'usuario_creador_id'        => $actorId,
                        ]);
                        $creados++;
                    }
                } catch (\Throwable $e) {
                    $errores[] = "Fila {$fila_num}: " . $e->getMessage();
                }
            }
        });

        return compact('creados', 'actualizados', 'errores');
    }

    // ─── Privados ────────────────────────────────────────────────────────────

    private function recalcularPrecioReferencial(ItemConstructivo $item): void
    {
        $total = RecetaItem::with('material:id,precio_referencial')
            ->where('item_constructivo_id', $item->id)
            ->get()
            ->sum(fn($r) => (float) $r->cantidad_por_unidad_base * (float) ($r->material?->precio_referencial ?? 0));

        if ($total > 0) {
            $item->update(['precio_unitario_referencial' => $total]);
        }
    }
}
