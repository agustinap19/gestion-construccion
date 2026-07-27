<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permiso;
use App\Models\Rol;

class PermisoActasSeeder extends Seeder
{
    public function run(): void
    {
        $permisos = [
            [
                'codigo'         => 'activos.ver_actas',
                'nombre'         => 'activos.ver_actas',
                'nombre_visible' => 'Ver Actas de Entrega',
                'modulo'         => 'activos',
                'accion'         => 'ver_actas',
                'descripcion'    => 'Ver actas de entrega de activos a viviendas de proyectos sociales',
            ],
            [
                'codigo'         => 'activos.aprobar_acta',
                'nombre'         => 'activos.aprobar_acta',
                'nombre_visible' => 'Aprobar Actas de Entrega',
                'modulo'         => 'activos',
                'accion'         => 'aprobar_acta',
                'descripcion'    => 'Aprobar actas de entrega firmadas y subidas',
            ],
            [
                'codigo'         => 'activos.rechazar_acta',
                'nombre'         => 'activos.rechazar_acta',
                'nombre_visible' => 'Rechazar Actas de Entrega',
                'modulo'         => 'activos',
                'accion'         => 'rechazar_acta',
                'descripcion'    => 'Rechazar actas de entrega firmadas y subidas, devolviéndolas a impresión',
            ],
            [
                'codigo'         => 'activos.registrar_entrega',
                'nombre'         => 'activos.registrar_entrega',
                'nombre_visible' => 'Registrar Entrega/Devolución',
                'modulo'         => 'activos',
                'accion'         => 'registrar_entrega',
                'descripcion'    => 'Registrar la entrega física y devolución de activos con foto',
            ],
        ];

        foreach ($permisos as $p) {
            Permiso::firstOrCreate(['codigo' => $p['codigo']], $p);
        }

        // Roles reales del sistema: super_admin, gerente, encargado_finanzas,
        // administrador_proyecto, tecnico_campo, encargado_almacen, obrero.
        $rolesData = [
            'super_admin' => [
                'activos.ver_actas', 'activos.aprobar_acta', 'activos.rechazar_acta', 'activos.registrar_entrega',
            ],
            'gerente' => [
                'activos.ver_actas', 'activos.aprobar_acta', 'activos.rechazar_acta', 'activos.registrar_entrega',
            ],
            'administrador_proyecto' => [
                'activos.ver_actas', 'activos.registrar_entrega',
            ],
            'encargado_finanzas' => [
                'activos.ver_actas',
            ],
            'encargado_almacen' => [
                'activos.ver_actas',
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
