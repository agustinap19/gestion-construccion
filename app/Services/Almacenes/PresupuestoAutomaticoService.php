<?php

namespace App\Services\Almacenes;

use App\Models\ItemConstructivo;
use App\Models\Material;
use App\Models\OverrideRecetaProyecto;
use App\Models\PlantillaConstructiva;
use App\Models\PresupuestoItemProyecto;
use App\Models\PresupuestoMaterialDistribucion;
use App\Models\PresupuestoMaterialProyecto;
use App\Models\RecetaItem;
use Illuminate\Support\Facades\DB;
use Exception;

class PresupuestoAutomaticoService
{
    /**
     * Genera el presupuesto completo de items y el consolidado de materiales para un proyecto.
     * Para sociales: recibe array de [plantilla_id, vivienda_id, cantidad_planificada] por item.
     * Para privados: recibe plantilla_id + cantidades por item.
     */
    public function generarDesde(int $proyectoId, array $itemsData, int $actorId): array
    {
        return DB::transaction(function () use ($proyectoId, $itemsData, $actorId) {
            // Limpiar presupuesto anterior si existiera
            PresupuestoItemProyecto::where('proyecto_id', $proyectoId)->delete();

            $presupuestoItems = [];
            foreach ($itemsData as $dato) {
                $pip = PresupuestoItemProyecto::create([
                    'proyecto_id'           => $proyectoId,
                    'vivienda_id'           => $dato['vivienda_id'] ?? null,
                    'item_constructivo_id'  => $dato['item_constructivo_id'],
                    'cantidad_planificada'  => $dato['cantidad_planificada'],
                    'producto_contractual_id' => $dato['producto_contractual_id'] ?? null,
                    'fase_id'               => $dato['fase_id'] ?? null,
                    'orden'                 => $dato['orden'] ?? 0,
                    'ponderacion_avance'    => $dato['ponderacion_avance'] ?? 0,
                    'estado_ejecucion'      => 'pendiente',
                    'porcentaje_avance'     => 0,
                    'tiene_override_receta' => false,
                    'metadata'              => ['generado_en' => now()->toISOString(), 'actor_id' => $actorId],
                ]);
                $presupuestoItems[] = $pip;
            }

            $consolidado = $this->calcularConsolidado($proyectoId, $presupuestoItems, $actorId);

            return [
                'items_generados'       => count($presupuestoItems),
                'materiales_calculados' => count($consolidado),
                'consolidado'           => $consolidado,
            ];
        });
    }

    /**
     * Genera presupuesto a partir de plantilla para proyecto social.
     * $tipologias = [['plantilla_id' => X, 'viviendas' => [id1, id2, ...]], ...]
     */
    public function generarDesdePlantillaSocial(int $proyectoId, array $tipologias, int $actorId): array
    {
        $itemsData = [];

        foreach ($tipologias as $tipologia) {
            $plantilla = PlantillaConstructiva::with('items.itemConstructivo.receta')->findOrFail($tipologia['plantilla_id']);

            foreach ($tipologia['viviendas'] as $viviendaId) {
                foreach ($plantilla->items as $itemPlantilla) {
                    $itemsData[] = [
                        'vivienda_id'           => $viviendaId,
                        'item_constructivo_id'  => $itemPlantilla->item_constructivo_id,
                        'cantidad_planificada'  => $itemPlantilla->cantidad_sugerida ?? 1,
                        'orden'                 => $itemPlantilla->orden,
                        'ponderacion_avance'    => $itemPlantilla->ponderacion_avance,
                        'producto_contractual_id' => $tipologia['producto_contractual_id'] ?? null,
                    ];
                }
            }
        }

        return $this->generarDesde($proyectoId, $itemsData, $actorId);
    }

    /**
     * Genera presupuesto a partir de plantilla para proyecto privado.
     * $cantidades = [['item_constructivo_id' => X, 'cantidad_planificada' => Y, 'fase_id' => Z]]
     */
    public function generarDesdePlantillaPrivado(int $proyectoId, int $plantillaId, array $cantidades, int $actorId): array
    {
        $plantilla = PlantillaConstructiva::with('items')->findOrFail($plantillaId);
        $cantPorItem = collect($cantidades)->keyBy('item_constructivo_id');

        $itemsData = [];
        foreach ($plantilla->items as $itemPlantilla) {
            $override = $cantPorItem->get($itemPlantilla->item_constructivo_id);
            $itemsData[] = [
                'vivienda_id'          => null,
                'item_constructivo_id' => $itemPlantilla->item_constructivo_id,
                'cantidad_planificada' => $override['cantidad_planificada'] ?? $itemPlantilla->cantidad_sugerida ?? 1,
                'orden'                => $itemPlantilla->orden,
                'ponderacion_avance'   => $itemPlantilla->ponderacion_avance,
                'fase_id'              => $override['fase_id'] ?? null,
            ];
        }

        return $this->generarDesde($proyectoId, $itemsData, $actorId);
    }

