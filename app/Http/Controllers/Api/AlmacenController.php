<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Almacenes\AlmacenService;
use App\Services\Almacenes\StockService;
use Illuminate\Http\Request;
use Exception;

class AlmacenController extends Controller
{
    public function __construct(
        protected AlmacenService $service,
        protected StockService   $stockService
    ) {}

    public function index(Request $request)
    {
        if (!$request->user()->hasPermissionTo('almacenes.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $data = $this->service->listarConFiltros($request->all(), $request->input('per_page', 15));
        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function show(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('almacenes.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        try {
            $data = $this->service->obtenerConStock($id);
            return response()->json(['status' => 'success', 'data' => $data]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 404);
        }
    }

    public function store(Request $request)
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'nombre'             => 'required|string|max:100',
            'tipo'               => 'required|in:central,obra,temporal',
            'proyecto_id'        => 'nullable|integer|exists:proyectos,id',
            'ubicacion'          => 'nullable|string|max:200',
            'descripcion'        => 'nullable|string|max:300',
            'responsable_id'     => 'nullable|integer|exists:personal,id',
            'capacidad_estimada' => 'nullable|numeric|min:0',
            'codigo'             => 'nullable|string|max:20|unique:almacenes,codigo',
        ]);

        try {
            $almacen = $this->service->crear($request->all(), $request->user()->id);
            return response()->json(['status' => 'success', 'message' => 'Almacén creado.', 'data' => $almacen], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function update(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'nombre'             => 'sometimes|string|max:100',
            'ubicacion'          => 'nullable|string|max:200',
            'descripcion'        => 'nullable|string|max:300',
            'responsable_id'     => 'nullable|integer|exists:personal,id',
            'capacidad_estimada' => 'nullable|numeric|min:0',
        ]);

        try {
            $almacen = $this->service->actualizar($id, $request->all(), $request->user()->id);
            return response()->json(['status' => 'success', 'message' => 'Almacén actualizado.', 'data' => $almacen]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function cambiarEstado(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate(['estado' => 'required|in:activo,inactivo,cerrado']);

        try {
            $almacen = $this->service->cambiarEstado($id, $request->input('estado'), $request->user()->id);
            return response()->json(['status' => 'success', 'data' => $almacen]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function estadisticas(Request $request)
    {
        if (!$request->user()->hasPermissionTo('almacenes.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        return response()->json(['status' => 'success', 'data' => $this->service->estadisticasResumen()]);
    }

    // ─── Movimientos de stock ────────────────────────────────────────────────

    public function registrarEntrada(Request $request, int $almacenId)
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'material_id'     => 'required|integer|exists:materiales,id',
            'cantidad'        => 'required|numeric|min:0.0001',
            'precio_unitario' => 'required|numeric|min:0',
            'concepto'        => 'required|string|max:200',
            'referencia_tipo' => 'nullable|string|max:50',
            'referencia_id'   => 'nullable|integer',
        ]);

        try {
            $mov = $this->stockService->registrarEntrada(
                $almacenId,
                $request->integer('material_id'),
                (float) $request->input('cantidad'),
                (float) $request->input('precio_unitario'),
                $request->input('concepto'),
                $request->user()->id,
                $request->input('referencia_tipo'),
                $request->input('referencia_id')
            );
            return response()->json(['status' => 'success', 'data' => $mov], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function registrarSalida(Request $request, int $almacenId)
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'material_id'     => 'required|integer|exists:materiales,id',
            'cantidad'        => 'required|numeric|min:0.0001',
            'concepto'        => 'required|string|max:200',
            'referencia_tipo' => 'nullable|string|max:50',
            'referencia_id'   => 'nullable|integer',
        ]);

        try {
            $mov = $this->stockService->registrarSalida(
                $almacenId,
                $request->integer('material_id'),
                (float) $request->input('cantidad'),
                $request->input('concepto'),
                $request->user()->id,
                $request->input('referencia_tipo'),
                $request->input('referencia_id')
            );
            return response()->json(['status' => 'success', 'data' => $mov], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function transferir(Request $request)
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'almacen_origen_id'  => 'required|integer|exists:almacenes,id',
            'almacen_destino_id' => 'required|integer|exists:almacenes,id|different:almacen_origen_id',
            'material_id'        => 'required|integer|exists:materiales,id',
            'cantidad'           => 'required|numeric|min:0.0001',
            'concepto'           => 'required|string|max:200',
        ]);

        try {
            $movs = $this->stockService->transferir(
                $request->integer('almacen_origen_id'),
                $request->integer('almacen_destino_id'),
                $request->integer('material_id'),
                (float) $request->input('cantidad'),
                $request->input('concepto'),
                $request->user()->id
            );
            return response()->json(['status' => 'success', 'data' => $movs], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function ajustar(Request $request, int $almacenId)
    {
        if (!$request->user()->hasPermissionTo('almacenes.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'material_id'   => 'required|integer|exists:materiales,id',
            'cantidad_real' => 'required|numeric|min:0',
            'motivo'        => 'required|string|max:200',
        ]);

        try {
            $mov = $this->stockService->registrarAjuste(
                $almacenId,
                $request->integer('material_id'),
                (float) $request->input('cantidad_real'),
                $request->input('motivo'),
                $request->user()->id
            );
            return response()->json(['status' => 'success', 'data' => $mov], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function kardex(Request $request, int $almacenId, int $materialId)
    {
        if (!$request->user()->hasPermissionTo('almacenes.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $movimientos = \App\Models\MovimientoMaterial::with('registradoPor:id,name')
            ->where('almacen_id', $almacenId)
            ->where('material_id', $materialId)
            ->orderBy('fecha_movimiento')
            ->orderBy('id')
            ->paginate($request->input('per_page', 50));

        return response()->json(['status' => 'success', 'data' => $movimientos]);
    }
}
