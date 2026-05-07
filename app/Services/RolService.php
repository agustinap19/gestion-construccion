<?php

namespace App\Services;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Exception;

class RolService
{
    /**
     * Permisos considerados críticos (solo gerente puede asignarlos).
     */
    private const PERMISOS_CRITICOS = [
        'roles.crear',
        'roles.eliminar',
        'usuarios.crear',
        'usuarios.eliminar',
    ];

    public function __construct(
        protected AuditoriaService $auditoriaService
    ) {}

    /**
     * Lista todos los roles con filtros opcionales.
     */
    public function listarTodos(array $filtros = []): Collection
    {
        $query = Rol::with('permisos')->withCount('usuarios');

        // Filtro de búsqueda
        if (!empty($filtros['busqueda'])) {
            $busqueda = $filtros['busqueda'];
            $query->where(function ($q) use ($busqueda) {
                $q->where('nombre', 'like', "%{$busqueda}%")
                  ->orWhere('nombre_visible', 'like', "%{$busqueda}%");
            });
        }

        // Filtro por tipo
        if (!empty($filtros['tipo']) && $filtros['tipo'] !== 'todos') {
            $esSistema = $filtros['tipo'] === 'sistema';
            $query->where('es_sistema', $esSistema);
        }

        // Filtro por estado
        if (!empty($filtros['estado']) && $filtros['estado'] !== 'todos') {
            $query->where('estado', $filtros['estado']);
        }

        return $query->orderByDesc('es_sistema')->orderBy('nombre_visible')->get();
    }

    /**
     * Obtiene un rol completo con permisos agrupados, usuarios y auditoría.
     */
    public function obtenerCompleto(int $id): array
    {
        $rol = Rol::with('permisos')->withCount('usuarios')->findOrFail($id);

        // Permisos agrupados por módulo
        $permisosAgrupados = $rol->permisos
            ->groupBy('modulo')
            ->map(function ($permisos) {
                return $permisos->sortBy(function ($p) {
                    $orden = ['ver' => 0, 'crear' => 1, 'editar' => 2, 'eliminar' => 3];
                    return $orden[$p->accion] ?? 4;
                })->values();
            })
            ->sortKeys();

        // Usuarios asignados
        $usuarios = User::where('rol_id', $id)
            ->select('id', 'nombre', 'apellido_paterno', 'apellido_materno', 'email', 'foto_url', 'ultimo_acceso')
            ->orderBy('nombre')
            ->get()
            ->map(function ($u) {
                return [
                    'id' => $u->id,
                    'nombre_completo' => trim("{$u->nombre} {$u->apellido_paterno} {$u->apellido_materno}"),
                    'email' => $u->email,
                    'foto_url' => $u->foto_url,
                    'ultimo_acceso' => $u->ultimo_acceso,
                ];
            });

        // Historial de auditoría
        $auditoria = $this->auditoriaService->obtenerPorTabla('roles', $id);

        return [
            'rol' => $rol,
            'permisos_agrupados' => $permisosAgrupados,
            'usuarios' => $usuarios,
            'auditoria' => $auditoria,
        ];
    }

    /**
     * Crea un nuevo rol personalizado.
     */
    public function crear(array $datos, int $actorId): Rol
    {
        // Validar permisos críticos
        if (!empty($datos['permiso_ids'])) {
            if (!$this->validarPermisosCriticos($datos['permiso_ids'], $actorId)) {
                throw new Exception('Solo el gerente puede asignar permisos administrativos críticos.');
            }
        }

        return DB::transaction(function () use ($datos, $actorId) {
            $rol = Rol::create([
                'nombre' => $datos['nombre'],
                'nombre_visible' => $datos['nombre_visible'],
                'descripcion' => $datos['descripcion'] ?? null,
                'es_sistema' => false,
                'estado' => $datos['estado'] ?? 'activo',
            ]);

            // Si se indica copiar permisos de otro rol
            $permisoIds = $datos['permiso_ids'] ?? [];
            if (!empty($datos['copia_de_rol_id'])) {
                $rolOrigen = Rol::with('permisos')->findOrFail($datos['copia_de_rol_id']);
                $permisoIds = array_unique(array_merge($permisoIds, $rolOrigen->permisos->pluck('id')->toArray()));
            }

            // Asignar permisos
            if (!empty($permisoIds)) {
                $rol->permisos()->sync($permisoIds);
            }

            // Registrar auditoría
            $this->auditoriaService->registrar('rol.creado', 'roles', $rol->id, [
                'datos_nuevos' => [
                    'nombre' => $rol->nombre,
                    'nombre_visible' => $rol->nombre_visible,
                    'descripcion' => $rol->descripcion,
                    'permisos_count' => count($permisoIds),
                ],
            ]);

            return $rol->load('permisos')->loadCount('usuarios');
        });
    }

