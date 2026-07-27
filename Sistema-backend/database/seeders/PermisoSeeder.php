<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PermisoSeeder extends Seeder
{
    public function run(): void
    {
        $modulos = [
            'usuarios', 'roles', 'proyectos', 'contratos', 
            'materiales', 'almacenes', 'personal', 
            'finanzas', 'reportes', 'dashboard'
        ];

        $acciones = ['ver', 'crear', 'editar', 'eliminar'];

        foreach ($modulos as $modulo) {
            foreach ($acciones as $accion) {
                $codigo = $modulo . '.' . $accion;

                if (DB::table('permisos')->where('codigo', $codigo)->exists()) {
                    continue;
                }

                DB::table('permisos')->insert([
                    'codigo' => $codigo,
                    'nombre' => ucfirst($accion) . ' ' . ucfirst($modulo),
                    'nombre_visible' => ucfirst($accion) . ' ' . ucfirst($modulo),
                    'modulo' => $modulo,
                    'accion' => $accion,
                    'descripcion' => 'Permite ' . $accion . ' en el módulo ' . $modulo,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}
