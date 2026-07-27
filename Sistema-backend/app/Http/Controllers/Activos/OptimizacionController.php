<?php

namespace App\Http\Controllers\Activos;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Activos\PlanOptimizacion;
use App\Services\Activos\OptimizacionService;
use Exception;

class OptimizacionController extends Controller
{
    protected $optimizacionService;

    public function __construct(OptimizacionService $optimizacionService)
    {
        $this->optimizacionService = $optimizacionService;
    }

    public function optimizarProyectos(Request $request)
    {
        $validated = $request->validate([
            'activo_id' => 'required|integer',
            'costo_dia_activo' => 'required|numeric',
            'proyectos' => 'required|array|min:1',
            'configuracion' => 'nullable|array'
        ]);

        try {
            $plan = $this->optimizacionService->optimizarProyectos($validated);

            return response()->json([
                'success' => true,
                'data' => $plan
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function optimizarViviendas(Request $request)
    {
        $validated = $request->validate([
            'activo_id' => 'required|integer',
            'proyecto_id' => 'required|integer',
            'num_equipos' => 'required|integer|min:1',
            'viviendas' => 'required|array|min:1',
            'almacen_lat' => 'required|numeric',
            'almacen_lng' => 'required|numeric',
            'horas_trabajo_diarias' => 'nullable|numeric',
            'configuracion' => 'nullable|array'
        ]);

        try {
            $plan = $this->optimizacionService->optimizarViviendas($validated);

            return response()->json([
                'success' => true,
                'data' => $plan
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function aprobarPlan(Request $request, $id)
    {
        $plan = PlanOptimizacion::find($id);

        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'Plan de optimización no encontrado'
            ], 404);
        }

        $planEditado = $request->input('plan_editado');
        $planEditadoVRP = $request->input('plan_editado_vrp');

        try {
            $this->optimizacionService->aprobarPlan($plan, $planEditado, $planEditadoVRP);

            return response()->json([
                'success' => true,
                'message' => 'Plan aprobado y asignaciones creadas exitosamente'
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
