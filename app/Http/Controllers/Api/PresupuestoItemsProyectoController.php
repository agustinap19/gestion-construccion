<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Almacenes\PresupuestoAutomaticoService;
use App\Models\PresupuestoItemProyecto;
use Illuminate\Http\Request;
use Exception;

class PresupuestoItemsProyectoController extends Controller
{
    public function __construct(protected PresupuestoAutomaticoService $service) {}

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
            $viviendaId = \App\Models\Beneficiario::where('id', $beneficiarioId)
                ->join('viviendas', 'viviendas.beneficiario_id', '=', 'beneficiarios.id')
                ->value('viviendas.id');
        }

        $query = PresupuestoItemProyecto::with([
            'itemConstructivo:id,nombre,codigo,unidad_base',
            'itemConstructivo.categoria:id,nombre,color',
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