    /**
     * Recalcula el consolidado de materiales para un proyecto.
     * Llama cuando hay cambios en items o overrides.
     */
    public function recalcularConsolidado(int $proyectoId, int $actorId): array
    {
        return DB::transaction(function () use ($proyectoId, $actorId) {
            $items = PresupuestoItemProyecto::where('proyecto_id', $proyectoId)
                ->with(['itemConstructivo.receta', 'overrides'])
                ->get();

            return $this->calcularConsolidado($proyectoId, $items->all(), $actorId);
        });
    }

    /**
     * Aplica un override de receta a un ítem específico y recalcula.
     */
    public function aplicarOverride(int $presupuestoItemId, array $overrides, string $justificacion, int $autorizadorId): PresupuestoItemProyecto
    {
        return DB::transaction(function () use ($presupuestoItemId, $overrides, $justificacion, $autorizadorId) {
            $pip = PresupuestoItemProyecto::findOrFail($presupuestoItemId);

            OverrideRecetaProyecto::where('presupuesto_item_proyecto_id', $presupuestoItemId)->delete();

            foreach ($overrides as $ov) {
                OverrideRecetaProyecto::create([
                    'presupuesto_item_proyecto_id' => $presupuestoItemId,
                    'material_id'                  => $ov['material_id'],
                    'cantidad_por_unidad_base'     => $ov['cantidad_por_unidad_base'],
                    'justificacion'                => $justificacion,
                    'usuario_autorizador_id'       => $autorizadorId,
                ]);
            }

            $pip->update(['tiene_override_receta' => true]);

            $this->recalcularConsolidado($pip->proyecto_id, $autorizadorId);

            return $pip->fresh();
        });
    }

    /**
     * Bloquea el presupuesto del proyecto. Solo gerente puede.
     */
    public function bloquear(int $proyectoId, int $actorId): void
    {
        PresupuestoMaterialProyecto::where('proyecto_id', $proyectoId)
            ->update([
                'bloqueado'       => true,
                'bloqueado_por_id' => $actorId,
                'bloqueado_en'    => now(),
            ]);
    }

    public function desbloquear(int $proyectoId): void
    {
        PresupuestoMaterialProyecto::where('proyecto_id', $proyectoId)
            ->update([
                'bloqueado'       => false,
                'bloqueado_por_id' => null,
                'bloqueado_en'    => null,
            ]);
    }

    /**
     * Devuelve el consolidado de materiales del proyecto con distribución.
     */
    public function obtenerConsolidado(int $proyectoId): array
    {
        $items = PresupuestoMaterialProyecto::with([
            'material:id,nombre,codigo,imagen_url',
            'material.categoria:id,nombre,color',
            'material.unidadMedida:id,nombre,simbolo',
            'distribuciones',
            'registradoPor:id,name',
        ])
        ->where('proyecto_id', $proyectoId)
        ->get();

        $totales = [
            'total_materiales'       => $items->count(),
            'monto_total'            => $items->sum('monto_total'),
            'monto_total_ajustado'   => $items->sum(fn($i) => $i->cantidad_ajustada
                ? $i->cantidad_ajustada * $i->precio_unitario_presupuestado
                : $i->monto_total),
            'bloqueado'              => $items->first()?->bloqueado ?? false,
        ];

        return [
            'items'   => $items->values(),
            'totales' => $totales,
        ];
    }

    // ─── Privados ────────────────────────────────────────────────────────────