    /**
     * Actualiza un rol existente.
     */
    public function actualizar(int $id, array $datos, int $actorId): Rol
    {
        $rol = Rol::findOrFail($id);

        $datosAnteriores = [
            'nombre_visible' => $rol->nombre_visible,
            'descripcion' => $rol->descripcion,
            'estado' => $rol->estado,
        ];

        // Si es rol de sistema, solo permitir ciertos campos
        if ($rol->es_sistema) {
            $datosActualizables = [
                'nombre_visible' => $datos['nombre_visible'] ?? $rol->nombre_visible,
                'descripcion' => $datos['descripcion'] ?? $rol->descripcion,
                'estado' => $datos['estado'] ?? $rol->estado,
            ];
        } else {
            $datosActualizables = [
                'nombre_visible' => $datos['nombre_visible'] ?? $rol->nombre_visible,
                'descripcion' => $datos['descripcion'] ?? $rol->descripcion,
                'estado' => $datos['estado'] ?? $rol->estado,
            ];
        }

        $rol->update($datosActualizables);

        $datosNuevos = [
            'nombre_visible' => $rol->nombre_visible,
            'descripcion' => $rol->descripcion,
            'estado' => $rol->estado,
        ];

        // Registrar auditoría solo si hubo cambios
        if ($datosAnteriores !== $datosNuevos) {
            $this->auditoriaService->registrar('rol.actualizado', 'roles', $rol->id, [
                'datos_anteriores' => $datosAnteriores,
                'datos_nuevos' => $datosNuevos,
            ]);
        }

        return $rol->load('permisos')->loadCount('usuarios');
    }

    /**
     * Actualiza los permisos de un rol.
     */
    public function actualizarPermisos(int $rolId, array $permisoIds, ?string $razon, int $actorId): Rol
    {
        $rol = Rol::with('permisos')->findOrFail($rolId);

        // Validar permisos críticos
        if (!$this->validarPermisosCriticos($permisoIds, $actorId)) {
            throw new Exception('Solo el gerente puede asignar permisos administrativos críticos.');
        }

        $permisosAnteriores = $rol->permisos->pluck('codigo', 'id')->toArray();
        $permisosNuevosModels = Permiso::whereIn('id', $permisoIds)->pluck('codigo', 'id')->toArray();

        // Calcular diferencias
        $agregados = array_diff_key($permisosNuevosModels, $permisosAnteriores);
        $eliminados = array_diff_key($permisosAnteriores, $permisosNuevosModels);

        // Sincronizar permisos
        $rol->permisos()->sync($permisoIds);

        // Registrar auditoría
        $this->auditoriaService->registrar('rol.permisos_modificados', 'roles', $rol->id, [
            'datos_anteriores' => [
                'permisos' => array_values($permisosAnteriores),
                'total' => count($permisosAnteriores),
            ],
            'datos_nuevos' => [
                'permisos' => array_values($permisosNuevosModels),
                'total' => count($permisosNuevosModels),
                'agregados' => array_values($agregados),
                'eliminados' => array_values($eliminados),
            ],
            'razon' => $razon,
        ]);

        return $rol->load('permisos')->loadCount('usuarios');
    }

