<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permiso;
use App\Models\Rol;

class PermisoAlmacenesSeeder extends Seeder
{
    public function run(): void
    {
        $permisos = [
            [
                'codigo'         => 'materiales.ver',
                'nombre'         => 'materiales.ver',
                'nombre_visible' => 'Ver Materiales',
                'modulo'         => 'materiales',
                'accion'         => 'ver',
                'descripcion'    => 'Ver catálogo de materiales y categorías',
            ],
            [
                'codigo'         => 'materiales.gestionar',
                'nombre'         => 'materiales.gestionar',
                'nombre_visible' => 'Gestionar Materiales',
                'modulo'         => 'materiales',
                'accion'         => 'gestionar',
                'descripcion'    => 'Crear, editar y desactivar materiales y categorías',
            ],
            [
                'codigo'         => 'almacenes.ver',
                'nombre'         => 'almacenes.ver',
                'nombre_visible' => 'Ver Almacenes',
                'modulo'         => 'almacenes',
                'accion'         => 'ver',
                'descripcion'    => 'Ver listado de almacenes, stocks y kardex de movimientos',
            ],
            [
                'codigo'         => 'almacenes.gestionar',
                'nombre'         => 'almacenes.gestionar',
                'nombre_visible' => 'Gestionar Almacenes',
                'modulo'         => 'almacenes',
                'accion'         => 'gestionar',
                'descripcion'    => 'Crear almacenes, registrar entradas/salidas, ajustes y transferencias de stock',
            ],
            [
                'codigo'         => 'presupuesto_materiales.gestionar',
                'nombre'         => 'presupuesto_materiales.gestionar',
                'nombre_visible' => 'Gestionar Presupuesto de Materiales',
                'modulo'         => 'presupuesto_materiales',
                'accion'         => 'gestionar',
                'descripcion'    => 'Registrar, editar y distribuir presupuesto de materiales por proyecto',
            ],
        ];

        foreach ($permisos as $p) {
            Permiso::firstOrCreate(['codigo' => $p['codigo']], $p);
        }

        // Asignar permisos a roles
        $rolesData = [
            'gerente' => [
                'materiales.ver', 'materiales.gestionar',
                'almacenes.ver', 'almacenes.gestionar',
                'presupuesto_materiales.gestionar',
            ],
            'administrador_proyecto' => [
                'materiales.ver', 'almacenes.ver',
                'presupuesto_materiales.gestionar',
            ],
            'encargado_almacen' => [
                'materiales.ver', 'materiales.gestionar',
                'almacenes.ver', 'almacenes.gestionar',
            ],
            'encargado_finanzas' => [
                'materiales.ver', 'almacenes.ver',
                'presupuesto_materiales.gestionar',
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
