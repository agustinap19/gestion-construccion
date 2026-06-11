<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Almacenes\PresupuestoAutomaticoService;
use App\Services\Almacenes\RecetaResolverService;
use App\Models\DetalleMovimientoAlmacen;
use App\Models\PresupuestoItemProyecto;
use App\Models\StockMaterial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class PresupuestoItemsProyectoController extends Controller
{
    public function __construct(
        protected PresupuestoAutomaticoService $service,
        protected RecetaResolverService $recetaResolver,
    ) {}

    public function consolidado(Request $request, int $proyectoId)
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        return response()->json([
            'status' => 'success',
            'data'   => $this->service->obtenerConsolidado($proyectoId),
        ]);
    }

    public function generarDesde(Request $request, int $proyectoId)
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        $request->validate([
            'items'                        => 'required|array|min:1',
            'items.*.item_constructivo_id' => 'required|integer|exists:items_constructivos,id',
            'items.*.cantidad_planificada' => 'required|numeric|min:0.0001',
            'items.*.vivienda_id'          => 'nullable|integer|exists:viviendas,id',
            'items.*.fase_id'              => 'nullable|integer|exists:fases_proyecto,id',
            'items.*.ponderacion_avance'   => 'nullable|numeric|min:0',
        ]);

        try {
            $resultado = $this->service->generarDesde($proyectoId, $request->input('items'), $request->user()->id);
            return response()->json(['status' => 'success', 'message' => 'Presupuesto generado.', 'data' => $resultado]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function generarDesdePlantillaSocial(Request $request, int $proyectoId)
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        $request->validate([
            'tipologias'               => 'required|array|min:1',
            'tipologias.*.plantilla_id' => 'required|integer|exists:plantillas_constructivas,id',
            'tipologias.*.viviendas'   => 'required|array|min:1',
            'tipologias.*.viviendas.*' => 'integer|exists:viviendas,id',
        ]);

        try {
            $resultado = $this->service->generarDesdePlantillaSocial($proyectoId, $request->input('tipologias'), $request->user()->id);
            return response()->json(['status' => 'success', 'message' => 'Presupuesto social generado.', 'data' => $resultado]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function generarDesdePlantillaPrivado(Request $request, int $proyectoId)
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        $request->validate([
            'plantilla_id'                 => 'required|integer|exists:plantillas_constructivas,id',
            'cantidades'                   => 'required|array|min:1',
            'cantidades.*.item_constructivo_id' => 'required|integer',
            'cantidades.*.cantidad_planificada' => 'required|numeric|min:0',
        ]);

        try {
            $resultado = $this->service->generarDesdePlantillaPrivado(
                $proyectoId,
                $request->integer('plantilla_id'),
                $request->input('cantidades'),
                $request->user()->id
            );
            return response()->json(['status' => 'success', 'message' => 'Presupuesto generado.', 'data' => $resultado]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function recalcular(Request $request, int $proyectoId)
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        try {
            $resultado = $this->service->recalcularConsolidado($proyectoId, $request->user()->id);
            return response()->json(['status' => 'success', 'message' => 'Consolidado recalculado.', 'data' => $resultado]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function aplicarOverride(Request $request, int $presupuestoItemId)
    {
        if (!$request->user()->hasPermissionTo('overrides_receta.aprobar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso de autorización.'], 403);
        }
        $request->validate([
            'justificacion'                   => 'required|string|min:10',
            'overrides'                       => 'required|array|min:1',
            'overrides.*.material_id'         => 'required|integer|exists:materiales,id',
            'overrides.*.cantidad_por_unidad_base' => 'required|numeric|min:0',
        ]);

        try {
            $pip = $this->service->aplicarOverride(
                $presupuestoItemId,
                $request->input('overrides'),
                $request->input('justificacion'),
                $request->user()->id
            );
            return response()->json(['status' => 'success', 'message' => 'Override aplicado y consolidado recalculado.', 'data' => $pip]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function bloquear(Request $request, int $proyectoId)
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.bloquear')) {
            return response()->json(['status' => 'error', 'message' => 'Solo el gerente puede bloquear el presupuesto.'], 403);
        }
        try {
            $this->service->bloquear($proyectoId, $request->user()->id);
            return response()->json(['status' => 'success', 'message' => 'Presupuesto bloqueado. Cambios futuros requieren modificatorio.']);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function items(Request $request, int $proyectoId)
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        $items = PresupuestoItemProyecto::with([
            'itemConstructivo:id,nombre,codigo,unidad_base',
            'itemConstructivo.categoria:id,nombre,color',
            'vivienda:id,codigo',
            'fase:id,nombre',
        ])
        ->where('proyecto_id', $proyectoId)
        ->orderBy('orden')
        ->get();

        return response()->json(['status' => 'success', 'data' => $items]);
    }

    /**
     * Receta resuelta por jerarquía (vivienda > tipología > global) + stock real.
     * GET /presupuesto-items-proyecto/{pipId}/receta-con-stock/{almacenId}
     */
    public function recetaConStock(Request $request, int $pipId, int $almacenId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $pip = PresupuestoItemProyecto::findOrFail($pipId);

        // Resolver con jerarquía: override vivienda > override tipología > receta global
        $receta = $this->recetaResolver->resolver(
            $pip->item_constructivo_id,
            $pip->proyecto_id,
            $pip->vivienda_id
        );

        if ($receta->isEmpty()) {
            return response()->json(['status' => 'success', 'data' => []]);
        }

        $materialIds = $receta->pluck('material_id');

        // Stock disponible (bulk, sin N+1)
        $stocks = StockMaterial::whereIn('material_id', $materialIds)
            ->where('almacen_id', $almacenId)
            ->get()
            ->keyBy('material_id');

        // Ya entregado (bulk, sin N+1)
        $yaEntregado = DetalleMovimientoAlmacen::select('material_id', DB::raw('SUM(cantidad) as total'))
            ->whereHas('movimiento', fn($q) => $q
                ->where('presupuesto_item_proyecto_id', $pipId)
                ->whereNotIn('estado', ['anulado', 'borrador'])
            )
            ->whereIn('material_id', $materialIds)
            ->groupBy('material_id')
            ->get()
            ->keyBy('material_id');

        $cantidadPlan = (float) $pip->cantidad_planificada;

        $data = $receta->map(function (array $r) use ($stocks, $yaEntregado, $cantidadPlan) {
            $matId      = $r['material_id'];
            $stock      = $stocks->get($matId);
            $disponible = $stock ? max(0.0, (float)($stock->cantidad - $stock->cantidad_reservada)) : 0.0;
            $teoricoTotal = round($r['cantidad_por_unidad_base'] * $cantidadPlan, 4);
            $entregado    = (float) ($yaEntregado->get($matId)?->total ?? 0);
            $restante     = max(0.0, $teoricoTotal - $entregado);
            $mat          = $r['material'];

            return [
                'material_id'                => $matId,
                'nombre'                     => $mat?->nombre,
                'codigo'                     => $mat?->codigo,
                'unidad'                     => $r['unidad_material'] ?: ($mat?->unidadMedida?->simbolo ?? ''),
                'cantidad_por_unidad_base'   => $r['cantidad_por_unidad_base'],
                'fuente'                     => $r['fuente'],  // vivienda | tipologia | global
                'teorico_total'              => $teoricoTotal,
                'ya_entregado'               => $entregado,
                'teorico_restante'           => $restante,
                'cantidad_disponible_almacen'=> $disponible,
                'tiene_stock'                => $disponible > 0,
                'item_completo'              => $restante <= 0,
            ];
        })->values();

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    /**
     * Endpoint standalone para cargar ítems por beneficiario/vivienda.
     * Usado por EntregaSocialModal: GET /presupuesto-items-proyecto?proyecto_id=X&beneficiario_id=Y&por_entregar=1
     */
    public function porBeneficiario(Request $request)
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $proyectoId    = $request->integer('proyecto_id');
        $beneficiarioId = $request->integer('beneficiario_id');
        $viviendaId    = $request->integer('vivienda_id');

        // Resolver vivienda desde beneficiario si no viene explícito
        if (!$viviendaId && $beneficiarioId) {
            $viviendaId = \App\Models\Beneficiario::where('beneficiarios.id', $beneficiarioId)
                ->join('viviendas', 'viviendas.beneficiario_id', '=', 'beneficiarios.id')
                ->value('viviendas.id');
        }

        $query = PresupuestoItemProyecto::with([
            'itemConstructivo:id,nombre,codigo,unidad_base',
            'itemConstructivo.categoria:id,nombre,color',
            'itemConstructivo.recetas',
            'itemConstructivo.recetas.material:id,nombre,codigo,unidad_medida_id',
            'itemConstructivo.recetas.material.unidadMedida:id,nombre,simbolo',
            'vivienda:id,codigo',
        ]);

        if ($proyectoId) {
            $query->where('proyecto_id', $proyectoId);
        }

        if ($viviendaId) {
            $query->where('vivienda_id', $viviendaId);
        } elseif ($beneficiarioId) {
            $query->whereNull('vivienda_id');
        }

        if ($request->boolean('por_entregar')) {
            $query->where('estado_ejecucion', '!=', 'terminado');
        }

        $items = $query->orderBy('orden')->get();

        return response()->json(['status' => 'success', 'data' => $items]);
    }
}
