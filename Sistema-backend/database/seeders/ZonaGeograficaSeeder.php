<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ZonaGeografica;

class ZonaGeograficaSeeder extends Seeder
{
    public function run(): void
    {
        $zonas = [
            [
                'nombre' => 'La Paz - Centro',
                'departamento' => 'La Paz',
                'municipio' => 'Nuestra Señora de La Paz',
                'latitud_centro' => -16.4957,
                'longitud_centro' => -68.1336,
                'radio_km' => 10.0,
                'estado' => 'activa'
            ],
            [
                'nombre' => 'El Alto - Distrito 4',
                'departamento' => 'La Paz',
                'municipio' => 'El Alto',
                'latitud_centro' => -16.5167,
                'longitud_centro' => -68.1833,
                'radio_km' => 15.0,
                'estado' => 'activa'
            ],
            [
                'nombre' => 'Cochabamba - Cercado',
                'departamento' => 'Cochabamba',
                'municipio' => 'Cochabamba',
                'latitud_centro' => -17.3895,
                'longitud_centro' => -66.1568,
                'radio_km' => 20.0,
                'estado' => 'activa'
            ],
            [
                'nombre' => 'Santa Cruz - Norte',
                'departamento' => 'Santa Cruz',
                'municipio' => 'Santa Cruz de la Sierra',
                'latitud_centro' => -17.7667,
                'longitud_centro' => -63.1833,
                'radio_km' => 30.0,
                'estado' => 'activa'
            ],
            [
                'nombre' => 'Sucre - Centro',
                'departamento' => 'Chuquisaca',
                'municipio' => 'Sucre',
                'latitud_centro' => -19.0333,
                'longitud_centro' => -65.2627,
                'radio_km' => 10.0,
                'estado' => 'activa'
            ],
            [
                'nombre' => 'Tarija - Centro',
                'departamento' => 'Tarija',
                'municipio' => 'Tarija',
                'latitud_centro' => -21.5355,
                'longitud_centro' => -64.7296,
                'radio_km' => 15.0,
                'estado' => 'activa'
            ],
            [
                'nombre' => 'Oruro - Centro',
                'departamento' => 'Oruro',
                'municipio' => 'Oruro',
                'latitud_centro' => -17.9833,
                'longitud_centro' => -67.1500,
                'radio_km' => 12.0,
                'estado' => 'activa'
            ],
            [
                'nombre' => 'Potosí - Centro',
                'departamento' => 'Potosí',
                'municipio' => 'Potosí',
                'latitud_centro' => -19.5836,
                'longitud_centro' => -65.7531,
                'radio_km' => 8.0,
                'estado' => 'activa'
            ],
        ];

        foreach ($zonas as $z) {
            ZonaGeografica::firstOrCreate(['nombre' => $z['nombre']], $z);
        }
    }
}
