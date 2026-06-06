<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Viviendas\CrearViviendaRequest;
use App\Http\Requests\Viviendas\ActualizarViviendaRequest;
use App\Http\Requests\Viviendas\CambiarEstadoViviendaRequest;
use App\Services\Proyectos\ViviendaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ViviendaController extends Controller
{
    protected ViviendaService $service;

    public function __construct(ViviendaService $service)
    {
        $this->service = $service;
    }

    public function indexPorProyecto(Request $request, int $proyectoId): JsonResponse
    {
        $filtros = $request->only(['estado', 'busqueda', 'sin_beneficiario', 'con_observaciones']);
        $perPage = $request->input('per_page', 20);
        $viviendas = $this->service->listarPorProyecto($proyectoId, $filtros, $perPage);
        return response()->json($viviendas);
    }

    public function show(int $id): JsonResponse
    {
        $data = $this->service->obtenerCompleta($id);
        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(CrearViviendaRequest $request, int $proyectoId): JsonResponse
    {
        $datos = array_merge($request->validated(), ['proyecto_id' => $proyectoId]);
        $vivienda = $this->service->crear($datos, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $vivienda, 'message' => 'Vivienda creada.'], 201);
    }

    public function crearMultiples(Request $request, int $proyectoId): JsonResponse
    {
        $request->validate([
            'cantidad' => 'required|integer|min:1|max:100',
            'tipo_vivienda_id' => 'nullable|exists:tipos_vivienda,id',
        ]);
        $viviendas = $this->service->crearMultiples($proyectoId, $request->cantidad, $request->tipo_vivienda_id, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $viviendas, 'message' => count($viviendas) . ' viviendas creadas.'], 201);
    }

    public function update(ActualizarViviendaRequest $request, int $id): JsonResponse
    {
        $vivienda = $this->service->actualizar($id, $request->validated(), $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $vivienda, 'message' => 'Vivienda actualizada.']);
    }

    public function cambiarEstado(CambiarEstadoViviendaRequest $request, int $id): JsonResponse
    {
        $vivienda = $this->service->cambiarEstado($id, $request->estado, $request->razon, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $vivienda, 'message' => 'Estado de vivienda actualizado.']);
    }

    public function asignarBeneficiario(Request $request, int $id): JsonResponse
    {
        $request->validate(['beneficiario_id' => 'required|exists:beneficiarios,id']);
        $vivienda = $this->service->asignarBeneficiario($id, $request->beneficiario_id, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $vivienda, 'message' => 'Beneficiario asignado.']);
    }

    public function desasignarBeneficiario(Request $request, int $id): JsonResponse
    {
        $vivienda = $this->service->desasignarBeneficiario($id, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $vivienda, 'message' => 'Beneficiario desasignado.']);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $request->validate(['razon' => 'required|string|min:5']);
        $this->service->eliminar($id, $request->user()->id, $request->razon);
        return response()->json(['status' => 'success', 'message' => 'Vivienda eliminada.']);
    }
}
