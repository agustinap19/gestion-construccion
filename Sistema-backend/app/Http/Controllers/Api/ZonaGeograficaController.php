<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ZonasGeograficas\CrearZonaGeograficaRequest;
use App\Services\Clientes\ZonaGeograficaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ZonaGeograficaController extends Controller
{
    protected $zonaService;

    public function __construct(ZonaGeograficaService $zonaService)
    {
        $this->zonaService = $zonaService;
    }

    public function index(Request $request): JsonResponse
    {
        $soloActivas = $request->query('activas', 'true') === 'true';
        $zonas = $this->zonaService->listarTodas($soloActivas);

        return response()->json([
            'status' => 'success',
            'data' => $zonas
        ]);
    }

    public function store(CrearZonaGeograficaRequest $request): JsonResponse
    {
        $zona = $this->zonaService->crear($request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Zona geográfica creada exitosamente.',
            'data' => $zona
        ], 201);
    }

    public function porDepartamento(string $departamento): JsonResponse
    {
        $zonas = $this->zonaService->obtenerPorDepartamento($departamento);

        return response()->json([
            'status' => 'success',
            'data' => $zonas
        ]);
    }

    public function cercanas(Request $request): JsonResponse
    {
        $request->validate([
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'radio' => 'nullable|numeric|min:1|max:500'
        ]);

        $zonas = $this->zonaService->obtenerCercanas(
            (float) $request->lat,
            (float) $request->lng,
            (float) $request->query('radio', 50)
        );

        return response()->json([
            'status' => 'success',
            'data' => $zonas
        ]);
    }
}
