<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HistorialCambioItem;
use App\Models\ItemConstructivo;
use App\Models\OverrideItemProyecto;
use App\Models\PresupuestoItemProyecto;
use App\Models\Proyecto;
use App\Models\RecetaItem;
use App\Services\Almacenes\PresupuestoAutomaticoService;
use App\Services\Almacenes\RecetaResolverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class ItemsProyectoController extends Controller
{
    public function __construct(
        private PresupuestoAutomaticoService $presupuestoService,
        private RecetaResolverService $recetaResolver,
    ) {}

    // ── Listado de ítems con info de overrides ────────────────────────────────

    /**
     * GET /proyectos/{id}/items-config
     * Lista todos los items del proyecto con override info y receta resuelta.
     */
    public function index(Request $request, int $proyectoId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $viviendaId = $request->integer('vivienda_id') ?: null;

        $query = PresupuestoItemProyecto::with([
            'itemConstructivo:id,nombre,codigo,unidad_base',
            'itemConstructivo.categoria:id,nombre,color',
            'vivienda:id,codigo',
        ])->where('proyecto_id', $proyectoId)
          ->orderBy('orden');

        if ($viviendaId) {
            $query->where('vivienda_id', $viviendaId);
        } elseif ($request->boolean('solo_comunes')) {
            $query->whereNull('vivienda_id');
        }

        $items = $query->get()->map(function (PresupuestoItemProyecto $pip) use ($proyectoId) {
            $receta  = $this->recetaResolver->resolver($pip->item_constructivo_id, $proyectoId, $pip->vivienda_id);
            $fuentes = $receta->pluck('fuente')->unique()->values();

            return [
                'id'                    => $pip->id,
                'item_constructivo'     => $pip->itemConstructivo,
                'vivienda'              => $pip->vivienda,
                'cantidad_planificada'  => (float) $pip->cantidad_planificada,
                'estado_ejecucion'      => $pip->estado_ejecucion,
                'porcentaje_avance'     => (float) $pip->porcentaje_avance,
                'tiene_override_receta' => $pip->tiene_override_receta,
                'tiene_override_items'  => $fuentes->contains(fn($f) => $f !== 'global'),
                'fuentes_receta'        => $fuentes,
                'receta'                => $receta->map(fn($r) => [
                    'material_id'              => $r['material_id'],
                    'nombre'                   => $r['material']?->nombre,
                    'cantidad_por_unidad_base' => $r['cantidad_por_unidad_base'],
                    'fuente'                   => $r['fuente'],
                    'unidad'                   => $r['unidad_material'],
                ]),
                'es_especial'                    => (bool) ($pip->metadata['es_especial'] ?? false),
                'alerta_sin_reporte'             => (bool) $pip->alerta_sin_reporte,
                'fecha_primera_entrega_material' => $pip->fecha_primera_entrega_material?->toISOString(),
            ];
        });

        return response()->json(['status' => 'success', 'data' => $items]);
    }

    // ── Cambiar cantidad planificada ──────────────────────────────────────────

    /**
     * PATCH /proyectos/{id}/items-config/{pipId}/cantidad
     */
    public function actualizarCantidad(Request $request, int $proyectoId, int $pipId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'cantidad_planificada' => 'required|numeric|min:0.0001',
            'justificacion'        => 'nullable|string|max:500',
        ]);

        $pip = PresupuestoItemProyecto::where('proyecto_id', $proyectoId)->findOrFail($pipId);

        DB::transaction(function () use ($pip, $request, $proyectoId) {
            $antes = (float) $pip->cantidad_planificada;

            $pip->update(['cantidad_planificada' => $request->cantidad_planificada]);

            // Recalcular consolidado
            $this->presupuestoService->recalcularConsolidado($proyectoId, $request->user()->id);

            // Auditoría
            HistorialCambioItem::create([
                'proyecto_id'     => $proyectoId,
                'usuario_id'      => $request->user()->id,
                'tipo_cambio'     => 'cantidad',
                'pip_id'          => $pip->id,
                'vivienda_id'     => $pip->vivienda_id,
                'valores_antes'   => ['cantidad_planificada' => $antes],
                'valores_despues' => ['cantidad_planificada' => (float) $request->cantidad_planificada],
                'descripcion'     => $request->justificacion,
            ]);
        });

        return response()->json(['status' => 'success', 'message' => 'Cantidad actualizada y presupuesto recalculado.']);
    }

    // ── Override de receta por tipología ─────────────────────────────────────

    /**
     * PUT /proyectos/{id}/items-config/override-tipologia
     * Aplica override a nivel tipología (todas las viviendas del proyecto).
     */
    public function overrideTipologia(Request $request, int $proyectoId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('overrides_receta.aprobar')) {
            return response()->json(['status' => 'error', 'message' => 'Solo el gerente puede cambiar recetas.'], 403);
        }

        $request->validate([
            'item_constructivo_id' => 'required|integer|exists:items_constructivos,id',
            'justificacion'        => 'required|string|min:10',
            'materiales'           => 'required|array|min:1',
            'materiales.*.material_id'              => 'required|integer|exists:materiales,id',
            'materiales.*.cantidad_por_unidad_base' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($request, $proyectoId) {
            // Eliminar overrides tipología previos para este item
            OverrideItemProyecto::where('proyecto_id', $proyectoId)
                ->where('item_constructivo_id', $request->item_constructivo_id)
                ->where('nivel', 'tipologia')
                ->delete();

            foreach ($request->materiales as $mat) {
                OverrideItemProyecto::create([
                    'proyecto_id'              => $proyectoId,
                    'item_constructivo_id'     => $request->item_constructivo_id,
                    'material_id'              => $mat['material_id'],
                    'cantidad_por_unidad_base' => $mat['cantidad_por_unidad_base'],
                    'nivel'                    => 'tipologia',
                    'vivienda_id'              => null,
                    'justificacion'            => $request->justificacion,
                    'usuario_autorizador_id'   => $request->user()->id,
                ]);
            }

            // Marcar los pips afectados
            PresupuestoItemProyecto::where('proyecto_id', $proyectoId)
                ->where('item_constructivo_id', $request->item_constructivo_id)
                ->update(['tiene_override_receta' => true]);

            $this->presupuestoService->recalcularConsolidado($proyectoId, $request->user()->id);

            HistorialCambioItem::create([
                'proyecto_id'     => $proyectoId,
                'usuario_id'      => $request->user()->id,
                'tipo_cambio'     => 'receta_tipologia',
                'valores_despues' => ['item_constructivo_id' => $request->item_constructivo_id, 'materiales' => $request->materiales],
                'descripcion'     => $request->justificacion,
            ]);
        });

        return response()->json(['status' => 'success', 'message' => 'Override de tipología aplicado y presupuesto recalculado.']);
    }

    // ── Override de receta por vivienda ───────────────────────────────────────

    /**
     * PUT /proyectos/{id}/items-config/override-vivienda
     * Aplica override a nivel de vivienda específica.
     */
    public function overrideVivienda(Request $request, int $proyectoId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('overrides_receta.aprobar')) {
            return response()->json(['status' => 'error', 'message' => 'Solo el gerente puede cambiar recetas.'], 403);
        }

        $request->validate([
            'item_constructivo_id' => 'required|integer|exists:items_constructivos,id',
            'vivienda_id'          => 'required|integer|exists:viviendas,id',
            'justificacion'        => 'required|string|min:10',
            'materiales'           => 'required|array|min:1',
            'materiales.*.material_id'              => 'required|integer|exists:materiales,id',
            'materiales.*.cantidad_por_unidad_base' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($request, $proyectoId) {
            // Eliminar overrides vivienda previos para este item+vivienda
            OverrideItemProyecto::where('proyecto_id', $proyectoId)
                ->where('item_constructivo_id', $request->item_constructivo_id)
                ->where('vivienda_id', $request->vivienda_id)
                ->where('nivel', 'vivienda')
                ->delete();

            foreach ($request->materiales as $mat) {
                OverrideItemProyecto::create([
                    'proyecto_id'              => $proyectoId,
                    'item_constructivo_id'     => $request->item_constructivo_id,
                    'material_id'              => $mat['material_id'],
                    'cantidad_por_unidad_base' => $mat['cantidad_por_unidad_base'],
                    'nivel'                    => 'vivienda',
                    'vivienda_id'              => $request->vivienda_id,
                    'justificacion'            => $request->justificacion,
                    'usuario_autorizador_id'   => $request->user()->id,
                ]);
            }

            PresupuestoItemProyecto::where('proyecto_id', $proyectoId)
                ->where('item_constructivo_id', $request->item_constructivo_id)
                ->where('vivienda_id', $request->vivienda_id)
                ->update(['tiene_override_receta' => true]);

            $this->presupuestoService->recalcularConsolidado($proyectoId, $request->user()->id);

            HistorialCambioItem::create([
                'proyecto_id'     => $proyectoId,
                'usuario_id'      => $request->user()->id,
                'tipo_cambio'     => 'receta_vivienda',
                'vivienda_id'     => $request->vivienda_id,
                'valores_despues' => ['item_constructivo_id' => $request->item_constructivo_id, 'materiales' => $request->materiales],
                'descripcion'     => $request->justificacion,
            ]);
        });

        return response()->json(['status' => 'success', 'message' => 'Override de vivienda aplicado y presupuesto recalculado.']);
    }

    // ── Quitar ítem ───────────────────────────────────────────────────────────

    /**
     * DELETE /proyectos/{id}/items-config/{pipId}
     */
    public function quitarItem(Request $request, int $proyectoId, int $pipId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $pip = PresupuestoItemProyecto::where('proyecto_id', $proyectoId)->findOrFail($pipId);

        // Bloquear si tiene entregas registradas
        $tieneEntregas = \App\Models\MovimientoAlmacen::where('presupuesto_item_proyecto_id', $pip->id)
            ->whereNotIn('estado', ['anulado'])
            ->exists();

        if ($tieneEntregas) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No se puede quitar un ítem con entregas registradas.',
            ], 422);
        }

        DB::transaction(function () use ($pip, $proyectoId, $request) {
            HistorialCambioItem::create([
                'proyecto_id'   => $proyectoId,
                'usuario_id'    => $request->user()->id,
                'tipo_cambio'   => 'quitar_item',
                'pip_id'        => $pip->id,
                'vivienda_id'   => $pip->vivienda_id,
                'valores_antes' => [
                    'item_constructivo_id' => $pip->item_constructivo_id,
                    'cantidad_planificada' => (float) $pip->cantidad_planificada,
                ],
                'descripcion'   => 'Ítem quitado del proyecto.',
            ]);

            $pip->delete();
            $this->presupuestoService->recalcularConsolidado($proyectoId, $request->user()->id);
        });

        return response()->json(['status' => 'success', 'message' => 'Ítem eliminado y presupuesto recalculado.']);
    }

    // ── Agregar ítem (especial o desde biblioteca) ────────────────────────────

    /**
     * POST /proyectos/{id}/items-config
     */
    public function agregarItem(Request $request, int $proyectoId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'item_constructivo_id' => 'required_without:item_especial|integer|exists:items_constructivos,id',
            'vivienda_id'          => 'nullable|integer|exists:viviendas,id',
            'cantidad_planificada' => 'required|numeric|min:0.0001',
            // Para item especial (nuevo)
            'item_especial'        => 'nullable|array',
            'item_especial.nombre' => 'required_with:item_especial|string|max:200',
            'item_especial.codigo' => 'nullable|string|max:20',
            'item_especial.unidad_base' => 'required_with:item_especial|string|max:20',
            'item_especial.categoria_constructiva_id' => 'required_with:item_especial|integer|exists:categorias_constructivas,id',
            'item_especial.receta' => 'nullable|array',
            'item_especial.receta.*.material_id' => 'required|integer|exists:materiales,id',
            'item_especial.receta.*.cantidad_por_unidad_base' => 'required|numeric|min:0',
        ]);

        $pip = DB::transaction(function () use ($request, $proyectoId) {
            $itemId = $request->item_constructivo_id;
            $esEspecial = false;

            // Crear item especial si se solicita
            if ($request->has('item_especial')) {
                $especial = $request->item_especial;
                $nuevo = ItemConstructivo::create([
                    'codigo'                    => $especial['codigo'] ?? ItemConstructivo::generarCodigo(),
                    'nombre'                    => $especial['nombre'],
                    'unidad_base'               => $especial['unidad_base'],
                    'categoria_constructiva_id' => $especial['categoria_constructiva_id'],
                    'estado'                    => true,
                    'usuario_creador_id'        => $request->user()->id,
                ]);

                // Crear su receta
                if (!empty($especial['receta'])) {
                    foreach ($especial['receta'] as $r) {
                        RecetaItem::create([
                            'item_constructivo_id'     => $nuevo->id,
                            'material_id'              => $r['material_id'],
                            'cantidad_por_unidad_base' => $r['cantidad_por_unidad_base'],
                        ]);
                    }
                }

                $itemId     = $nuevo->id;
                $esEspecial = true;
            }

            $maxOrden = PresupuestoItemProyecto::where('proyecto_id', $proyectoId)->max('orden') ?? 0;

            $pip = PresupuestoItemProyecto::create([
                'proyecto_id'          => $proyectoId,
                'vivienda_id'          => $request->vivienda_id,
                'item_constructivo_id' => $itemId,
                'cantidad_planificada' => $request->cantidad_planificada,
                'orden'                => $maxOrden + 1,
                'estado_ejecucion'     => 'pendiente',
                'metadata'             => $esEspecial ? ['es_especial' => true, 'creado_por' => $request->user()->id] : null,
            ]);

            $this->presupuestoService->recalcularConsolidado($proyectoId, $request->user()->id);

            HistorialCambioItem::create([
                'proyecto_id'     => $proyectoId,
                'usuario_id'      => $request->user()->id,
                'tipo_cambio'     => $esEspecial ? 'item_especial' : 'agregar_item',
                'pip_id'          => $pip->id,
                'vivienda_id'     => $request->vivienda_id,
                'valores_despues' => ['item_constructivo_id' => $itemId, 'cantidad_planificada' => $request->cantidad_planificada],
                'descripcion'     => $esEspecial ? "Ítem especial creado: {$request->item_especial['nombre']}" : null,
            ]);

            return $pip;
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Ítem agregado y presupuesto recalculado.',
            'data'    => $pip->load('itemConstructivo'),
        ], 201);
    }

    // ── Preview de impacto ────────────────────────────────────────────────────

    /**
     * POST /proyectos/{id}/items-config/preview-impacto
     * Calcula el impacto antes de confirmar un cambio de cantidad.
     */
    public function previewImpacto(Request $request, int $proyectoId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'item_constructivo_id' => 'required|integer|exists:items_constructivos,id',
            'cantidad_nueva'       => 'required|numeric|min:0',
            'vivienda_id'          => 'nullable|integer|exists:viviendas,id',
        ]);

        $receta = $this->recetaResolver->resolver(
            $request->item_constructivo_id,
            $proyectoId,
            $request->vivienda_id
        );

        $impacto = $receta->map(fn($r) => [
            'material_id'             => $r['material_id'],
            'nombre'                  => $r['material']?->nombre,
            'coeficiente'             => $r['cantidad_por_unidad_base'],
            'cantidad_nueva_total'    => round($r['cantidad_por_unidad_base'] * $request->cantidad_nueva, 4),
        ]);

        return response()->json(['status' => 'success', 'data' => $impacto]);
    }

    // ── Actualizar recetas (reset a biblioteca global) ────────────────────────

    /**
     * POST /proyectos/{id}/items-config/actualizar-recetas
     * Solo gerente. Limpia overrides de tipología y recalcula con receta global.
     * Los overrides de vivienda individual NO se tocan.
     */
    public function actualizarRecetas(Request $request, int $proyectoId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.bloquear')) {
            return response()->json(['status' => 'error', 'message' => 'Solo el gerente puede ejecutar esta acción.'], 403);
        }

        DB::transaction(function () use ($proyectoId, $request) {
            // Limpiar SOLO overrides de tipología (no los de vivienda individual)
            $eliminados = OverrideItemProyecto::where('proyecto_id', $proyectoId)
                ->where('nivel', 'tipologia')
                ->delete();

            // Desmarcar tiene_override_receta en pips sin override de vivienda
            $pipsConOverrideVivienda = OverrideItemProyecto::where('proyecto_id', $proyectoId)
                ->where('nivel', 'vivienda')
                ->pluck('item_constructivo_id')
                ->unique();

            PresupuestoItemProyecto::where('proyecto_id', $proyectoId)
                ->whereNotIn('item_constructivo_id', $pipsConOverrideVivienda)
                ->update(['tiene_override_receta' => false]);

            $this->presupuestoService->recalcularConsolidado($proyectoId, $request->user()->id);

            HistorialCambioItem::create([
                'proyecto_id'     => $proyectoId,
                'usuario_id'      => $request->user()->id,
                'tipo_cambio'     => 'actualizar_recetas',
                'valores_antes'   => ['overrides_eliminados' => $eliminados],
                'descripcion'     => 'Reset a receta global. Overrides de vivienda individual conservados.',
            ]);
        });

        return response()->json(['status' => 'success', 'message' => 'Recetas actualizadas con la biblioteca global. Overrides de vivienda individual conservados.']);
    }

    // ── Historial ─────────────────────────────────────────────────────────────

    /**
     * GET /proyectos/{id}/items-config/historial
     */
    public function historial(Request $request, int $proyectoId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $historial = HistorialCambioItem::with(['usuario:id,nombre,apellido_paterno', 'vivienda:id,codigo'])
            ->where('proyecto_id', $proyectoId)
            ->latest()
            ->paginate($request->per_page ?? 20);

        return response()->json(['status' => 'success', 'data' => $historial]);
    }
}
