<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Clientes\CrearClienteRequest;
use App\Http\Requests\Clientes\ActualizarClienteRequest;
use App\Http\Requests\Clientes\CambiarEstadoClienteRequest;
use App\Services\Clientes\ClienteService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ClienteController extends Controller
{
    protected $clienteService;

    public function __construct(ClienteService $clienteService)
    {
        $this->clienteService = $clienteService;
    }

    public function index(Request $request): JsonResponse
    {
        $filtros = $request->only([
            'busqueda', 'tipo', 'estado', 'documento_tipo', 'zona_id', 
            'origen', 'con_proyectos', 'creado_desde', 'creado_hasta', 
            'ordenar_por', 'direccion'
        ]);
        $perPage = $request->query('per_page', 20);

        $clientes = $this->clienteService->listarConFiltros($filtros, $perPage);

        return response()->json([
            'status' => 'success',
            'data' => $clientes
        ]);
    }

    public function estadisticas(): JsonResponse
    {
        $estadisticas = $this->clienteService->obtenerEstadisticasGenerales();

        return response()->json([
            'status' => 'success',
            'data' => $estadisticas
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $datos = $this->clienteService->obtenerCompleto($id);

        return response()->json([
            'status' => 'success',
            'data' => $datos
        ]);
    }

    public function store(CrearClienteRequest $request): JsonResponse
    {
        $cliente = $this->clienteService->crear($request->validated(), $request->user()->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Cliente creado exitosamente.',
            'data' => $cliente
        ], 201);
    }

    public function update(ActualizarClienteRequest $request, int $id): JsonResponse
    {
        $cliente = $this->clienteService->actualizar($id, $request->validated(), $request->user()->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Cliente actualizado exitosamente.',
            'data' => $cliente
        ]);
    }

    public function cambiarEstado(CambiarEstadoClienteRequest $request, int $id): JsonResponse
    {
        $cliente = $this->clienteService->cambiarEstado(
            $id,
            $request->estado,
            $request->razon,
            $request->user()->id
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Estado del cliente actualizado exitosamente.',
            'data' => $cliente
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        // Require permiso
        if (!$request->user()->hasPermission('clientes.eliminar')) {
            return response()->json(['status' => 'error', 'message' => 'Operación no permitida.'], 403);
        }

        $razon = $request->input('razon');
        $this->clienteService->eliminar($id, $request->user()->id, $razon);

        return response()->json([
            'status' => 'success',
            'message' => 'Cliente eliminado exitosamente.'
        ]);
    }

    public function restaurar(Request $request, int $id): JsonResponse
    {
        $cliente = $this->clienteService->restaurar($id, $request->user()->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Cliente restaurado exitosamente.',
            'data' => $cliente
        ]);
    }

    public function referidos(int $id): JsonResponse
    {
        // Metodo implementado en el obtenerCompleto, pero acá por si se requiere standalone
        $cliente = \App\Models\Cliente::findOrFail($id);
        $referidos = $cliente->referidos()->get();

        return response()->json([
            'status' => 'success',
            'data' => $referidos
        ]);
    }
}
