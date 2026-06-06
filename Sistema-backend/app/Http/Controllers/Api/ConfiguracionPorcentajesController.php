<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConfiguracionPorcentajesPresupuesto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConfiguracionPorcentajesController extends Controller
{
    // GET /api/configuracion/porcentajes-presupuesto
    public function index(): JsonResponse
    {
        $sets = ConfiguracionPorcentajesPresupuesto::with('usuarioActualizador:id,nombre,apellido_paterno')
            ->get()
            ->keyBy('tipo_proyecto');

        return response()->json(['status' => 'success', 'data' => $sets]);
    }

    // PUT /api/configuracion/porcentajes-presupuesto/{tipo}
    public function update(Request $request, string $tipo): JsonResponse
    {
        if (!in_array($tipo, ['social', 'privado'])) {
            return response()->json(['status' => 'error', 'message' => 'Tipo de proyecto inválido.'], 422);
        }

        if (!$request->user()->hasPermissionTo('configuracion.porcentajes_presupuestales')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso para modificar la configuración de porcentajes.'], 403);
        }

        $validated = $request->validate([
            'porcentaje_mano_obra'         => 'required|numeric|min:0|max:100',
            'porcentaje_gastos_generales'  => 'required|numeric|min:0|max:100',
            'porcentaje_utilidad_esperada' => 'required|numeric|min:0|max:100',
            'umbral_rentabilidad_minima'   => 'required|numeric|min:0|max:100',
            'notas'                        => 'nullable|string|max:500',
        ]);

        $sumaPct = $validated['porcentaje_mano_obra']
            + $validated['porcentaje_gastos_generales']
            + $validated['porcentaje_utilidad_esperada'];

        if ($sumaPct > 100) {
            return response()->json([
                'status'  => 'error',
                'message' => "La suma de MO + GG + Utilidad no puede superar 100% (actual: {$sumaPct}%).",
            ], 422);
        }

        $config = ConfiguracionPorcentajesPresupuesto::updateOrCreate(
            ['tipo_proyecto' => $tipo],
            array_merge($validated, ['usuario_actualizador_id' => $request->user()->id])
        );

        return response()->json([
            'status'  => 'success',
            'message' => "Porcentajes del set '{$tipo}' actualizados. Solo aplican a proyectos nuevos.",
            'data'    => $config,
        ]);
    }
}
