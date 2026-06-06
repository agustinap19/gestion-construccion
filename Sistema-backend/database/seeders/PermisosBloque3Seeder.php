<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Permiso;
use App\Models\Rol;

class PermisosBloque3Seeder extends Seeder
{
    public function run(): void
    {
        $permisos = [
            ['codigo' => 'clientes.ver', 'nombre_visible' => 'Ver Clientes', 'accion' => 'ver', 'descripcion' => 'Ver lista y detalles de clientes', 'modulo' => 'clientes'],
            ['codigo' => 'clientes.crear', 'nombre_visible' => 'Crear Clientes', 'accion' => 'crear', 'descripcion' => 'Registrar nuevos clientes', 'modulo' => 'clientes'],
            ['codigo' => 'clientes.editar', 'nombre_visible' => 'Editar Clientes', 'accion' => 'editar', 'descripcion' => 'Editar información de clientes y cambiar estado', 'modulo' => 'clientes'],
            ['codigo' => 'clientes.eliminar', 'nombre_visible' => 'Eliminar Clientes', 'accion' => 'eliminar', 'descripcion' => 'Eliminar clientes', 'modulo' => 'clientes'],
            
            ['codigo' => 'entidades.ver', 'nombre_visible' => 'Ver Entidades', 'accion' => 'ver', 'descripcion' => 'Ver lista y detalles de entidades estatales', 'modulo' => 'entidades'],
            ['codigo' => 'entidades.crear', 'nombre_visible' => 'Crear Entidades', 'accion' => 'crear', 'descripcion' => 'Registrar nuevas entidades', 'modulo' => 'entidades'],
            ['codigo' => 'entidades.editar', 'nombre_visible' => 'Editar Entidades', 'accion' => 'editar', 'descripcion' => 'Editar información de entidades', 'modulo' => 'entidades'],
            ['codigo' => 'entidades.eliminar', 'nombre_visible' => 'Eliminar Entidades', 'accion' => 'eliminar', 'descripcion' => 'Eliminar entidades estatales', 'modulo' => 'entidades'],

            ['codigo' => 'zonas.ver', 'nombre_visible' => 'Ver Zonas', 'accion' => 'ver', 'descripcion' => 'Ver lista de zonas geográficas', 'modulo' => 'zonas'],
        ];

        foreach ($permisos as $p) {
            Permiso::firstOrCreate(['codigo' => $p['codigo']], array_merge($p, ['nombre' => $p['nombre_visible']]));
        }

        // Asignación a roles
        $gerente = Rol::where('nombre', 'gerente')->first();
        if ($gerente) {
            $permisosIds = Permiso::whereIn('modulo', ['clientes', 'entidades', 'zonas'])->pluck('id')->toArray();
            $gerente->permisos()->syncWithoutDetaching($permisosIds);
        }

        $adminProyecto = Rol::where('nombre', 'administrador_proyecto')->first();
        if ($adminProyecto) {
            $codigosPermitidos = ['clientes.ver', 'clientes.crear', 'clientes.editar', 'entidades.ver', 'entidades.crear', 'entidades.editar', 'zonas.ver'];
            $permisosIds = Permiso::whereIn('codigo', $codigosPermitidos)->pluck('id')->toArray();
            $adminProyecto->permisos()->syncWithoutDetaching($permisosIds);
        }

        $finanzas = Rol::where('nombre', 'encargado_finanzas')->first();
        if ($finanzas) {
            $codigosPermitidos = ['clientes.ver', 'clientes.editar', 'entidades.ver', 'entidades.editar', 'zonas.ver'];
            $permisosIds = Permiso::whereIn('codigo', $codigosPermitidos)->pluck('id')->toArray();
            $finanzas->permisos()->syncWithoutDetaching($permisosIds);
        }
    }
}
