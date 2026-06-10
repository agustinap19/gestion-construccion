<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Proveedores\ProveedorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class ProveedorController extends Controller
{
    public function __construct(private ProveedorService $service) {}

    public function index(Request $request): JsonResponse
    {
        $data = $this->service->listarConFiltros(
            $request->only(['busqueda', 'estado', 'tipo', 'categoria_id']),
            (int) $request->get('per_page', 15)
        );
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function show(int $id): JsonResponse
    {
        try {
            $proveedor = $this->service->obtener($id);
            return response()->json(['success' => true, 'data' => $proveedor]);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'codigo'             => 'nullable|string|max:20|unique:proveedores,codigo',
            'razon_social'       => 'required|string|max:200',
            'nombre_comercial'   => 'nullable|string|max:200',
            'nit'                => 'nullable|string|max:30|unique:proveedores,nit',
            'categoria_id'       => 'nullable|exists:categorias_proveedor,id',
            'tipo'               => 'required|in:persona_natural,empresa',
            'contacto_nombre'    => 'nullable|string|max:100',
            'contacto_telefono'  => 'nullable|string|max:20',
            'contacto_email'     => 'nullable|email|max:100',
            'telefono_principal' => 'nullable|string|max:20',
            'email_oficial'      => 'nullable|email|max:100',
            'direccion'          => 'nullable|string|max:500',
            'zona_id'            => 'nullable|exists:zonas_geograficas,id',
            'sitio_web'          => 'nullable|url|max:200',
            'productos_servicios'=> 'nullable|string',
            'calificacion'       => 'nullable|numeric|between:0,5',
            'observaciones'      => 'nullable|string',
        ]);

        try {
            $proveedor = $this->service->crear($validated, $request->user()->id);
            return response()->json(['success' => true, 'data' => $proveedor, 'message' => 'Proveedor creado correctamente.'], 201);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'razon_social'       => 'required|string|max:200',
            'nombre_comercial'   => 'nullable|string|max:200',
            'nit'                => "nullable|string|max:30|unique:proveedores,nit,{$id}",
            'categoria_id'       => 'nullable|exists:categorias_proveedor,id',
            'tipo'               => 'required|in:persona_natural,empresa',
            'contacto_nombre'    => 'nullable|string|max:100',
            'contacto_telefono'  => 'nullable|string|max:20',
            'contacto_email'     => 'nullable|email|max:100',
            'telefono_principal' => 'nullable|string|max:20',
            'email_oficial'      => 'nullable|email|max:100',
            'direccion'          => 'nullable|string|max:500',
            'zona_id'            => 'nullable|exists:zonas_geograficas,id',
            'sitio_web'          => 'nullable|url|max:200',
            'productos_servicios'=> 'nullable|string',
            'calificacion'       => 'nullable|numeric|between:0,5',
            'observaciones'      => 'nullable|string',
        ]);

        try {
            $proveedor = $this->service->actualizar($id, $validated);
            return response()->json(['success' => true, 'data' => $proveedor, 'message' => 'Proveedor actualizado correctamente.']);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function cambiarEstado(Request $request, int $id): JsonResponse
    {
        $request->validate(['estado' => 'required|in:activo,inactivo,bloqueado']);

        try {
            $proveedor = $this->service->cambiarEstado($id, $request->estado);
            return response()->json(['success' => true, 'data' => $proveedor, 'message' => 'Estado actualizado.']);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function estadisticas(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->service->estadisticas()]);
    }

    public function categorias(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->service->categorias()]);
    }

    public function crearCategoria(Request $request): JsonResponse
    {
        $request->validate(['nombre' => 'required|string|max:100|unique:categorias_proveedor,nombre']);
        try {
            $cat = $this->service->crearCategoria($request->nombre, $request->descripcion);
            return response()->json(['success' => true, 'data' => $cat], 201);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function zonas(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->service->zonas()]);
    }
}
