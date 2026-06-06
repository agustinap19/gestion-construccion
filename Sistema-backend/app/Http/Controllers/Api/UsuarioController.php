<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Usuario\AccionMasivaRequest;
use App\Http\Requests\Usuario\ActualizarUsuarioRequest;
use App\Http\Requests\Usuario\CambiarEstadoRequest;
use App\Http\Requests\Usuario\CambiarRolRequest;
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
            $filtros = $request->only([
                'busqueda', 'rol_id', 'estado', 'tiene_2fa',
                'con_password_temporal', 'bloqueado', 'ultimo_acceso_dias',
                'ordenar_por', 'direccion'
            ]);
            $usuarios = $this->usuarioService->listarConFiltros($filtros, $request->input('per_page', 15));

            return response()->json([
                'status' => 'success',
                'message' => 'Usuarios obtenidos exitosamente',
                'data' => $usuarios,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener usuarios: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    public function show(int $id): JsonResponse
    {
        try {
            $data = $this->usuarioService->obtenerCompleto($id);

            return response()->json([
                'status' => 'success',
                'message' => 'Usuario obtenido exitosamente',
                'data' => $data,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener el usuario: ' . $e->getMessage(),
                'data' => null,
            ], 404);
        }
    }

    public function store(CrearUsuarioRequest $request): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $usuario = $this->usuarioService->crear($request->validated(), $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Usuario creado exitosamente. Se han enviado las credenciales por correo.',
                'data' => $usuario,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al crear el usuario: ' . $e->getMessage(),
                'data' => null,
            ], 422);
        }
    }

    public function update(ActualizarUsuarioRequest $request, int $id): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $usuario = $this->usuarioService->actualizar($id, $request->validated(), $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Usuario actualizado exitosamente',
                'data' => $usuario,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al actualizar el usuario: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    public function cambiarEstado(CambiarEstadoRequest $request, int $id): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $usuario = $this->usuarioService->cambiarEstado(
                $id, $request->input('estado'), $request->input('razon'), $actorId
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Estado del usuario actualizado exitosamente',
                'data' => $usuario,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null,
            ], 422);
        }
    }

    public function cambiarRol(CambiarRolRequest $request, int $id): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $usuario = $this->usuarioService->cambiarRol(
                $id, $request->input('rol_id'), $request->input('razon'), $actorId
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Rol del usuario actualizado exitosamente',
                'data' => $usuario,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null,
            ], 422);
        }
    }

    public function desbloquear(int $id, Request $request): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $usuario = $this->usuarioService->desbloquearCuenta($id, $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Cuenta desbloqueada exitosamente',
                'data' => $usuario,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    public function reenviarPassword(int $id, Request $request): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $usuario = $this->usuarioService->reenviarPasswordTemporal($id, $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Nueva contraseña temporal enviada exitosamente',
                'data' => $usuario,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    public function cerrarSesion(Request $request, int $id, int $tokenId): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $this->usuarioService->cerrarSesion($id, $tokenId, $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Sesión cerrada exitosamente',
                'data' => null,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    public function cerrarTodasLasSesiones(Request $request, int $id): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $count = $this->usuarioService->cerrarTodasLasSesiones($id, $actorId);

            return response()->json([
                'status' => 'success',
                'message' => "{$count} sesiones cerradas exitosamente",
                'data' => ['sesiones_cerradas' => $count],
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    public function revocarDispositivo(Request $request, int $id, int $dispositivoId): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $this->usuarioService->revocarDispositivo($id, $dispositivoId, $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Dispositivo revocado exitosamente',
                'data' => null,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    public function revocarTodosDispositivos(Request $request, int $id): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $count = $this->usuarioService->revocarTodosDispositivos($id, $actorId);

            return response()->json([
                'status' => 'success',
                'message' => "{$count} dispositivos revocados exitosamente",
                'data' => ['dispositivos_revocados' => $count],
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $this->usuarioService->eliminar($id, $actorId, $request->input('razon'));

            return response()->json([
                'status' => 'success',
                'message' => 'Usuario eliminado exitosamente',
                'data' => null,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    public function restaurar(Request $request, int $id): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $usuario = $this->usuarioService->restaurar($id, $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Usuario restaurado exitosamente',
                'data' => $usuario,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    public function accionMasiva(AccionMasivaRequest $request): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $resultado = $this->usuarioService->accionMasiva(
                $request->input('accion'),
                $request->input('usuario_ids'),
                $request->input('razon'),
                $actorId
            );

            $exitosos = count($resultado['exitosos']);
            $fallidos = count($resultado['fallidos']);

            return response()->json([
                'status' => 'success',
                'message' => "{$exitosos} usuarios procesados exitosamente" . ($fallidos > 0 ? ", {$fallidos} con errores" : ''),
                'data' => $resultado,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }
}
