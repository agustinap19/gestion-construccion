<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Almacenes\PresupuestoMaterialService;
use Illuminate\Http\Request;
use Exception;

class PresupuestoMaterialController extends Controller
{
    public function __construct(protected PresupuestoMaterialService $service) {}

    public function indexPorProyecto(Request $request, int $proyectoId)
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.gestionar')
            && !$request->user()->hasPermissionTo('almacenes.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $data = $this->service->listarPorProyecto($proyectoId);
        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(Request $request, int $proyectoId)
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'material_id'                   => 'required|integer|exists:materiales,id',
            'cantidad_total_planificada'    => 'required|numeric|min:0.0001',
            'precio_unitario_presupuestado' => 'required|numeric|min:0.0001',
            'notas'                         => 'nullable|string|max:500',
            'distribuciones'                => 'nullable|array',
            'distribuciones.*.entidad_tipo' => 'required_with:distribuciones|in:producto,fase',
            'distribuciones.*.entidad_id'   => 'required_with:distribuciones|integer',
            'distribuciones.*.cantidad_asignada'  => 'required_with:distribuciones|numeric|min:0',
            'distribuciones.*.porcentaje_asignado'=> 'nullable|numeric|min:0|max:100',
        ]);

        try {
            $item = $this->service->guardar($proyectoId, $request->all(), $request->user()->id);
            return response()->json(['status' => 'success', 'message' => 'Presupuesto guardado.', 'data' => $item], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function destroy(Request $request, int $proyectoId, int $id)
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        try {
            $this->service->eliminar($id);
            return response()->json(['status' => 'success', 'message' => 'Ítem eliminado.']);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function sugerirDistribucion(Request $request, int $presupuestoId)
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate(['tipo' => 'required|in:fase,producto']);

        try {
            $sugerencia = $this->service->sugerirDistribucion($presupuestoId, $request->input('tipo'));
            return response()->json(['status' => 'success', 'data' => $sugerencia]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function importar(Request $request, int $proyectoId)
    {
        if (!$request->user()->hasPermissionTo('presupuesto_materiales.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate(['filas' => 'required|array|min:1']);

        try {
            $resultado = $this->service->importarDesdeArray($proyectoId, $request->input('filas'), $request->user()->id);
            return response()->json(['status' => 'success', 'data' => $resultado]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
}
