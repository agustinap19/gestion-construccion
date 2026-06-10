<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\Beneficiario;
use App\Models\DetalleMovimientoAlmacen;
use App\Models\PresupuestoItemProyecto;
use App\Models\StockMaterial;
use App\Services\Almacenes\AlmacenService;
use App\Services\Almacenes\EntregaService;
use App\Services\Almacenes\RecetaResolverService;
use App\Services\Almacenes\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class AlmacenController extends Controller
{
    public function __construct(
        protected AlmacenService     $service,
        protected StockService       $stockService,
        protected EntregaService     $entregaService,
        protected RecetaResolverService $recetaResolver,
    ) {}

    public function index(Request $request)
    {
        if (!$request->user()->hasPermissionTo('almacenes.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $data = $this->service->listarConFiltros($request->all(), $request->input('per_page', 15));
        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function show(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('almacenes.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        try {
            $data = $this->service->obtenerConStock($id);
            return response()->json(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 404);
        }
    }

    public function store(Request $request)
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'nombre'             => 'required|string|max:100',
            'tipo'               => 'required|in:central,obra,temporal',
            'proyecto_id'        => 'nullable|integer|exists:proyectos,id',
            'ubicacion'          => 'nullable|string|max:200',
            'descripcion'        => 'nullable|string|max:300',
            'responsable_id'     => 'nullable|integer|exists:personal,id',
            'capacidad_estimada' => 'nullable|numeric|min:0',
            'codigo'             => 'nullable|string|max:20|unique:almacenes,codigo',
            'latitud'            => 'nullable|numeric|between:-90,90',
            'longitud'           => 'nullable|numeric|between:-180,180',
        ]);

        try {
            $almacen = $this->service->crear($request->all(), $request->user()->id);
            return response()->json(['status' => 'success', 'message' => 'Almacén creado.', 'data' => $almacen], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function update(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'nombre'             => 'sometimes|string|max:100',
            'ubicacion'          => 'nullable|string|max:200',
            'descripcion'        => 'nullable|string|max:300',
            'responsable_id'     => 'nullable|integer|exists:personal,id',
            'capacidad_estimada' => 'nullable|numeric|min:0',
            'latitud'            => 'nullable|numeric|between:-90,90',
            'longitud'           => 'nullable|numeric|between:-180,180',
        ]);

        try {
            $almacen = $this->service->actualizar($id, $request->all(), $request->user()->id);
            return response()->json(['status' => 'success', 'message' => 'Almacén actualizado.', 'data' => $almacen]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function cambiarEstado(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate(['estado' => 'required|in:activo,inactivo,cerrado']);

        try {
            $almacen = $this->service->cambiarEstado($id, $request->input('estado'), $request->user()->id);
            return response()->json(['status' => 'success', 'data' => $almacen]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function estadisticas(Request $request)
    {
        if (!$request->user()->hasPermissionTo('almacenes.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        return response()->json(['status' => 'success', 'data' => $this->service->estadisticasResumen()]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('almacenes.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        return response()->json(['status' => 'success', 'data' => $this->service->dashboard()]);
    }

    // ─── Movimientos de stock ────────────────────────────────────────────────

    public function registrarEntrada(Request $request, int $almacenId)
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'material_id'     => 'required|integer|exists:materiales,id',
            'cantidad'        => 'required|numeric|min:0.0001',
            'precio_unitario' => 'required|numeric|min:0',
            'concepto'        => 'required|string|max:200',
            'referencia_tipo' => 'nullable|string|max:50',
            'referencia_id'   => 'nullable|integer',
        ]);

        try {
            $mov = $this->stockService->registrarEntrada(
                $almacenId,
                $request->integer('material_id'),
                (float) $request->input('cantidad'),
                (float) $request->input('precio_unitario'),
                $request->input('concepto'),
                $request->user()->id,
                $request->input('referencia_tipo'),
                $request->input('referencia_id')
            );
            return response()->json(['status' => 'success', 'data' => $mov], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function registrarSalida(Request $request, int $almacenId)
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'material_id'     => 'required|integer|exists:materiales,id',
            'cantidad'        => 'required|numeric|min:0.0001',
            'concepto'        => 'required|string|max:200',
            'referencia_tipo' => 'nullable|string|max:50',
            'referencia_id'   => 'nullable|integer',
        ]);

        try {
            $mov = $this->stockService->registrarSalida(
                $almacenId,
                $request->integer('material_id'),
                (float) $request->input('cantidad'),
                $request->input('concepto'),
                $request->user()->id,
                $request->input('referencia_tipo'),
                $request->input('referencia_id')
            );
            return response()->json(['status' => 'success', 'data' => $mov], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function transferir(Request $request)
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'almacen_origen_id'  => 'required|integer|exists:almacenes,id',
            'almacen_destino_id' => 'required|integer|exists:almacenes,id|different:almacen_origen_id',
            'material_id'        => 'required|integer|exists:materiales,id',
            'cantidad'           => 'required|numeric|min:0.0001',
            'concepto'           => 'required|string|max:200',
        ]);

        try {
            $movs = $this->stockService->transferir(
                $request->integer('almacen_origen_id'),
                $request->integer('almacen_destino_id'),
                $request->integer('material_id'),
                (float) $request->input('cantidad'),
                $request->input('concepto'),
                $request->user()->id
            );
            return response()->json(['status' => 'success', 'data' => $movs], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function ajustar(Request $request, int $almacenId)
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'material_id'   => 'required|integer|exists:materiales,id',
            'cantidad_real' => 'required|numeric|min:0',
            'motivo'        => 'required|string|max:200',
        ]);

        try {
            $mov = $this->stockService->registrarAjuste(
                $almacenId,
                $request->integer('material_id'),
                (float) $request->input('cantidad_real'),
                $request->input('motivo'),
                $request->user()->id
            );
            return response()->json(['status' => 'success', 'data' => $mov], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function cerrar(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'motivo' => 'required|string|min:5',
        ]);

        $almacen = Almacen::findOrFail($id);

        try {
            $almacen = $this->entregaService->cerrarAlmacenProyecto(
                $almacen,
                $request->input('motivo'),
                $request->user()->id
            );
            return response()->json(['status' => 'success', 'data' => $almacen]);
        } catch (\RuntimeException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    public function materialesConStock(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('almacenes.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $stocks = StockMaterial::with([
            'material:id,nombre,codigo,unidad_medida_id',
            'material.unidadMedida:id,nombre,simbolo',
        ])
        ->where('almacen_id', $id)
        ->whereRaw('(cantidad - cantidad_reservada) > 0')
        ->get()
        ->sortBy(fn($s) => $s->material?->nombre ?? 'z')
        ->values()
        ->map(fn($s) => [
            'material_id'         => $s->material_id,
            'nombre'              => $s->material?->nombre,
            'codigo'              => $s->material?->codigo,
            'unidad'              => $s->material?->unidadMedida?->simbolo,
            'cantidad_disponible' => (float) ($s->cantidad - $s->cantidad_reservada),
            'pmp'                 => (float) $s->costo_promedio,
        ]);

        return response()->json(['status' => 'success', 'data' => $stocks]);
    }

    /**
     * GET /almacenes/{almacenId}/items/{pipId}/materiales-receta
     * Receta resuelta (snapshot proyecto) + stock real.
     * Garantiza que cambios en la Biblioteca Global no afectan proyectos en ejecución.
     */
    public function materialesReceta(Request $request, int $almacenId, int $pipId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('almacenes.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $pip = PresupuestoItemProyecto::findOrFail($pipId);

        $receta = $this->recetaResolver->resolver(
            $pip->item_constructivo_id,
            $pip->proyecto_id,
            $pip->vivienda_id
        );

        if ($receta->isEmpty()) {
            return response()->json(['status' => 'success', 'materiales' => []]);
        }

        $materialIds = $receta->pluck('material_id');

        $stocks = StockMaterial::whereIn('material_id', $materialIds)
            ->where('almacen_id', $almacenId)
            ->get()
            ->keyBy('material_id');

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

        $materiales = $receta->map(function (array $r) use ($stocks, $yaEntregado, $cantidadPlan) {
            $matId        = $r['material_id'];
            $stock        = $stocks->get($matId);
            $disponible   = $stock ? max(0.0, (float)($stock->cantidad - $stock->cantidad_reservada)) : 0.0;
            $teoricoTotal = round($r['cantidad_por_unidad_base'] * $cantidadPlan, 4);
            $entregado    = (float) ($yaEntregado->get($matId)?->total ?? 0);
            $restante     = max(0.0, $teoricoTotal - $entregado);
            $mat          = $r['material'];

            return [
                'material_id'              => $matId,
                'nombre'                   => $mat?->nombre,
                'unidad'                   => $r['unidad_material'] ?: ($mat?->unidadMedida?->simbolo ?? ''),
                'cantidad_por_unidad_base' => $r['cantidad_por_unidad_base'],
                'fuente'                   => $r['fuente'],
                'cantidad_teorica_total'   => $teoricoTotal,
                'ya_entregado'             => $entregado,
                'teorico_restante'         => $restante,
                'disponible_en_almacen'    => $disponible,
                'tiene_stock'              => $disponible > 0,
                'item_completo'            => $restante <= 0,
            ];
        })->values();

        return response()->json(['status' => 'success', 'materiales' => $materiales]);
    }

    /**
     * GET /almacenes/{almacenId}/beneficiarios/{beneficiarioId}/material/{materialId}/items
     * Returns items that require the given material for the beneficiary's vivienda.
     * Used for the material-first delivery flow (BLOQUE 1).
     */
    public function itemsPorMaterialBeneficiario(Request $request, int $almacenId, int $beneficiarioId, int $materialId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('almacenes.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $beneficiario = Beneficiario::with('vivienda')->findOrFail($beneficiarioId);

        if (!$beneficiario->vivienda) {
            return response()->json(['status' => 'success', 'items' => [], 'mensaje' => 'Beneficiario sin vivienda asignada.']);
        }

        $viviendaId = $beneficiario->vivienda->id;
        $proyectoId = $beneficiario->proyecto_id;

        // All PIPs for this vivienda that are not yet finished
        $pips = PresupuestoItemProyecto::with(['itemConstructivo:id,nombre,codigo,unidad_base'])
            ->where('vivienda_id', $viviendaId)
            ->where('estado_ejecucion', '!=', 'terminado')
            ->get();

        if ($pips->isEmpty()) {
            return response()->json(['status' => 'success', 'items' => [], 'mensaje' => 'No hay ítems pendientes para este beneficiario.']);
        }

        $resultado = [];
        foreach ($pips as $pip) {
            $coef = $this->recetaResolver->resolverMaterial(
                $pip->item_constructivo_id,
                $proyectoId,
                $viviendaId,
                $materialId
            );

            if ($coef <= 0) continue; // This item does not need this material

            $teoricoTotal = round((float) $pip->cantidad_planificada * $coef, 4);

            $yaEntregado = (float) DetalleMovimientoAlmacen::whereHas('movimiento', fn($q) => $q
                ->where('presupuesto_item_proyecto_id', $pip->id)
                ->whereNotIn('estado', ['anulado', 'borrador'])
            )->where('material_id', $materialId)->sum('cantidad');

            $restante = max(0.0, round($teoricoTotal - $yaEntregado, 4));

            $stock = StockMaterial::where('almacen_id', $almacenId)
                ->where('material_id', $materialId)
                ->first();
            $disponible = $stock ? max(0.0, (float)($stock->cantidad - $stock->cantidad_reservada)) : 0.0;

            $resultado[] = [
                'pip_id'                   => $pip->id,
                'item_nombre'              => $pip->itemConstructivo?->nombre,
                'item_codigo'              => $pip->itemConstructivo?->codigo,
                'unidad_base'              => $pip->itemConstructivo?->unidad_base,
                'cantidad_planificada'     => (float) $pip->cantidad_planificada,
                'porcentaje_avance'        => (float) $pip->porcentaje_avance,
                'estado_ejecucion'         => $pip->estado_ejecucion,
                'coeficiente_material'     => $coef,
                'cantidad_teorica_total'   => $teoricoTotal,
                'ya_entregado'             => $yaEntregado,
                'restante'                 => $restante,
                'disponible_en_almacen'    => $disponible,
                'item_completo'            => $restante <= 0,
                'alerta_sin_reporte'       => (bool) $pip->alerta_sin_reporte,
                'fecha_primera_entrega'    => $pip->fecha_primera_entrega_material?->toISOString(),
            ];
        }

        return response()->json(['status' => 'success', 'items' => $resultado]);
    }

    public function kardex(Request $request, int $almacenId, int $materialId)
    {
        if (!$request->user()->hasPermissionTo('almacenes.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $movimientos = \App\Models\MovimientoMaterial::with('registradoPor:id,name')
            ->where('almacen_id', $almacenId)
            ->where('material_id', $materialId)
            ->orderBy('fecha_movimiento')
            ->orderBy('id')
            ->paginate($request->input('per_page', 50));

        return response()->json(['status' => 'success', 'data' => $movimientos]);
    }
}
