<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ConfiguracionSistemaSeeder extends Seeder
{
    public function run(): void
    {
        $configuraciones = [
            ['clave' => 'empresa_nombre',       'valor' => 'CA & KANAGF S.R.L.',                    'descripcion' => 'Nombre de la empresa'],
            ['clave' => 'empresa_nit',           'valor' => '123456789',                             'descripcion' => 'NIT de la empresa'],
            ['clave' => 'empresa_direccion',     'valor' => 'El Alto, La Paz, Bolivia',              'descripcion' => 'Dirección principal de la empresa'],
            ['clave' => 'empresa_telefono',      'valor' => '+591 2 2000000',                        'descripcion' => 'Teléfono principal de la empresa'],
            ['clave' => 'empresa_email',         'valor' => 'contacto@cakanagf.com',                 'descripcion' => 'Correo de contacto de la empresa'],
            ['clave' => 'moneda',                'valor' => 'BOB',                                   'descripcion' => 'Moneda base del sistema (Bolivianos)'],
            ['clave' => 'zona_horaria',          'valor' => 'America/La_Paz',                        'descripcion' => 'Zona horaria del sistema'],
            ['clave' => 'prefijo_proyecto',      'valor' => 'PRJ',                                   'descripcion' => 'Prefijo para códigos de proyecto'],
            ['clave' => 'max_intentos_login',    'valor' => '5',                                     'descripcion' => 'Intentos fallidos antes de bloquear cuenta'],
            ['clave' => 'minutos_bloqueo',       'valor' => '30',                                    'descripcion' => 'Minutos de bloqueo tras intentos fallidos'],
        ];

        foreach ($configuraciones as $config) {
            DB::table('configuracion_sistema')->insertOrIgnore([
                'clave'       => $config['clave'],
                'valor'       => $config['valor'],
                'descripcion' => $config['descripcion'],
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }
    }
}
