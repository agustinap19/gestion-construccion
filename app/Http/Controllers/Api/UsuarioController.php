<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Usuario\ActualizarUsuarioRequest;
use App\Http\Requests\Usuario\CrearUsuarioRequest;
use App\Services\UsuarioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class UsuarioController extends Controller
{
    public function __construct(
        protected UsuarioService $usuarioService
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $filtros = $request->only(['search', 'rol_id', 'estado']);
            $usuarios = $this->usuarioService->listar($filtros, $request->input('per_page', 15));

            return response()->json([
                'status' => 'success',
                'message' => 'Usuarios obtenidos exitosamente',
                'data' => $usuarios
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener usuarios: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function show(int $id): JsonResponse
    {
        try {
            $usuario = $this->usuarioService->obtener($id);

            return response()->json([
                'status' => 'success',
                'message' => 'Usuario obtenido exitosamente',
                'data' => $usuario
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener el usuario: ' . $e->getMessage(),
                'data' => null
            ], 404);
        }
    }

    public function store(CrearUsuarioRequest $request): JsonResponse
    {
        try {
            $usuario = $this->usuarioService->crear($request->validated());

            return response()->json([
                'status' => 'success',
                'message' => 'Usuario creado exitosamente. Se han enviado las credenciales por correo.',
                'data' => $usuario
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al crear el usuario: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function update(ActualizarUsuarioRequest $request, int $id): JsonResponse
    {
        try {
            $usuario = $this->usuarioService->actualizar($id, $request->validated());

            return response()->json([
                'status' => 'success',
                'message' => 'Usuario actualizado exitosamente',
                'data' => $usuario
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al actualizar el usuario: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function cambiarEstado(Request $request, int $id): JsonResponse
    {
        try {
            $request->validate([
                'estado' => 'required|in:activo,inactivo,suspendido'
            ]);

            $usuario = $this->usuarioService->cambiarEstado($id, $request->input('estado'));

            return response()->json([
                'status' => 'success',
                'message' => 'Estado del usuario actualizado exitosamente',
                'data' => $usuario
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al actualizar el estado: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function reenviarPassword(int $id): JsonResponse
    {
        try {
            $usuario = $this->usuarioService->reenviarPasswordTemporal($id);

            return response()->json([
                'status' => 'success',
                'message' => 'Nueva contraseña temporal enviada exitosamente',
                'data' => $usuario
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al reenviar la contraseña: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $this->usuarioService->eliminar($id);

            return response()->json([
                'status' => 'success',
                'message' => 'Usuario eliminado exitosamente',
                'data' => null
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al eliminar el usuario: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }
}
