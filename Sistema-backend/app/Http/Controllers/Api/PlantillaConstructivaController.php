<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Almacenes\PlantillaConstructivaService;
use Illuminate\Http\Request;
use Exception;

class PlantillaConstructivaController extends Controller
{
    public function __construct(protected PlantillaConstructivaService $service) {}

    public function index(Request $request)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        return response()->json(['status' => 'success', 'data' => $this->service->listar($request->all())]);
    }

    public function show(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        try {
            return response()->json(['status' => 'success', 'data' => $this->service->obtener($id)]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 404);
        }
    }

    public function store(Request $request)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        $request->validate([
            'nombre'    => 'required|string|max:150',
            'tipo_obra' => 'required|in:vivienda_social,casa_privada,edificio,remodelacion,otro',
            'tipologia' => 'nullable|string|max:50',
            'items'     => 'nullable|array',
            'items.*.item_constructivo_id' => 'required|integer|exists:items_constructivos,id',
            'items.*.ponderacion_avance'   => 'required|numeric|min:0|max:100',
            'items.*.cantidad_sugerida'    => 'nullable|numeric|min:0',
            'items.*.orden'                => 'nullable|integer|min:0',
        ]);

        try {
            $p = $this->service->crear($request->all(), $request->user()->id);
            return response()->json(['status' => 'success', 'message' => 'Plantilla creada.', 'data' => $p], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function update(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        $request->validate([
            'nombre'    => 'sometimes|string|max:150',
            'tipo_obra' => 'sometimes|in:vivienda_social,casa_privada,edificio,remodelacion,otro',
            'items'     => 'nullable|array',
            'items.*.item_constructivo_id' => 'required|integer|exists:items_constructivos,id',
            'items.*.ponderacion_avance'   => 'required|numeric|min:0|max:100',
        ]);

        try {
            $p = $this->service->actualizar($id, $request->all(), $request->user()->id);
            return response()->json(['status' => 'success', 'data' => $p]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function duplicar(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        try {
            $p = $this->service->duplicar($id, $request->user()->id);
            return response()->json(['status' => 'success', 'message' => 'Plantilla duplicada.', 'data' => $p], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function destroy(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        try {
            $this->service->eliminar($id);
            return response()->json(['status' => 'success', 'message' => 'Plantilla eliminada.']);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function cambiarEstado(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        $request->validate(['estado' => 'required|boolean']);
        try {
            $p = $this->service->cambiarEstado($id, (bool) $request->input('estado'), $request->user()->id);
            return response()->json(['status' => 'success', 'data' => $p]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
}
