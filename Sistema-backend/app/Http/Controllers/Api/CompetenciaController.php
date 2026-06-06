<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Competencia\ActualizarCompetenciaRequest;
use App\Http\Requests\Competencia\CrearCompetenciaRequest;
use App\Models\Competencia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class CompetenciaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Competencia::query();

            if ($busqueda = $request->input('busqueda')) {
                $query->where(function ($q) use ($busqueda) {
                    $q->where('nombre', 'like', "%{$busqueda}%")
                      ->orWhere('tipo', 'like', "%{$busqueda}%")
                      ->orWhere('descripcion', 'like', "%{$busqueda}%");
                });
            }

            if ($tipo = $request->input('tipo')) {
                $query->where('tipo', $tipo);
            }

            if ($request->has('requiere_renovacion')) {
                $query->where('requiere_renovacion', filter_var($request->input('requiere_renovacion'), FILTER_VALIDATE_BOOLEAN));
            }

            $competencias = $query->orderBy('nombre')->paginate($request->input('per_page', 50));

            return response()->json([
                'status'  => 'success',
                'data'    => $competencias,
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function store(CrearCompetenciaRequest $request): JsonResponse
    {
        try {
            $competencia = Competencia::create($request->validated());
            return response()->json([
                'status'  => 'success',
                'message' => 'Competencia creada exitosamente.',
                'data'    => $competencia,
            ], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function update(ActualizarCompetenciaRequest $request, int $id): JsonResponse
    {
        try {
            $competencia = Competencia::findOrFail($id);
            $competencia->update($request->validated());
            return response()->json([
                'status'  => 'success',
                'message' => 'Competencia actualizada exitosamente.',
                'data'    => $competencia->fresh(),
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $competencia = Competencia::findOrFail($id);

            $asignaciones = \DB::table('personal_competencia')
                ->where('competencia_id', $id)
                ->count();

            if ($asignaciones > 0) {
                return response()->json([
                    'status'  => 'error',
                    'message' => "No se puede eliminar: la competencia tiene {$asignaciones} asignación(es) activa(s).",
                ], 422);
            }

            $competencia->delete();
            return response()->json(['status' => 'success', 'message' => 'Competencia eliminada.']);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
