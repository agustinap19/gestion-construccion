<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Entidades\CrearEntidadEstatalRequest;
use App\Http\Requests\Entidades\ActualizarEntidadEstatalRequest;
use App\Http\Requests\Entidades\CambiarEstadoEntidadRequest;
use App\Services\Clientes\EntidadEstatalService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EntidadEstatalController extends Controller
{
    protected $entidadService;

    public function __construct(EntidadEstatalService $entidadService)
    {
        $this->entidadService = $entidadService;
    }

    public function index(Request $request): JsonResponse
    {
        $filtros = $request->only([
            'busqueda', 'nivel', 'estado', 'zona_id', 
            'ordenar_por', 'direccion'
        ]);
        $perPage = $request->query('per_page', 20);

        $entidades = $this->entidadService->listarConFiltros($filtros, $perPage);

        return response()->json([
            'status' => 'success',
            'data' => $entidades
        ]);
    }

    public function estadisticas(): JsonResponse
    {
        $estadisticas = $this->entidadService->obtenerEstadisticasGenerales();

        return response()->json([
            'status' => 'success',
            'data' => $estadisticas
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $datos = $this->entidadService->obtenerCompleto($id);

        return response()->json([
            'status' => 'success',
            'data' => $datos
        ]);
    }

    public function store(CrearEntidadEstatalRequest $request): JsonResponse
    {
        $entidad = $this->entidadService->crear($request->validated(), $request->user()->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Entidad estatal creada exitosamente.',
            'data' => $entidad
        ], 201);
    }

    public function update(ActualizarEntidadEstatalRequest $request, int $id): JsonResponse
    {
        $entidad = $this->entidadService->actualizar($id, $request->validated(), $request->user()->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Entidad estatal actualizada exitosamente.',
            'data' => $entidad
        ]);
    }

    public function cambiarEstado(CambiarEstadoEntidadRequest $request, int $id): JsonResponse
    {
        $entidad = $this->entidadService->cambiarEstado(
            $id,
            $request->estado,
            $request->razon,
            $request->user()->id
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Estado de la entidad estatal actualizado exitosamente.',
            'data' => $entidad
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermission('entidades.eliminar')) {
            return response()->json(['status' => 'error', 'message' => 'Operación no permitida.'], 403);
        }

        $razon = $request->input('razon');
        $this->entidadService->eliminar($id, $request->user()->id, $razon);

        return response()->json([
            'status' => 'success',
            'message' => 'Entidad estatal eliminada exitosamente.'
        ]);
    }

    public function restaurar(Request $request, int $id): JsonResponse
    {
        $entidad = $this->entidadService->restaurar($id, $request->user()->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Entidad estatal restaurada exitosamente.',
            'data' => $entidad
        ]);
    }
}
