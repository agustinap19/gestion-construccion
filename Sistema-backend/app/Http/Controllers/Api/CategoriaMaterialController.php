<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Almacenes\CategoriaMaterialService;
use Illuminate\Http\Request;
use Exception;

class CategoriaMaterialController extends Controller
{
    protected CategoriaMaterialService $service;

    public function __construct(CategoriaMaterialService $service)
    {
        $this->service = $service;
    }

    public function index()
    {
        $categorias = $this->service->obtenerTodas();
        return response()->json([
            'status' => 'success',
            'data' => $categorias
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'color' => 'nullable|string|max:20',
        ]);

        try {
            $categoria = $this->service->crear($request->all(), $request->user()->id);
            return response()->json([
                'status' => 'success',
                'message' => 'Categoría creada exitosamente',
                'data' => $categoria
            ], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'color' => 'nullable|string|max:20',
            'activo' => 'boolean',
        ]);

        try {
            $categoria = $this->service->actualizar($id, $request->all(), $request->user()->id);
            return response()->json([
                'status' => 'success',
                'message' => 'Categoría actualizada',
                'data' => $categoria
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $this->service->eliminar($id, $request->user()->id);
            return response()->json([
                'status' => 'success',
                'message' => 'Categoría eliminada'
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
}
