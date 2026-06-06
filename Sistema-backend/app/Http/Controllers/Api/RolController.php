<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\Roles\EscaladaPrivilegiosException;
use App\Exceptions\Roles\RolConUsuariosException;
use App\Exceptions\Roles\RolDelSistemaNoEliminableException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Rol\ActualizarPermisosRequest;
use App\Http\Requests\Rol\ActualizarRolRequest;
use App\Http\Requests\Rol\CrearRolRequest;
use App\Models\Rol;
use App\Services\Roles\RolService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class RolController extends Controller
{
    public function __construct(
        protected RolService $rolService
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $filtros = $request->only(['search', 'busqueda', 'tipo', 'estado', 'per_page']);
            // compatibilidad con clave 'busqueda' del frontend legacy
            if (empty($filtros['search']) && !empty($filtros['busqueda'])) {
                $filtros['search'] = $filtros['busqueda'];
            }
            $roles = $this->rolService->listar($filtros);

            return response()->json([
                'status'  => 'success',
                'message' => 'Roles obtenidos exitosamente',
                'data'    => $roles,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error al obtener los roles: ' . $e->getMessage(),
                'data'    => null,
            ], 500);
        }
    }

    public function show(int $id): JsonResponse
    {
        try {
            $rol = Rol::withCount(['usuarios', 'permisos'])->with('permisos')->findOrFail($id);

            $permisosAgrupados = $rol->permisos
                ->groupBy('modulo')
                ->map(function ($permisos) {
                    $orden = ['ver' => 0, 'crear' => 1, 'editar' => 2, 'eliminar' => 3];
                    return $permisos->sortBy(fn($p) => $orden[$p->accion] ?? 4)->values();
                })
                ->sortKeys();

            $usuarios = \App\Models\User::where('rol_id', $id)
                ->select('id', 'nombre', 'apellido_paterno', 'apellido_materno', 'email', 'foto_url', 'ultimo_acceso')
                ->orderBy('nombre')
                ->get()
                ->map(fn($u) => [
                    'id'             => $u->id,
                    'nombre_completo' => trim("{$u->nombre} {$u->apellido_paterno} {$u->apellido_materno}"),
                    'email'          => $u->email,
                    'foto_url'       => $u->foto_url,
                    'ultimo_acceso'  => $u->ultimo_acceso,
                ]);

            return response()->json([
                'status'  => 'success',
                'message' => 'Rol obtenido exitosamente',
                'data'    => [
                    'rol'               => $rol,
                    'permisos_agrupados' => $permisosAgrupados,
                    'usuarios'          => $usuarios,
                ],
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error al obtener el rol: ' . $e->getMessage(),
                'data'    => null,
            ], 404);
        }
    }

    public function permisosAgrupados(): JsonResponse
    {
        try {
            $permisos = \App\Models\Permiso::orderBy('modulo')->get();

            $orden = ['ver' => 0, 'crear' => 1, 'editar' => 2, 'eliminar' => 3];

            $agrupados = $permisos->groupBy('modulo')
                ->map(function ($grupo) use ($orden) {
                    return $grupo->sortBy(fn($p) => $orden[$p->accion] ?? 4)->values();
                })
                ->sortKeys()
                ->toArray();

            return response()->json([
                'status'  => 'success',
                'message' => 'Permisos obtenidos exitosamente',
                'data'    => $agrupados,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error al obtener los permisos: ' . $e->getMessage(),
                'data'    => null,
            ], 500);
        }
    }

    public function matrizPermisos(): JsonResponse
    {
        try {
            $matriz = $this->rolService->matrizPermisos();

            return response()->json([
                'status'  => 'success',
                'message' => 'Matriz de permisos obtenida exitosamente',
                'data'    => $matriz,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error al obtener la matriz de permisos: ' . $e->getMessage(),
                'data'    => null,
            ], 500);
        }
    }

    private function slugificar(string $texto): string
    {
        $texto = mb_strtolower($texto, 'UTF-8');
        $mapa  = ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ü'=>'u','ñ'=>'n',
                  'à'=>'a','è'=>'e','ì'=>'i','ò'=>'o','ù'=>'u'];
        $texto = strtr($texto, $mapa);
        $texto = preg_replace('/[^a-z0-9]+/', '_', $texto);
        return trim($texto, '_');
    }

    private function nombreUnico(string $base): string
    {
        $slug = $this->slugificar($base);
        $slug = mb_substr($slug, 0, 45);
        $candidato = $slug;
        $i = 2;
        while (\App\Models\Rol::withTrashed()->where('nombre', $candidato)->exists()) {
            $candidato = "{$slug}_{$i}";
            $i++;
        }
        return $candidato;
    }

    public function store(CrearRolRequest $request): JsonResponse
    {
        try {
            $datos = $request->only(['nombre_visible', 'descripcion']);
            $datos['nombre'] = $this->nombreUnico($datos['nombre_visible']);
            $permisosIds = $request->input('permiso_ids', []);
            $actor      = $request->user();

            $rol = $this->rolService->crear($datos, $permisosIds, $actor);

            return response()->json([
                'status'  => 'success',
                'message' => 'Rol creado exitosamente',
                'data'    => $rol,
            ], 201);
        } catch (EscaladaPrivilegiosException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'data'    => null,
            ], 403);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error de validación',
                'errors'  => $e->errors(),
                'data'    => null,
            ], 422);
        } catch (Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error al crear el rol: ' . $e->getMessage(),
                'data'    => null,
            ], 422);
        }
    }

    public function update(ActualizarRolRequest $request, int $id): JsonResponse
    {
        try {
            $rol         = Rol::findOrFail($id);
            $datos       = $request->only(['nombre_visible', 'descripcion']);
            $permisosIds = $request->input('permiso_ids', $rol->permisos->pluck('id')->toArray());
            $actor       = $request->user();

            $rol = $this->rolService->actualizar($rol, $datos, $permisosIds, $actor);

            return response()->json([
                'status'  => 'success',
                'message' => 'Rol actualizado exitosamente',
                'data'    => $rol,
            ]);
        } catch (EscaladaPrivilegiosException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'data'    => null,
            ], 403);
        } catch (Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error al actualizar el rol: ' . $e->getMessage(),
                'data'    => null,
            ], 500);
        }
    }

    public function cambiarEstado(Request $request, int $id): JsonResponse
    {
        try {
            $rol   = Rol::findOrFail($id);
            $actor = $request->user();

            $rol = $this->rolService->cambiarEstado($rol, $actor);

            return response()->json([
                'status'  => 'success',
                'message' => "Rol {$rol->estado} exitosamente",
                'data'    => $rol,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error al cambiar estado del rol: ' . $e->getMessage(),
                'data'    => null,
            ], 500);
        }
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $rol   = Rol::withCount('usuarios')->findOrFail($id);
            $actor = $request->user();

            $this->rolService->eliminar($rol, $actor);

            return response()->json([
                'status'  => 'success',
                'message' => 'Rol eliminado exitosamente',
                'data'    => null,
            ]);
        } catch (RolDelSistemaNoEliminableException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'data'    => null,
            ], 403);
        } catch (RolConUsuariosException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'data'    => null,
            ], 422);
        } catch (Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'data'    => null,
            ], 500);
        }
    }

    public function actualizarPermisos(ActualizarPermisosRequest $request, int $id): JsonResponse
    {
        try {
            $rol         = Rol::with('permisos')->findOrFail($id);
            $permisosIds = $request->input('permiso_ids', []);
            $actor       = $request->user();

            $rol = $this->rolService->actualizar($rol, [], $permisosIds, $actor);

            return response()->json([
                'status'  => 'success',
                'message' => 'Permisos del rol actualizados exitosamente',
                'data'    => $rol,
            ]);
        } catch (EscaladaPrivilegiosException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'data'    => null,
            ], 403);
        } catch (Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error al actualizar permisos: ' . $e->getMessage(),
                'data'    => null,
            ], 422);
        }
    }

    public function duplicar(Request $request, int $id): JsonResponse
    {
        try {
            $request->validate([
                'nombre_visible' => ['required', 'string', 'max:50'],
            ], [
                'nombre_visible.required' => 'El nombre es obligatorio.',
                'nombre_visible.max'      => 'El nombre no puede exceder los 50 caracteres.',
            ]);

            $rolOrigen   = Rol::with('permisos')->findOrFail($id);
            $permisosIds = $rolOrigen->permisos->pluck('id')->toArray();
            $actor       = $request->user();

            $datos = ['nombre_visible' => $request->input('nombre_visible')];
            $datos['nombre']      = $this->nombreUnico($datos['nombre_visible']);
            $datos['descripcion'] = $rolOrigen->descripcion;

            $rol = $this->rolService->crear($datos, $permisosIds, $actor);

            return response()->json([
                'status'  => 'success',
                'message' => 'Rol duplicado exitosamente',
                'data'    => $rol,
            ], 201);
        } catch (EscaladaPrivilegiosException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'data'    => null,
            ], 403);
        } catch (Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error al duplicar el rol: ' . $e->getMessage(),
                'data'    => null,
            ], 422);
        }
    }

    public function usuariosAsignados(Request $request, int $id): JsonResponse
    {
        try {
            $perPage  = $request->input('per_page', 15);
            $usuarios = \App\Models\User::where('rol_id', $id)
                ->select('id', 'nombre', 'apellido_paterno', 'apellido_materno', 'email', 'foto_url', 'estado', 'ultimo_acceso')
                ->orderBy('nombre')
                ->paginate($perPage);

            return response()->json([
                'status'  => 'success',
                'message' => 'Usuarios del rol obtenidos exitosamente',
                'data'    => $usuarios,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error al obtener los usuarios del rol: ' . $e->getMessage(),
                'data'    => null,
            ], 500);
        }
    }
}