    /**
     * Elimina un rol (solo si no es de sistema y no tiene usuarios).
     */
    public function eliminar(int $id, int $actorId): bool
    {
        $rol = Rol::withCount('usuarios')->findOrFail($id);

        if ($rol->es_sistema) {
            throw new Exception('No se puede eliminar un rol del sistema.');
        }

        if ($rol->usuarios_count > 0) {
            throw new Exception("El rol tiene {$rol->usuarios_count} usuarios asignados. Reasígnalos antes de eliminar.");
        }

        // Registrar auditoría antes de eliminar
        $this->auditoriaService->registrar('rol.eliminado', 'roles', $rol->id, [
            'datos_anteriores' => [
                'nombre' => $rol->nombre,
                'nombre_visible' => $rol->nombre_visible,
            ],
        ]);

        // Eliminar permisos asociados y el rol
        $rol->permisos()->detach();
        return $rol->delete();
    }

    /**
     * Duplica un rol existente copiando todos sus permisos.
     */
    public function duplicar(int $rolOrigenId, array $datos, int $actorId): Rol
    {
        $rolOrigen = Rol::with('permisos')->findOrFail($rolOrigenId);

        $permisoIds = $rolOrigen->permisos->pluck('id')->toArray();

        // Validar permisos críticos del rol origen
        if (!$this->validarPermisosCriticos($permisoIds, $actorId)) {
            throw new Exception('Solo el gerente puede duplicar roles con permisos administrativos críticos.');
        }

        return DB::transaction(function () use ($rolOrigen, $datos, $permisoIds, $actorId) {
            $nuevoRol = Rol::create([
                'nombre' => $datos['nombre'],
                'nombre_visible' => $datos['nombre_visible'],
                'descripcion' => $rolOrigen->descripcion,
                'es_sistema' => false,
                'estado' => 'activo',
            ]);

            $nuevoRol->permisos()->sync($permisoIds);

            $this->auditoriaService->registrar('rol.duplicado', 'roles', $nuevoRol->id, [
                'datos_nuevos' => [
                    'nombre' => $nuevoRol->nombre,
                    'nombre_visible' => $nuevoRol->nombre_visible,
                    'rol_origen_id' => $rolOrigen->id,
                    'rol_origen_nombre' => $rolOrigen->nombre_visible,
                    'permisos_copiados' => count($permisoIds),
                ],
            ]);

            return $nuevoRol->load('permisos')->loadCount('usuarios');
        });
    }

    /**
     * Retorna todos los permisos agrupados por módulo.
     */
    public function obtenerPermisosAgrupados(): array
    {
        $permisos = Permiso::orderBy('modulo')->get();

        $agrupados = $permisos->groupBy('modulo')
            ->map(function ($grupo) {
                return $grupo->sortBy(function ($p) {
                    $orden = ['ver' => 0, 'crear' => 1, 'editar' => 2, 'eliminar' => 3];
                    return $orden[$p->accion] ?? 4;
                })->values();
            })
            ->sortKeys()
            ->toArray();

        return $agrupados;
    }

    /**
     * Verifica si los permisos incluyen permisos críticos y si el actor es gerente.
     * Retorna true si está permitido, false si no.
     */
    public function validarPermisosCriticos(array $permisoIds, int $actorId): bool
    {
        // Obtener códigos de los permisos solicitados
        $codigosSolicitados = Permiso::whereIn('id', $permisoIds)->pluck('codigo')->toArray();

        // Verificar si hay permisos críticos
        $tienePermisosCriticos = !empty(array_intersect($codigosSolicitados, self::PERMISOS_CRITICOS));

        if (!$tienePermisosCriticos) {
            return true; // No hay permisos críticos, permitido para todos
        }

        // Verificar si el actor es gerente
        $actor = User::with('rol')->find($actorId);
        if (!$actor || !$actor->rol) {
            return false;
        }

        return $actor->rol->nombre === 'gerente';
    }
}
