<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permiso;
use App\Models\Rol;

class PermisoActivosSeeder extends Seeder
{
    public function run(): void
    {
        $permisos = [
            [
                'codigo'         => 'activos.ver',
                'nombre'         => 'activos.ver',
                'nombre_visible' => 'Ver Activos',
                'modulo'         => 'activos',
                'accion'         => 'ver',
                'descripcion'    => 'Ver listado y detalle de maquinaria, equipos y herramientas',
            ],
            [
                'codigo'         => 'activos.crear',
                'nombre'         => 'activos.crear',
                'nombre_visible' => 'Crear Activos',
                'modulo'         => 'activos',
                'accion'         => 'crear',
                'descripcion'    => 'Registrar nueva maquinaria, equipos y herramientas',
            ],
            [
                'codigo'         => 'activos.editar',
                'nombre'         => 'activos.editar',
                'nombre_visible' => 'Editar Activos',
                'modulo'         => 'activos',
                'accion'         => 'editar',
                'descripcion'    => 'Editar información de activos existentes',
            ],
            [
                'codigo'         => 'activos.eliminar',
                'nombre'         => 'activos.eliminar',
                'nombre_visible' => 'Eliminar Activos',
                'modulo'         => 'activos',
                'accion'         => 'eliminar',
                'descripcion'    => 'Dar de baja (soft delete) activos del sistema',
            ],
            [
                'codigo'         => 'activos.asignar',
                'nombre'         => 'activos.asignar',
                'nombre_visible' => 'Asignar Activos',
                'modulo'         => 'activos',
                'accion'         => 'asignar',
                'descripcion'    => 'Asignar activos a proyectos o viviendas',
            ],
            [
                'codigo'         => 'activos.mantenimiento',
                'nombre'         => 'activos.mantenimiento',
                'nombre_visible' => 'Gestionar Mantenimientos',
                'modulo'         => 'activos',
                'accion'         => 'mantenimiento',
                'descripcion'    => 'Programar y registrar mantenimientos de activos',
            ],
            [
                'codigo'         => 'activos.optimizar',
                'nombre'         => 'activos.optimizar',
                'nombre_visible' => 'Optimizar Asignaciones',
                'modulo'         => 'activos',
                'accion'         => 'optimizar',
                'descripcion'    => 'Generar y aplicar planes de optimización de asignación de activos',
            ],
            [
                'codigo'         => 'activos.configurar',
                'nombre'         => 'activos.configurar',
                'nombre_visible' => 'Configurar Optimización',
                'modulo'         => 'activos',
                'accion'         => 'configurar',
                'descripcion'    => 'Editar parámetros del motor de optimización de activos',
            ],
        ];

        foreach ($permisos as $p) {
            Permiso::firstOrCreate(['codigo' => $p['codigo']], $p);
        }

        // Roles reales del sistema: super_admin, gerente, encargado_finanzas,
        // administrador_proyecto, tecnico_campo, encargado_almacen, obrero.
        $rolesData = [
            'super_admin' => [
                'activos.ver', 'activos.crear', 'activos.editar', 'activos.eliminar',
                'activos.asignar', 'activos.mantenimiento', 'activos.optimizar', 'activos.configurar',
            ],
            'gerente' => [
                'activos.ver', 'activos.crear', 'activos.editar',
                'activos.asignar', 'activos.mantenimiento', 'activos.optimizar',
            ],
            'administrador_proyecto' => [
                'activos.ver', 'activos.crear', 'activos.editar',
                'activos.asignar', 'activos.mantenimiento',
            ],
            'encargado_finanzas' => [
                'activos.ver',
            ],
            'encargado_almacen' => [
                'activos.ver',
            ],
        ];

        foreach ($rolesData as $rolNombre => $codigosPermisos) {
            $rol = Rol::where('nombre', $rolNombre)->first();
            if ($rol) {
                $permisosIds = Permiso::whereIn('codigo', $codigosPermisos)->pluck('id');
                $rol->permisos()->syncWithoutDetaching($permisosIds);
            }
        }
    }
}
