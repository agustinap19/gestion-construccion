<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permiso;
use App\Models\Rol;

class PermisosProyectoSeeder extends Seeder
{
    public function run(): void
    {
        $permisos = [
            // Proyectos
            ['codigo' => 'proyectos.ver', 'nombre_visible' => 'Ver Proyectos', 'accion' => 'ver', 'modulo' => 'proyectos', 'descripcion' => 'Ver lista y detalle de proyectos'],
            ['codigo' => 'proyectos.crear', 'nombre_visible' => 'Crear Proyectos', 'accion' => 'crear', 'modulo' => 'proyectos', 'descripcion' => 'Crear nuevos proyectos'],
            ['codigo' => 'proyectos.editar', 'nombre_visible' => 'Editar Proyectos', 'accion' => 'editar', 'modulo' => 'proyectos', 'descripcion' => 'Editar datos de proyectos'],
            ['codigo' => 'proyectos.eliminar', 'nombre_visible' => 'Eliminar Proyectos', 'accion' => 'eliminar', 'modulo' => 'proyectos', 'descripcion' => 'Eliminar proyectos'],
            ['codigo' => 'proyectos.cambiar_estado', 'nombre_visible' => 'Cambiar Estado Proyectos', 'accion' => 'cambiar_estado', 'modulo' => 'proyectos', 'descripcion' => 'Cambiar estado de proyectos'],
            ['codigo' => 'proyectos.ver_finanzas', 'nombre_visible' => 'Ver Finanzas Proyectos', 'accion' => 'ver_finanzas', 'modulo' => 'proyectos', 'descripcion' => 'Ver presupuesto y garantías'],

            // Viviendas
            ['codigo' => 'viviendas.ver', 'nombre_visible' => 'Ver Viviendas', 'accion' => 'ver', 'modulo' => 'viviendas', 'descripcion' => 'Ver viviendas de proyectos sociales'],
            ['codigo' => 'viviendas.crear', 'nombre_visible' => 'Crear Viviendas', 'accion' => 'crear', 'modulo' => 'viviendas', 'descripcion' => 'Crear viviendas'],
            ['codigo' => 'viviendas.editar', 'nombre_visible' => 'Editar Viviendas', 'accion' => 'editar', 'modulo' => 'viviendas', 'descripcion' => 'Editar viviendas'],
            ['codigo' => 'viviendas.eliminar', 'nombre_visible' => 'Eliminar Viviendas', 'accion' => 'eliminar', 'modulo' => 'viviendas', 'descripcion' => 'Eliminar viviendas'],
            ['codigo' => 'viviendas.cambiar_estado', 'nombre_visible' => 'Cambiar Estado Viviendas', 'accion' => 'cambiar_estado', 'modulo' => 'viviendas', 'descripcion' => 'Cambiar estado de viviendas'],

            // Fases
            ['codigo' => 'fases.ver', 'nombre_visible' => 'Ver Fases', 'accion' => 'ver', 'modulo' => 'fases', 'descripcion' => 'Ver fases de proyectos privados'],
            ['codigo' => 'fases.crear', 'nombre_visible' => 'Crear Fases', 'accion' => 'crear', 'modulo' => 'fases', 'descripcion' => 'Crear fases'],
            ['codigo' => 'fases.editar', 'nombre_visible' => 'Editar Fases', 'accion' => 'editar', 'modulo' => 'fases', 'descripcion' => 'Editar fases'],
            ['codigo' => 'fases.eliminar', 'nombre_visible' => 'Eliminar Fases', 'accion' => 'eliminar', 'modulo' => 'fases', 'descripcion' => 'Eliminar fases'],
            ['codigo' => 'fases.cambiar_estado', 'nombre_visible' => 'Cambiar Estado Fases', 'accion' => 'cambiar_estado', 'modulo' => 'fases', 'descripcion' => 'Cambiar estado de fases'],
        ];

        foreach ($permisos as $p) {
            Permiso::firstOrCreate(['codigo' => $p['codigo']], $p);
        }

        // ── Asignación a roles ──────────────────────────────────────────
        $gerente = Rol::where('nombre', 'gerente')->first();
        if ($gerente) {
            $ids = Permiso::whereIn('modulo', ['proyectos', 'viviendas', 'fases'])->pluck('id')->toArray();
            $gerente->permisos()->syncWithoutDetaching($ids);
        }

        $adminProyecto = Rol::where('nombre', 'administrador_proyecto')->first();
        if ($adminProyecto) {
            $codigos = [
                'proyectos.ver', 'proyectos.crear', 'proyectos.editar', 'proyectos.cambiar_estado',
                'viviendas.ver', 'viviendas.crear', 'viviendas.editar', 'viviendas.cambiar_estado',
                'fases.ver', 'fases.crear', 'fases.editar', 'fases.cambiar_estado',
            ];
            $ids = Permiso::whereIn('codigo', $codigos)->pluck('id')->toArray();
            $adminProyecto->permisos()->syncWithoutDetaching($ids);
        }

        $finanzas = Rol::where('nombre', 'encargado_finanzas')->first();
        if ($finanzas) {
            $ids = Permiso::whereIn('codigo', ['proyectos.ver', 'proyectos.ver_finanzas'])->pluck('id')->toArray();
            $finanzas->permisos()->syncWithoutDetaching($ids);
        }

        $tecnico = Rol::where('nombre', 'tecnico_campo')->first();
        if ($tecnico) {
            $codigos = ['proyectos.ver', 'viviendas.ver', 'viviendas.cambiar_estado', 'fases.ver', 'fases.cambiar_estado'];
            $ids = Permiso::whereIn('codigo', $codigos)->pluck('id')->toArray();
            $tecnico->permisos()->syncWithoutDetaching($ids);
        }

        $trabajadoraSocial = Rol::where('nombre', 'trabajadora_social')->first();
        if ($trabajadoraSocial) {
            $codigos = ['proyectos.ver', 'viviendas.ver', 'viviendas.cambiar_estado'];
            $ids = Permiso::whereIn('codigo', $codigos)->pluck('id')->toArray();
            $trabajadoraSocial->permisos()->syncWithoutDetaching($ids);
        }
    }
}
