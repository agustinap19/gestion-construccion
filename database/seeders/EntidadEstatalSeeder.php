<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\EntidadEstatal;
use App\Models\ZonaGeografica;
use App\Models\User;

class EntidadEstatalSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::first();
        $adminId = $admin ? $admin->id : null;

        $zonaLaPaz = ZonaGeografica::where('departamento', 'La Paz')->first();
        $zonaElAlto = ZonaGeografica::where('municipio', 'El Alto')->first();

        $entidades = [
            [
                'nombre' => 'Gobierno Autónomo Municipal de La Paz',
                'sigla' => 'GAMLP',
                'nivel' => 'municipal',
                'nit' => '1000234020',
                'direccion' => 'Edificio Tobía, Potosí 1285',
                'zona_id' => $zonaLaPaz ? $zonaLaPaz->id : null,
                'telefono_principal' => '22112233',
                'sitio_web' => 'www.lapaz.bo',
                'tipo_proyectos_que_otorga' => 'Infraestructura urbana, salud, educación',
                'estado' => 'activa',
                'usuario_creador_id' => $adminId,
            ],
            [
                'nombre' => 'Gobierno Autónomo Municipal de El Alto',
                'sigla' => 'GAMEA',
                'nivel' => 'municipal',
                'nit' => '1000555021',
                'zona_id' => $zonaElAlto ? $zonaElAlto->id : null,
                'estado' => 'activa',
                'usuario_creador_id' => $adminId,
            ],
            [
                'nombre' => 'Ministerio de Obras Públicas, Servicios y Vivienda',
                'sigla' => 'MOPSV',
                'nivel' => 'nacional',
                'nit' => '1200300022',
                'zona_id' => $zonaLaPaz ? $zonaLaPaz->id : null,
                'tipo_proyectos_que_otorga' => 'Vivienda social (AEVivienda), carreteras',
                'estado' => 'activa',
                'usuario_creador_id' => $adminId,
            ],
            [
                'nombre' => 'Agencia Estatal de Vivienda',
                'sigla' => 'AEVIVIENDA',
                'nivel' => 'descentralizado',
                'nit' => '2000444023',
                'zona_id' => $zonaLaPaz ? $zonaLaPaz->id : null,
                'tipo_proyectos_que_otorga' => 'Soluciones habitacionales integrales',
                'estado' => 'activa',
                'usuario_creador_id' => $adminId,
            ],
            [
                'nombre' => 'Fondo Nacional de Inversión Productiva y Social',
                'sigla' => 'FPS',
                'nivel' => 'descentralizado',
                'nit' => '3000555024',
                'estado' => 'en_disputa',
                'notas' => 'En proceso de auditoría externa',
                'usuario_creador_id' => $adminId,
            ],
        ];

        foreach ($entidades as $e) {
            EntidadEstatal::firstOrCreate(
                ['nit' => $e['nit']],
                $e
            );
        }
    }
}
