<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['nombre' => 'gerente', 'nombre_visible' => 'Gerente General', 'es_sistema' => true],
            ['nombre' => 'encargado_finanzas', 'nombre_visible' => 'Encargado de Finanzas', 'es_sistema' => true],
            ['nombre' => 'administrador_proyecto', 'nombre_visible' => 'Administrador de Proyecto', 'es_sistema' => true],
            ['nombre' => 'tecnico_campo', 'nombre_visible' => 'Técnico de Campo', 'es_sistema' => true],
            ['nombre' => 'encargado_almacen', 'nombre_visible' => 'Encargado de Almacén', 'es_sistema' => true],
            ['nombre' => 'obrero', 'nombre_visible' => 'Obrero', 'es_sistema' => true],
            ['nombre' => 'trabajadora_social', 'nombre_visible' => 'Trabajadora Social', 'es_sistema' => true],
        ];

        foreach ($roles as $rol) {
            DB::table('roles')->insert([
                'nombre' => $rol['nombre'],
                'nombre_visible' => $rol['nombre_visible'],
                'descripcion' => 'Rol de sistema para ' . $rol['nombre_visible'],
                'es_sistema' => $rol['es_sistema'],
                'estado' => 'activo',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
