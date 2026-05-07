<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolPermisoSeeder extends Seeder
{
    public function run(): void
    {
        $roles = DB::table('roles')->get();
        $permisos = DB::table('permisos')->get();

        $rolPermisos = [];

        foreach ($roles as $rol) {
            foreach ($permisos as $permiso) {
                $asignar = false;

                switch ($rol->nombre) {
                    case 'gerente':
                        $asignar = true;
                        break;
                    case 'encargado_finanzas':
                        if ($permiso->modulo == 'finanzas' || $permiso->accion == 'ver') {
                            $asignar = true;
                        }
                        break;
                    case 'administrador_proyecto':
                        if (in_array($permiso->modulo, ['proyectos', 'personal', 'materiales', 'reportes'])) {
                            $asignar = true;
                        }
                        break;
                    case 'tecnico_campo':
                        if ($permiso->modulo == 'reportes' || ($permiso->modulo == 'proyectos' && $permiso->accion == 'ver')) {
                            $asignar = true;
                        }
                        break;
                    case 'encargado_almacen':
                        if (in_array($permiso->modulo, ['materiales', 'almacenes'])) {
                            $asignar = true;
                        }
                        break;
                    case 'trabajadora_social':
                        if ($permiso->modulo == 'personal') {
                            $asignar = true;
                        }
                        break;
                    case 'obrero':
                        if ($permiso->modulo == 'dashboard' && $permiso->accion == 'ver') {
                            $asignar = true;
                        }
                        break;
                }

                if ($asignar) {
                    $rolPermisos[] = [
                        'rol_id' => $rol->id,
                        'permiso_id' => $permiso->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }
        }

        DB::table('rol_permiso')->insert($rolPermisos);
    }
}
