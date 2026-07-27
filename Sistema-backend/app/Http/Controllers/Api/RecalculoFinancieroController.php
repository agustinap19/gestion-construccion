<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Proyecto;
use App\Models\PresupuestoItemProyecto;
use App\Services\Proyectos\CalculadoraAvanceService;
use App\Services\Proyectos\RecalculoFinancieroService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecalculoFinancieroController extends Controller
{
    public function __construct(
        protected RecalculoFinancieroService $service,
        protected CalculadoraAvanceService $calculadora,
    ) {}

    /**
     * PATCH /api/proyectos/{id}/porcentajes-financieros
     * Update financial percentages and recalculate all budget fields.
     */
    public function actualizarPorcentajes(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.editar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso para editar proyectos.'], 403);
        }

        $request->validate([
            'porcentaje_mano_obra'            => 'sometimes|numeric|min:0|max:100',
            'porcentaje_utilidad_esperada'    => 'sometimes|numeric|min:0|max:100',
            'presupuesto_mano_obra'           => 'sometimes|numeric|min:0',
            'presupuesto_utilidad_esperada'   => 'sometimes|numeric|min:0',
            'usa_monto_fijo_mo'               => 'sometimes|boolean',
            'usa_monto_fijo_util'             => 'sometimes|boolean',
            'justificacion_rentabilidad_baja' => 'sometimes|nullable|string|max:1000',
        ]);

        $proyecto = Proyecto::findOrFail($id);
        $proyecto = $this->service->calcularPresupuestoCompleto($proyecto, $request->all());

        return response()->json([
            'status'  => 'success',
            'message' => 'Presupuesto recalculado correctamente.',
            'data'    => $proyecto,
        ]);
    }

    /**
     * GET /api/proyectos/{id}/matriz-items-productos
     */
    public function obtenerMatriz(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $proyecto = Proyecto::findOrFail($id);
        $matriz   = $this->service->obtenerMatriz($proyecto);

        return response()->json(['status' => 'success', 'data' => $matriz]);
    }

    /**
     * PATCH /api/proyectos/{id}/items/{itemId}/producto-contractual
     * Assign a PresupuestoItemProyecto to a HitoCobro product.
     */
    public function asignarItemAProducto(Request $request, int $id, int $itemId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.editar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'hito_cobro_id' => 'nullable|integer|exists:hitos_cobro_proyecto,id',
        ]);

        $item = PresupuestoItemProyecto::where('proyecto_id', $id)->findOrFail($itemId);
        $item->hito_cobro_id = $request->input('hito_cobro_id');
        $item->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Ítem asignado al producto.',
            'data'    => $item->load('hitoCobro:id,nombre,orden'),
        ]);
    }

    /**
     * PATCH /api/proyectos/{id}/items/{itemId}/cantidad
     * Update the planificada quantity of a PresupuestoItemProyecto.
     */
    public function actualizarCantidadItem(Request $request, int $id, int $itemId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.editar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'cantidad_planificada' => 'required|numeric|min:0.0001',
        ]);

        $item = PresupuestoItemProyecto::where('proyecto_id', $id)->findOrFail($itemId);
        $item->cantidad_planificada = $request->input('cantidad_planificada');
        $item->save();

        // Recalcular ponderaciones por costo para la vivienda afectada
        if ($item->vivienda_id) {
            $this->calculadora->recalcularPonderacionesPorCosto($item->vivienda_id);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Cantidad actualizada.',
            'data'    => $item->load('itemConstructivo:id,nombre,unidad_base'),
        ]);
    }

    /**
     * POST /api/proyectos/{id}/recalcular-ponderaciones
     * Recalcula ponderacion_avance por costo para todas las viviendas del proyecto.
     * Usar para proyectos existentes con ponderaciones incorrectas heredadas de plantillas.
     */
    public function recalcularPonderaciones(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.editar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $proyecto = Proyecto::findOrFail($id);
        $viviendas = $this->calculadora->recalcularPonderacionesProyecto($proyecto->id);

        return response()->json([
            'status'  => 'success',
            'message' => "Ponderaciones recalculadas en {$viviendas} vivienda(s).",
            'data'    => ['viviendas_procesadas' => $viviendas],
        ]);
    }

    /**
     * GET /api/proyectos/{id}/matriz-items-agrupada
     * Items grouped by ItemConstructivo — one row per item type regardless of vivienda count.
     */
    public function obtenerMatrizAgrupada(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $proyecto = Proyecto::findOrFail($id);
        $matriz   = $this->service->obtenerMatrizAgrupada($proyecto);

        return response()->json(['status' => 'success', 'data' => $matriz]);
    }

    /**
     * PATCH /api/proyectos/{id}/items-constructivos/{icId}/producto-contractual
     * Batch-assign ALL PIPs for this item_constructivo_id to a HitoCobro.
     */
    public function asignarPorItemConstructivo(Request $request, int $id, int $icId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.editar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'hito_cobro_id' => 'nullable|integer|exists:hitos_cobro_proyecto,id',
        ]);

        $proyecto = Proyecto::findOrFail($id);
        $updated  = $this->service->asignarPorItemConstructivo(
            $proyecto,
            $icId,
            $request->input('hito_cobro_id')
        );

        return response()->json([
            'status'  => 'success',
            'message' => "{$updated} ítem(s) actualizados.",
            'data'    => ['updated' => $updated],
        ]);
    }

    /**
     * POST /api/proyectos/{id}/items/asignacion-automatica
     * Auto-assign all items to products based on constructive category heuristic.
     */
    public function asignacionAutomatica(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.editar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $proyecto = Proyecto::findOrFail($id);
        $updated  = $this->service->asignacionAutomaticaPorCategoria($proyecto);

        return response()->json([
            'status'  => 'success',
            'message' => "{$updated} ítems asignados automáticamente.",
            'data'    => ['items_actualizados' => $updated],
        ]);
    }
}
