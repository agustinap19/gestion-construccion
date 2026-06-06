<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Almacenes\MaterialService;
use Illuminate\Http\Request;
use Exception;

class MaterialController extends Controller
{
    protected MaterialService $service;

    public function __construct(MaterialService $service)
    {
        $this->service = $service;
    }

    public function index(Request $request)
    {
        $materiales = $this->service->listarConFiltros($request->all(), $request->input('per_page', 15));
        
        // Formato para paginación
        return response()->json([
            'status' => 'success',
            'data' => $materiales
        ]);
    }

    public function store(Request $request)
    {
        if (!$request->user()->hasPermissionTo('materiales.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'No tiene permiso para gestionar materiales.'], 403);
        }

        $request->validate([
            'nombre'            => 'required|string|max:50',
            'categoria_id'      => 'required|integer|exists:categorias_material,id',
            'unidad_medida_id'  => 'required_without:nueva_unidad|integer|nullable',
            'nueva_unidad'      => 'required_without:unidad_medida_id|string|max:20|nullable',
            'tipo'              => 'required|in:maestro,especial',
            'proyecto_id'       => 'required_if:tipo,especial|nullable|integer|exists:proyectos,id',
            'precio_referencial'=> 'nullable|numeric|min:0.01',
            'stock_minimo'      => 'nullable|numeric|min:0',
            'marca'             => 'nullable|string|max:40',
            'descripcion'       => 'nullable|string|max:60',
        ]);

        try {
            $material = $this->service->crear($request->all(), $request->user()->id);
            return response()->json([
                'status' => 'success',
                'message' => 'Material creado exitosamente',
                'data' => $material
            ], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function update(Request $request, $id)
    {
        if (!$request->user()->hasPermissionTo('materiales.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'No tiene permiso para gestionar materiales.'], 403);
        }

        $request->validate([
            'nombre'            => 'sometimes|string|max:50',
            'categoria_id'      => 'sometimes|integer|exists:categorias_material,id',
            'tipo'              => 'sometimes|in:maestro,especial',
            'proyecto_id'       => 'required_if:tipo,especial|nullable|integer|exists:proyectos,id',
            'precio_referencial'=> 'nullable|numeric|min:0.01',
            'stock_minimo'      => 'nullable|numeric|min:0',
            'marca'             => 'nullable|string|max:40',
            'descripcion'       => 'nullable|string|max:60',
            'nueva_unidad'      => 'sometimes|string|max:20|nullable',
        ]);

        try {
            $material = $this->service->actualizar($id, $request->all(), $request->user()->id);
            return response()->json([
                'status' => 'success',
                'message' => 'Material actualizado exitosamente',
                'data' => $material
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function cambiarEstado(Request $request, $id)
    {
        if (!$request->user()->hasPermissionTo('materiales.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'No tiene permiso para gestionar materiales.'], 403);
        }

        $request->validate(['activo' => 'required|boolean']);
        
        try {
            $material = $this->service->cambiarEstado($id, $request->activo, $request->user()->id);
            return response()->json([
                'status' => 'success',
                'message' => 'Estado del material actualizado',
                'data' => $material
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function uploadFoto(Request $request)
    {
        $request->validate([
            'imagen' => 'required|image|max:5120' // Max 5MB
        ]);

        try {
            $url = $this->service->guardarImagen($request->file('imagen'));
            return response()->json([
                'status' => 'success',
                'url' => $url
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
