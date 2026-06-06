<?php

namespace App\Services\Roles;

use App\Exceptions\Roles\EscaladaPrivilegiosException;
use App\Exceptions\Roles\RolConUsuariosException;
use App\Exceptions\Roles\RolDelSistemaNoEliminableException;
use App\Models\NotificacionSistema;
use App\Models\Permiso;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RolService
{
    public function listar(array $filtros = []): LengthAwarePaginator
    {
        $query = Rol::withCount(['usuarios', 'permisos'])->with('permisos');

        if (!empty($filtros['search'])) {
            $s = $filtros['search'];
            $query->where(function ($q) use ($s) {
                $q->where('nombre_visible', 'like', "%{$s}%")
                  ->orWhere('nombre', 'like', "%{$s}%");
            });
        }

        if (!empty($filtros['estado']) && $filtros['estado'] !== 'todos') {
            $query->where('estado', $filtros['estado']);
        }

        if (!empty($filtros['tipo']) && $filtros['tipo'] !== 'todos') {
            $esSistema = $filtros['tipo'] === 'sistema';
            $query->where('es_sistema', $esSistema);
        }

        return $query->orderByDesc('es_sistema')->orderBy('nombre_visible')->paginate(
            $filtros['per_page'] ?? 50
        );
    }

    public function crear(array $datos, array $permisosIds, User $actor): Rol
    {
        if (Rol::where('nombre', $datos['nombre'])->exists()) {
            throw ValidationException::withMessages([
                'nombre' => ['Ya existe un rol con ese nombre interno.'],
            ]);
        }

        $permisosIds = $this->aplicarDependenciaPermisos($permisosIds);
        $this->validarAntiEscalada($permisosIds, $actor);

        return DB::transaction(function () use ($datos, $permisosIds, $actor) {
            $rol = Rol::create([
                'nombre'         => $datos['nombre'],
                'nombre_visible' => $datos['nombre_visible'],
                'descripcion'    => $datos['descripcion'] ?? null,
                'es_sistema'     => false,
                'estado'         => 'activo',
            ]);

            $rol->permisos()->attach($permisosIds);

            $this->registrarNotificacion(
                $actor->id,
                'seguridad',
                'Nuevo rol creado',
                "Se creó el rol \"{$rol->nombre_visible}\" con " . count($permisosIds) . " permiso(s)."
            );

            return $rol->load('permisos')->loadCount('usuarios');
        });
    }

    public function actualizar(Rol $rol, array $datos, array $permisosIds, User $actor): Rol
    {
        $permisosIds = $this->aplicarDependenciaPermisos($permisosIds);
        $this->validarAntiEscalada($permisosIds, $actor);

        $datosActualizables = [
            'nombre_visible' => $datos['nombre_visible'] ?? $rol->nombre_visible,
            'descripcion'    => $datos['descripcion'] ?? $rol->descripcion,
        ];

        if (!$rol->es_sistema && isset($datos['estado'])) {
            $datosActualizables['estado'] = $datos['estado'];
        }

        $permisosAnteriores = $rol->permisos->pluck('id')->toArray();
        $agregados = array_diff($permisosIds, $permisosAnteriores);
        $removidos = array_diff($permisosAnteriores, $permisosIds);

        return DB::transaction(function () use ($rol, $datosActualizables, $permisosIds, $agregados, $removidos, $actor) {
            $rol->update($datosActualizables);
            $rol->permisos()->sync($permisosIds);

            $detalle = '';
            if (!empty($agregados)) {
                $detalle .= 'Permisos agregados: ' . count($agregados) . '. ';
            }
            if (!empty($removidos)) {
                $detalle .= 'Permisos removidos: ' . count($removidos) . '.';
            }

            $this->registrarNotificacion(
                $actor->id,
                'seguridad',
                "Rol actualizado: {$rol->nombre_visible}",
                trim($detalle) ?: 'Sin cambios en permisos.'
            );

            return $rol->load('permisos')->loadCount('usuarios');
        });
    }

    public function cambiarEstado(Rol $rol, User $actor): Rol
    {
        $nuevoEstado = $rol->estado === 'activo' ? 'inactivo' : 'activo';
        $cantidadUsuarios = $rol->usuarios()->count();

        $rol->update(['estado' => $nuevoEstado]);

        $mensaje = "Rol \"{$rol->nombre_visible}\" cambiado a {$nuevoEstado}.";
        if ($cantidadUsuarios > 0 && $nuevoEstado === 'inactivo') {
            $mensaje .= " Tiene {$cantidadUsuarios} usuario(s) asignado(s); no podrá asignarse a nuevos usuarios.";
        }

        $this->registrarNotificacion($actor->id, 'seguridad', 'Estado de rol modificado', $mensaje);

        return $rol->fresh()->loadCount('usuarios');
    }

    public function eliminar(Rol $rol, User $actor): void
    {
        if ($rol->es_sistema) {
            throw new RolDelSistemaNoEliminableException($rol->nombre_visible);
        }

        $cantidadUsuarios = $rol->usuarios()->count();
        if ($cantidadUsuarios > 0) {
            throw new RolConUsuariosException($cantidadUsuarios);
        }

        DB::transaction(function () use ($rol, $actor) {
            $nombre = $rol->nombre_visible;
            $rol->permisos()->detach();
            $rol->delete();

            $this->registrarNotificacion(
                $actor->id,
                'seguridad',
                'Rol eliminado',
                "El rol \"{$nombre}\" fue eliminado del sistema."
            );
        });
    }

    public function matrizPermisos(): array
    {
        $permisos = Permiso::orderBy('modulo')->orderBy('accion')->get();

        $orden = ['ver' => 0, 'crear' => 1, 'editar' => 2, 'eliminar' => 3];

        return $permisos->groupBy('modulo')
            ->map(function ($grupo, $modulo) use ($orden) {
                return [
                    'modulo'   => $modulo,
                    'permisos' => $grupo->sortBy(fn($p) => $orden[$p->accion] ?? 4)
                        ->values()
                        ->map(fn($p) => [
                            'id'      => $p->id,
                            'codigo'  => $p->codigo,
                            'nombre'  => $p->nombre_visible ?? $p->nombre,
                            'accion'  => $p->accion,
                        ])
                        ->toArray(),
                ];
            })
            ->sortKeys()
            ->values()
            ->toArray();
    }

    private function aplicarDependenciaPermisos(array $permisosIds): array
    {
        if (empty($permisosIds)) {
            return $permisosIds;
        }

        $permisos = Permiso::whereIn('id', $permisosIds)->get()->keyBy('id');
        $todosPermisos = Permiso::all()->keyBy('codigo');

        $idsAdicionales = [];

        foreach ($permisos as $permiso) {
            if ($permiso->accion && $permiso->accion !== 'ver') {
                $codigoVer = $permiso->modulo . '.ver';
                if (isset($todosPermisos[$codigoVer])) {
                    $idsAdicionales[] = $todosPermisos[$codigoVer]->id;
                }
            }
        }

        return array_unique(array_merge($permisosIds, $idsAdicionales));
    }

    private function validarAntiEscalada(array $permisosIds, User $actor): void
    {
        if (empty($permisosIds)) {
            return;
        }

        $rolActor = $actor->rol?->nombre;
        if (in_array($rolActor, ['gerente', 'super_admin']) || $actor->es_admin_central) {
            return;
        }

        $permisosActor = $actor->getPermisos()->toArray();
        $codigosSolicitados = Permiso::whereIn('id', $permisosIds)->pluck('codigo')->toArray();

        $noAutorizados = array_diff($codigosSolicitados, $permisosActor);
        if (!empty($noAutorizados)) {
            throw new EscaladaPrivilegiosException();
        }
    }

    private function registrarNotificacion(int $usuarioId, string $tipo, string $titulo, string $mensaje): void
    {
        try {
            NotificacionSistema::create([
                'usuario_id' => $usuarioId,
                'tipo'       => $tipo,
                'titulo'     => $titulo,
                'mensaje'    => $mensaje,
                'leida'      => false,
            ]);
        } catch (\Throwable) {
        }
    }
}
