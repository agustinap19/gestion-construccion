<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['nombre' => 'super_admin',            'nombre_visible' => 'Super Administrador',      'descripcion' => 'Acceso total al sistema, gestión de configuración y usuarios administradores.'],
            ['nombre' => 'gerente',                 'nombre_visible' => 'Gerente General',           'descripcion' => 'Supervisión general de proyectos, personal y finanzas de la empresa.'],
            ['nombre' => 'encargado_finanzas',      'nombre_visible' => 'Encargado de Finanzas',    'descripcion' => 'Gestión de presupuestos, planillas de pago y reportes financieros.'],
            ['nombre' => 'administrador_proyecto',  'nombre_visible' => 'Administrador de Proyecto','descripcion' => 'Gestión de fases, recursos y avance de proyectos de construcción.'],
            ['nombre' => 'tecnico_campo',           'nombre_visible' => 'Técnico de Campo',          'descripcion' => 'Registro de avances en obra, supervisión de actividades y materiales.'],
            ['nombre' => 'encargado_almacen',       'nombre_visible' => 'Encargado de Almacén',     'descripcion' => 'Control de inventario, materiales y solicitudes de almacén.'],
            ['nombre' => 'obrero',                  'nombre_visible' => 'Obrero',                    'descripcion' => 'Personal de construcción con acceso básico al sistema.'],
        ];

        foreach ($roles as $rol) {
            DB::table('roles')->insert([
                'nombre'         => $rol['nombre'],
                'nombre_visible' => $rol['nombre_visible'],
                'descripcion'    => $rol['descripcion'],
                'es_sistema'     => true,
                'estado'         => 'activo',
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
        }
    }
}
