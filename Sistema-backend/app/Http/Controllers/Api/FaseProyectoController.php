<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fases\CrearFaseRequest;
use App\Http\Requests\Fases\ActualizarFaseRequest;
use App\Http\Requests\Fases\CambiarEstadoFaseRequest;
use App\Services\Proyectos\FaseProyectoService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FaseProyectoController extends Controller
{
    protected FaseProyectoService $service;

    public function __construct(FaseProyectoService $service)
    {
        $this->service = $service;
    }

    public function indexPorProyecto(int $proyectoId): JsonResponse
    {
        $fases = $this->service->listarPorProyecto($proyectoId);
        return response()->json(['status' => 'success', 'data' => $fases]);
    }

    public function show(int $id): JsonResponse
    {
        $data = $this->service->obtenerCompleta($id);
        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(CrearFaseRequest $request, int $proyectoId): JsonResponse
    {
        $datos = array_merge($request->validated(), ['proyecto_id' => $proyectoId]);
        $fase = $this->service->crear($datos, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $fase, 'message' => 'Fase creada.'], 201);
    }

    public function update(ActualizarFaseRequest $request, int $id): JsonResponse
    {
        $fase = $this->service->actualizar($id, $request->validated(), $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $fase, 'message' => 'Fase actualizada.']);
    }

    public function cambiarEstado(CambiarEstadoFaseRequest $request, int $id): JsonResponse
    {
        $fase = $this->service->cambiarEstado($id, $request->estado, $request->razon, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $fase, 'message' => 'Estado de fase actualizado.']);
    }

    public function actualizarAvance(Request $request, int $id): JsonResponse
    {
        $request->validate(['porcentaje' => 'required|numeric|min:0|max:100']);
        $fase = $this->service->actualizarAvanceInterno($id, $request->porcentaje, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $fase, 'message' => 'Avance actualizado.']);
    }

    public function reordenar(Request $request, int $proyectoId): JsonResponse
    {
        $request->validate(['orden' => 'required|array|min:1', 'orden.*' => 'integer|exists:fases_proyecto,id']);
        $fases = $this->service->reordenar($proyectoId, $request->orden, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $fases, 'message' => 'Fases reordenadas.']);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $request->validate(['razon' => 'required|string|min:5']);
        $this->service->eliminar($id, $request->user()->id, $request->razon);
        return response()->json(['status' => 'success', 'message' => 'Fase eliminada.']);
    }

    public function validarPesos(int $proyectoId): JsonResponse
    {
        $resultado = $this->service->validarSumaPesos($proyectoId);
        return response()->json(['status' => 'success', 'data' => $resultado]);
    }
}
