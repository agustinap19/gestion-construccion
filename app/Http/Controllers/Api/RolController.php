<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Rol\ActualizarPermisosRequest;
use App\Http\Requests\Rol\ActualizarRolRequest;
use App\Http\Requests\Rol\CrearRolRequest;
use App\Services\RolService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class RolController extends Controller
{
    public function __construct(
        protected RolService $rolService
    ) {}

    /**
     * GET /api/roles — Lista roles con filtros.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filtros = $request->only(['busqueda', 'tipo', 'estado']);
            $roles = $this->rolService->listarTodos($filtros);

            return response()->json([
                'status' => 'success',
                'message' => 'Roles obtenidos exitosamente',
                'data' => $roles,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener los roles: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * GET /api/roles/{id} — Detalle completo de un rol.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $data = $this->rolService->obtenerCompleto($id);

            return response()->json([
                'status' => 'success',
                'message' => 'Rol obtenido exitosamente',
                'data' => $data,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener el rol: ' . $e->getMessage(),
                'data' => null,
            ], 404);
        }
    }

    /**
     * GET /api/roles/permisos/agrupados — Catálogo de permisos agrupados por módulo.
     */
    public function permisosAgrupados(): JsonResponse
    {
        try {
            $permisos = $this->rolService->obtenerPermisosAgrupados();

            return response()->json([
                'status' => 'success',
                'message' => 'Permisos obtenidos exitosamente',
                'data' => $permisos,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener los permisos: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * POST /api/roles — Crear nuevo rol.
     */
    public function store(CrearRolRequest $request): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $rol = $this->rolService->crear($request->validated(), $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Rol creado exitosamente',
                'data' => $rol,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al crear el rol: ' . $e->getMessage(),
                'data' => null,
            ], 422);
        }
    }

    /**
     * PUT /api/roles/{id} — Actualizar datos básicos de un rol.
     */
    public function update(ActualizarRolRequest $request, int $id): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $rol = $this->rolService->actualizar($id, $request->validated(), $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Rol actualizado exitosamente',
                'data' => $rol,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al actualizar el rol: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * PATCH /api/roles/{id}/permisos — Actualizar permisos de un rol.
     */
    public function actualizarPermisos(ActualizarPermisosRequest $request, int $id): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $rol = $this->rolService->actualizarPermisos(
                $id,
                $request->input('permiso_ids'),
                $request->input('razon'),
                $actorId
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Permisos del rol actualizados exitosamente',
                'data' => $rol,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al actualizar permisos: ' . $e->getMessage(),
                'data' => null,
            ], 422);
        }
    }

    /**
     * POST /api/roles/{id}/duplicar — Duplicar un rol.
     */
    public function duplicar(Request $request, int $id): JsonResponse
    {
        try {
            $request->validate([
                'nombre' => ['required', 'string', 'max:50', 'regex:/^[a-z_]+$/', 'unique:roles,nombre'],
                'nombre_visible' => ['required', 'string', 'max:80'],
            ], [
                'nombre.required' => 'El nombre interno es obligatorio.',
                'nombre.regex' => 'El nombre interno solo puede contener letras minúsculas y guiones bajos.',
                'nombre.unique' => 'Ya existe un rol con ese nombre interno.',
                'nombre_visible.required' => 'El nombre visible es obligatorio.',
            ]);

            $actorId = $request->user()->id;
            $rol = $this->rolService->duplicar($id, $request->only(['nombre', 'nombre_visible']), $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Rol duplicado exitosamente',
                'data' => $rol,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al duplicar el rol: ' . $e->getMessage(),
                'data' => null,
            ], 422);
        }
    }

    /**
     * DELETE /api/roles/{id} — Eliminar un rol.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $this->rolService->eliminar($id, $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Rol eliminado exitosamente',
                'data' => null,
            ], 200);
        } catch (Exception $e) {
            $statusCode = str_contains($e->getMessage(), 'sistema') || str_contains($e->getMessage(), 'usuarios asignados') ? 422 : 500;
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null,
            ], $statusCode);
        }
    }

    /**
     * GET /api/roles/{id}/usuarios — Usuarios asignados a un rol.
     */
    public function usuariosAsignados(Request $request, int $id): JsonResponse
    {
        try {
            $perPage = $request->input('per_page', 15);
            $usuarios = \App\Models\User::where('rol_id', $id)
                ->select('id', 'nombre', 'apellido_paterno', 'apellido_materno', 'email', 'foto_url', 'estado', 'ultimo_acceso')
                ->orderBy('nombre')
                ->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'message' => 'Usuarios del rol obtenidos exitosamente',
                'data' => $usuarios,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener los usuarios del rol: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }
}
