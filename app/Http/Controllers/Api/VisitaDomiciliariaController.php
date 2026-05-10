<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Beneficiarios\VisitaDomiciliariaService;
use App\Http\Requests\Visitas\CrearVisitaDomiciliariaRequest;
use App\Http\Requests\Visitas\ActualizarVisitaDomiciliariaRequest;
use Illuminate\Http\Request;
use App\Models\VisitaDomiciliaria;

class VisitaDomiciliariaController extends Controller
{
    protected $visitaService;

    public function __construct(VisitaDomiciliariaService $visitaService)
    {
        $this->visitaService = $visitaService;
    }

    public function index(Request $request)
    {
        $filtros = $request->all();
        $perPage = $request->input('per_page', 20);
        $visitas = $this->visitaService->listarConFiltros($filtros, $perPage);
        return response()->json($visitas);
    }

    public function show(int $id)
    {
        $visita = VisitaDomiciliaria::with(['proyecto', 'beneficiario', 'visitador'])->findOrFail($id);
        return response()->json($visita);
    }

    public function store(CrearVisitaDomiciliariaRequest $request)
    {
        $visita = $this->visitaService->crear(
            $request->validated(),
            $request->user()->id
        );
        return response()->json($visita, 201);
    }

    public function update(ActualizarVisitaDomiciliariaRequest $request, int $id)
    {
        // Solo la creadora o gerente pueden actualizar (se delega al servicio o en Controller)
        $visita = $this->visitaService->actualizar(
            $id,
            $request->validated(),
            $request->user()->id
        );
        return response()->json($visita);
    }

    public function destroy(Request $request, int $id)
    {
        $this->visitaService->eliminar(
            $id,
            $request->user()->id
        );
        return response()->json(['message' => 'Visita domiciliaria eliminada correctamente.']);
    }

    public function estadisticasProyecto(int $proyectoId)
    {
        $stats = $this->visitaService->obtenerEstadisticasProyecto($proyectoId);
        return response()->json($stats);
    }
}
