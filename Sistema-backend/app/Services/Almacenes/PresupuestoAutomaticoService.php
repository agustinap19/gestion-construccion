<?php

namespace App\Services\Almacenes;

use App\Models\ItemConstructivo;
use App\Models\Material;
use App\Models\OverrideItemProyecto;
use App\Models\OverrideRecetaProyecto;
use App\Models\PlantillaConstructiva;
use App\Models\PresupuestoItemProyecto;
use App\Models\PresupuestoMaterialDistribucion;
use App\Models\PresupuestoMaterialProyecto;
use App\Models\RecetaItem;
use App\Services\Almacenes\RecetaResolverService;
use Illuminate\Support\Facades\DB;
use Exception;

class PresupuestoAutomaticoService
{
    public function __construct(private RecetaResolverService $recetaResolver) {}
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

            // Snapshot de recetas al momento de generar.
            // Aísla el proyecto de cambios futuros en la biblioteca global.
            // Solo crea entradas nuevas (nivel=tipologia, vivienda=null);
            // nunca sobreescribe overrides ya configurados manualmente.
            $this->snapshotearRecetas($proyectoId, $presupuestoItems, $actorId);

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

    /**
     * Guarda un snapshot de las recetas globales como overrides de tipología.
     * Protege al proyecto de cambios futuros en la Biblioteca Constructiva.
     *
     * Solo inserta registros nuevos (INSERT IGNORE / updateOrCreate).
     * Si ya existe un override manual para ese proyecto+item+material, lo respeta.
     */
    private function snapshotearRecetas(int $proyectoId, array $pips, int $actorId): void
    {
        // Recopilar IDs únicos de ítems constructivos en este lote
        $itemIds = collect($pips)
            ->pluck('item_constructivo_id')
            ->unique()
            ->values();

        // Bulk-load recetas globales de todos los ítems (sin N+1)
        $recetas = RecetaItem::whereIn('item_constructivo_id', $itemIds)->get();

        foreach ($recetas as $r) {
            // Solo insertar si NO existe ya override tipología para este trio
            // Esto preserva overrides configurados manualmente antes de regenerar
            OverrideItemProyecto::firstOrCreate(
                [
                    'proyecto_id'          => $proyectoId,
                    'item_constructivo_id' => $r->item_constructivo_id,
                    'material_id'          => $r->material_id,
                    'vivienda_id'          => null,
                ],
                [
                    'cantidad_por_unidad_base' => $r->cantidad_por_unidad_base,
                    'nivel'                    => 'tipologia',
                    'justificacion'            => 'Snapshot automático al generar presupuesto.',
                    'usuario_autorizador_id'   => $actorId,
                ]
            );
        }
    }

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
        // Delega al RecetaResolverService: vivienda > tipología > global
        return $this->recetaResolver->resolverComoArray(
            $pip->item_constructivo_id,
            $pip->proyecto_id,
            $pip->vivienda_id
        );
    }
}
