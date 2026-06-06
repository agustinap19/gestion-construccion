<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permiso;
use App\Models\Rol;

class PermisosBloque4Seeder extends Seeder
{
    public function run(): void
    {
        $permisos = [
            ['codigo' => 'beneficiarios.ver', 'nombre_visible' => 'Ver Beneficiarios', 'accion' => 'ver', 'modulo' => 'beneficiarios', 'descripcion' => 'Ver lista de beneficiarios'],
            ['codigo' => 'beneficiarios.crear', 'nombre_visible' => 'Crear Beneficiarios', 'accion' => 'crear', 'modulo' => 'beneficiarios', 'descripcion' => 'Crear beneficiario'],
            ['codigo' => 'beneficiarios.editar', 'nombre_visible' => 'Editar Beneficiarios', 'accion' => 'editar', 'modulo' => 'beneficiarios', 'descripcion' => 'Editar beneficiario'],
            ['codigo' => 'beneficiarios.eliminar', 'nombre_visible' => 'Eliminar Beneficiarios', 'accion' => 'eliminar', 'modulo' => 'beneficiarios', 'descripcion' => 'Eliminar beneficiario'],
            ['codigo' => 'beneficiarios.cambiar_estado', 'nombre_visible' => 'Cambiar Estado Beneficiarios', 'accion' => 'cambiar_estado', 'modulo' => 'beneficiarios', 'descripcion' => 'Cambiar estado beneficiario'],
            ['codigo' => 'beneficiarios.ver_datos_sensibles', 'nombre_visible' => 'Ver Datos Sensibles', 'accion' => 'ver_datos_sensibles', 'modulo' => 'beneficiarios', 'descripcion' => 'Ver ingresos mensuales'],
            
            ['codigo' => 'visitas.ver', 'nombre_visible' => 'Ver Visitas', 'accion' => 'ver', 'modulo' => 'visitas_domiciliarias', 'descripcion' => 'Ver visitas'],
            ['codigo' => 'visitas.crear', 'nombre_visible' => 'Registrar Visitas', 'accion' => 'crear', 'modulo' => 'visitas_domiciliarias', 'descripcion' => 'Registrar visitas'],
            ['codigo' => 'visitas.editar', 'nombre_visible' => 'Editar Visitas', 'accion' => 'editar', 'modulo' => 'visitas_domiciliarias', 'descripcion' => 'Editar visitas'],
            ['codigo' => 'visitas.eliminar', 'nombre_visible' => 'Eliminar Visitas', 'accion' => 'eliminar', 'modulo' => 'visitas_domiciliarias', 'descripcion' => 'Eliminar visitas'],
        ];

        foreach ($permisos as $p) {
            Permiso::firstOrCreate(['codigo' => $p['codigo']], array_merge($p, ['nombre' => $p['nombre_visible']]));
        }

        // Asignación de roles
        $gerente = Rol::where('nombre', 'gerente')->first();
        if ($gerente) {
            $permisosIds = Permiso::whereIn('modulo', ['beneficiarios', 'visitas_domiciliarias'])->pluck('id')->toArray();
            $gerente->permisos()->syncWithoutDetaching($permisosIds);
        }

        $adminProyecto = Rol::where('nombre', 'administrador_proyecto')->first();
        if ($adminProyecto) {
            $codigos = ['beneficiarios.ver', 'beneficiarios.crear', 'beneficiarios.editar', 'beneficiarios.cambiar_estado'];
            $permisosIds = Permiso::whereIn('codigo', $codigos)->pluck('id')->toArray();
            $adminProyecto->permisos()->syncWithoutDetaching($permisosIds);
        }

        $trabajadoraSocial = Rol::where('nombre', 'trabajadora_social')->first();
        if ($trabajadoraSocial) {
            $permisosIds = Permiso::whereIn('modulo', ['beneficiarios', 'visitas_domiciliarias'])->pluck('id')->toArray();
            $trabajadoraSocial->permisos()->syncWithoutDetaching($permisosIds);
        }

        $finanzas = Rol::where('nombre', 'encargado_finanzas')->first();
        if ($finanzas) {
            $codigos = ['beneficiarios.ver', 'beneficiarios.ver_datos_sensibles'];
            $permisosIds = Permiso::whereIn('codigo', $codigos)->pluck('id')->toArray();
            $finanzas->permisos()->syncWithoutDetaching($permisosIds);
        }
    }
}