    private function calcularConsolidado(int $proyectoId, array $presupuestoItems, int $actorId): array
    {
        // Acumulador: [material_id => ['cantidad' => X, 'precio' => Y, 'distribuciones' => [...]]]
        $acumulador = [];

        foreach ($presupuestoItems as $pip) {
            $item = $pip instanceof PresupuestoItemProyecto
                ? $pip
                : PresupuestoItemProyecto::with(['itemConstructivo.receta', 'overrides'])->find($pip);

            if (!$item) continue;

            $itemConstructivo = $item->itemConstructivo ?? ItemConstructivo::with('receta')->find($item->item_constructivo_id);
            if (!$item->itemConstructivo) {
                $item->setRelation('itemConstructivo', $itemConstructivo);
            }

            $cantidad = (float) $item->cantidad_planificada;
            $receta   = $this->getRecetaEfectiva($item);

            foreach ($receta as $materialId => $coeficiente) {
                $cantidadMaterial = $cantidad * $coeficiente;
                $material         = Material::find($materialId);
                $precio           = $material ? (float) $material->precio_referencial : 0;

                if (!isset($acumulador[$materialId])) {
                    $acumulador[$materialId] = [
                        'material_id'       => $materialId,
                        'cantidad_total'    => 0,
                        'precio_unitario'   => $precio,
                        'distribuciones'    => [],
                    ];
                }

                $acumulador[$materialId]['cantidad_total'] += $cantidadMaterial;

                // Distribución por producto/fase
                $clave = ($item->producto_contractual_id ?? 'p' . ($item->vivienda_id ?? 'comun'))
                    . '_' . ($item->fase_id ?? 'f0');

                $acumulador[$materialId]['distribuciones'][$clave] = [
                    'producto_contractual_id' => $item->producto_contractual_id,
                    'fase_id'                 => $item->fase_id,
                    'cantidad_asignada'       => ($acumulador[$materialId]['distribuciones'][$clave]['cantidad_asignada'] ?? 0) + $cantidadMaterial,
                ];
            }
        }

        // Persist en presupuesto_material_proyecto
        $resultado = [];
        foreach ($acumulador as $materialId => $datos) {
            $cantidad = round($datos['cantidad_total'], 4);
            $precio   = $datos['precio_unitario'];

            $pmp = PresupuestoMaterialProyecto::updateOrCreate(
                ['proyecto_id' => $proyectoId, 'material_id' => $materialId],
                [
                    'cantidad_total_planificada'    => $cantidad,
                    'precio_unitario_presupuestado' => $precio,
                    'registrado_por_id'             => $actorId,
                ]
            );

            // Actualizar distribuciones
            PresupuestoMaterialDistribucion::where('presupuesto_material_id', $pmp->id)->delete();
            $totalCant = $datos['cantidad_total'] ?: 1;
            foreach ($datos['distribuciones'] as $dist) {
                PresupuestoMaterialDistribucion::create([
                    'presupuesto_material_id'  => $pmp->id,
                    'entidad_tipo'             => $dist['fase_id'] ? 'fase' : 'producto',
                    'entidad_id'               => $dist['fase_id'] ?? $dist['producto_contractual_id'] ?? 0,
                    'cantidad_asignada'        => round($dist['cantidad_asignada'], 4),
                    'porcentaje_asignado'      => round(($dist['cantidad_asignada'] / $totalCant) * 100, 2),
                ]);
            }

            $resultado[] = $pmp->fresh();
        }

        return $resultado;
    }

    private function getRecetaEfectiva(PresupuestoItemProyecto $pip): array
    {
        // Si tiene override, mezcla: usa override donde existe, global donde no
        if ($pip->tiene_override_receta && $pip->overrides->isNotEmpty()) {
            $overrides = $pip->overrides->keyBy('material_id');
            $recetaGlobal = RecetaItem::where('item_constructivo_id', $pip->item_constructivo_id)
                ->get()->keyBy('material_id');

            $efectiva = [];
            // Aplicar globales no sobreescritos
            foreach ($recetaGlobal as $matId => $r) {
                $efectiva[$matId] = $overrides->has($matId)
                    ? (float) $overrides[$matId]->cantidad_por_unidad_base
                    : (float) $r->cantidad_por_unidad_base;
            }
            // Agregar overrides de materiales nuevos (no en receta global)
            foreach ($overrides as $matId => $ov) {
                if (!isset($efectiva[$matId])) {
                    $efectiva[$matId] = (float) $ov->cantidad_por_unidad_base;
                }
            }
            return $efectiva;
        }

        // Receta global del ítem constructivo
        $receta = $pip->itemConstructivo?->receta
            ?? RecetaItem::where('item_constructivo_id', $pip->item_constructivo_id)->get();

        return $receta->pluck('cantidad_por_unidad_base', 'material_id')
            ->map(fn($v) => (float) $v)
            ->toArray();
    }
}
