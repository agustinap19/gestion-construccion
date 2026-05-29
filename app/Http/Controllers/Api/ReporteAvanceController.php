<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Proyectos\ReporteAvanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReporteAvanceController extends Controller
{
    public function __construct(protected ReporteAvanceService $service) {}

    // GET /api/viviendas/{viviendaId}/reportes-avance
    public function index(Request $request, int $viviendaId): JsonResponse
    {
        $pipId = $request->integer('item_id') ?: null;
        $data  = $this->service->listarPorVivienda($viviendaId, $pipId);
        return response()->json(['data' => $data]);
    }

    // POST /api/viviendas/{viviendaId}/reportes-avance  (multipart/form-data)
    public function store(Request $request, int $viviendaId): JsonResponse
    {
        if (!$this->puedeRegistrar($request->user())) {
            return response()->json(['message' => 'No tiene permiso para registrar avance de obra.'], 403);
        }

        $request->validate([
            'presupuesto_item_proyecto_id' => 'required|integer|exists:presupuesto_items_proyecto,id',
            'porcentaje_avance'            => 'required|numeric|min:0|max:100',
            'foto'                         => 'required|image|mimes:jpeg,jpg,png,webp|max:10240',
            'observacion'                  => 'nullable|string|max:2000',
            'coordenadas_gps'              => 'nullable|string|max:100',
        ], [
            'foto.required' => 'La foto es obligatoria para registrar el avance.',
            'foto.image'    => 'El archivo debe ser una imagen (JPEG, PNG, WEBP).',
            'foto.max'      => 'La foto no puede superar los 10 MB.',
        ]);

        try {
            $resultado = $this->service->registrar(
                $viviendaId,
                $request->only('presupuesto_item_proyecto_id', 'porcentaje_avance', 'observacion', 'coordenadas_gps'),
                $request->file('foto'),
                $request->user()
            );

            return response()->json($resultado, 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    private function puedeRegistrar($user): bool
    {
        if (!$user) return false;
        if ($user->es_admin_central) return true;
        return in_array($user->rol?->nombre, ['tecnico', 'admin_proyecto', 'gerente', 'super_admin']);
    }
}
