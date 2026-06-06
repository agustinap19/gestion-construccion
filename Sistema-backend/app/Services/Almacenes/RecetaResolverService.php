<?php

namespace App\Services\Almacenes;

use App\Models\OverrideItemProyecto;
use App\Models\RecetaItem;
use Illuminate\Support\Collection;

/**
 * Servicio canónico de resolución de receta.
 *
 * NADIE debe leer recetas_item directamente en contexto de proyecto.
 * Todo pasa por aquí.
 *
 * Jerarquía (mayor → menor precedencia):
 *   1. Override vivienda específica  (overrides_items_proyecto, nivel='vivienda', vivienda_id=X)
 *   2. Override tipología del proyecto (overrides_items_proyecto, nivel='tipologia', vivienda_id=NULL)
 *   3. Receta global (recetas_item)
 */
class RecetaResolverService
{
    /**
     * Resuelve la receta completa para un ítem en contexto de proyecto/vivienda.
     *
     * @param int      $itemConstructivoId
     * @param int      $proyectoId
     * @param int|null $viviendaId  NULL = item sin vivienda (obra común)
     * @return Collection<int, array{
     *   material_id: int,
     *   cantidad_por_unidad_base: float,
     *   fuente: string,          // 'vivienda' | 'tipologia' | 'global'
     *   unidad_material: string,
     *   material: \App\Models\Material|null
     * }>
     */
    public function resolver(int $itemConstructivoId, int $proyectoId, ?int $viviendaId): Collection
    {
        // ── Bulk-load en máx. 3 queries (sin N+1) ──────────────────────────────

        // 1. Override de vivienda específica
        $overridesVivienda = $viviendaId
            ? OverrideItemProyecto::with([
                'material:id,nombre,codigo,unidad_medida_id',
                'material.unidadMedida:id,simbolo',
              ])
              ->where('proyecto_id',          $proyectoId)
              ->where('item_constructivo_id', $itemConstructivoId)
              ->where('nivel',                'vivienda')
              ->where('vivienda_id',          $viviendaId)
              ->get()
              ->keyBy('material_id')
            : collect();

        // 2. Override de tipología
        $overridesTipo = OverrideItemProyecto::with([
                'material:id,nombre,codigo,unidad_medida_id',
                'material.unidadMedida:id,simbolo',
              ])
              ->where('proyecto_id',          $proyectoId)
              ->where('item_constructivo_id', $itemConstructivoId)
              ->where('nivel',                'tipologia')
              ->whereNull('vivienda_id')
              ->get()
              ->keyBy('material_id');

        // 3. Receta global
        $recetaGlobal = RecetaItem::with([
                'material:id,nombre,codigo,unidad_medida_id',
                'material.unidadMedida:id,simbolo',
              ])
              ->where('item_constructivo_id', $itemConstructivoId)
              ->get()
              ->keyBy('material_id');

        // ── Unión de todos los material_ids ────────────────────────────────────
        $allIds = $recetaGlobal->keys()
            ->merge($overridesTipo->keys())
            ->merge($overridesVivienda->keys())
            ->unique();

        return $allIds->map(function (int $matId) use ($overridesVivienda, $overridesTipo, $recetaGlobal) {
            if ($overridesVivienda->has($matId)) {
                $ov = $overridesVivienda[$matId];
                return [
                    'material_id'              => $matId,
                    'cantidad_por_unidad_base' => (float) $ov->cantidad_por_unidad_base,
                    'fuente'                   => 'vivienda',
                    'unidad_material'          => $ov->material?->unidadMedida?->simbolo ?? '',
                    'material'                 => $ov->material,
                ];
            }
            if ($overridesTipo->has($matId)) {
                $ov = $overridesTipo[$matId];
                return [
                    'material_id'              => $matId,
                    'cantidad_por_unidad_base' => (float) $ov->cantidad_por_unidad_base,
                    'fuente'                   => 'tipologia',
                    'unidad_material'          => $ov->material?->unidadMedida?->simbolo ?? '',
                    'material'                 => $ov->material,
                ];
            }
            $r = $recetaGlobal[$matId];
            return [
                'material_id'              => $matId,
                'cantidad_por_unidad_base' => (float) $r->cantidad_por_unidad_base,
                'fuente'                   => 'global',
                'unidad_material'          => $r->unidad_material ?? $r->material?->unidadMedida?->simbolo ?? '',
                'material'                 => $r->material,
            ];
        })->values();
    }

    /**
     * Devuelve solo el coeficiente por material_id (para cálculos numéricos).
     * Conveniente para reemplazar el viejo getRecetaEfectiva().
     */
    public function resolverComoArray(int $itemConstructivoId, int $proyectoId, ?int $viviendaId): array
    {
        return $this->resolver($itemConstructivoId, $proyectoId, $viviendaId)
            ->pluck('cantidad_por_unidad_base', 'material_id')
            ->toArray();
    }

    /**
     * Devuelve el coeficiente para un material específico.
     * Retorna 0.0 si el material no está en la receta efectiva.
     */
    public function resolverMaterial(int $itemConstructivoId, int $proyectoId, ?int $viviendaId, int $materialId): float
    {
        return (float) ($this->resolverComoArray($itemConstructivoId, $proyectoId, $viviendaId)[$materialId] ?? 0.0);
    }
}
