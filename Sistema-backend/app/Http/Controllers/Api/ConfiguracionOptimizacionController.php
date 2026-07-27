<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConfiguracionOptimizacion;
use Illuminate\Http\Request;

class ConfiguracionOptimizacionController extends Controller
{
    public function show(Request $request)
    {
        if (!$request->user()->hasPermissionTo('activos.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        return response()->json(['status' => 'success', 'data' => ConfiguracionOptimizacion::actual()]);
    }

    public function update(Request $request)
    {
        if (!$request->user()->hasPermissionTo('activos.configurar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'peso_atraso'                 => 'sometimes|numeric|min:0|max:99.99',
            'peso_plazo'                  => 'sometimes|numeric|min:0|max:99.99',
            'peso_penalidad'              => 'sometimes|numeric|min:0|max:99.99',
            'peso_distancia'              => 'sometimes|numeric|min:0|max:99.99',
            'peso_gerente_override'       => 'sometimes|numeric|min:0|max:99.99',
            'modo_asignacion_default'     => 'sometimes|in:sugerencia,automatico',
            'radio_cluster_km'            => 'sometimes|numeric|min:0',
            'tiempo_traslado_por_km_min'  => 'sometimes|numeric|min:0',
        ]);

        $configuracion = ConfiguracionOptimizacion::actual();
        $configuracion->fill($request->all());
        $configuracion->updated_by = $request->user()->id;
        $configuracion->updated_at = now();
        $configuracion->save();

        return response()->json(['status' => 'success', 'message' => 'Configuración actualizada.', 'data' => $configuracion]);
    }
}
