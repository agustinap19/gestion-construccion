<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Proyectos\AsignacionPersonalService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AsignacionPersonalController extends Controller
{
    protected AsignacionPersonalService $service;

    public function __construct(AsignacionPersonalService $service)
    {
        $this->service = $service;
    }

    public function indexPorProyecto(int $proyectoId): JsonResponse
    {
        $asignaciones = $this->service->listarPorProyecto($proyectoId);
        return response()->json(['status' => 'success', 'data' => $asignaciones]);
    }

    public function store(Request $request, int $proyectoId): JsonResponse
    {
        $request->validate([
            'personal_id'             => 'required|exists:personal,id',
            'rol_id'                  => 'required|exists:roles,id',
            'responsabilidades'       => 'nullable|string|max:1000',
            'es_responsable_principal' => 'nullable|boolean',
            'fecha_inicio'            => 'nullable|date',
        ]);
        $datos = array_merge(
            $request->only(['personal_id', 'rol_id', 'responsabilidades', 'es_responsable_principal', 'fecha_inicio']),
            ['proyecto_id' => $proyectoId]
        );
        $asignacion = $this->service->asignar($datos, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $asignacion, 'message' => 'Personal asignado.'], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'rol_id'           => 'sometimes|exists:roles,id',
            'responsabilidades' => 'nullable|string|max:1000',
        ]);
        $asignacion = $this->service->actualizar($id, $request->only(['rol_id', 'responsabilidades']), $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $asignacion, 'message' => 'Asignación actualizada.']);
    }

    public function finalizar(Request $request, int $id): JsonResponse
    {
        $asignacion = $this->service->finalizar($id, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $asignacion, 'message' => 'Asignación finalizada.']);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->service->eliminar($id, $request->user()->id);
        return response()->json(['status' => 'success', 'message' => 'Asignación eliminada.']);
    }
}
