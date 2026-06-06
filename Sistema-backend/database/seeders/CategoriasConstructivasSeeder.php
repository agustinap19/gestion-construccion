<?php

namespace Database\Seeders;

use App\Models\CategoriaConstructiva;
use Illuminate\Database\Seeder;

class CategoriasConstructivasSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = [
            ['nombre' => 'Cimientos',               'color' => '#92400e', 'orden' => 1,  'descripcion' => 'Replanteo, excavaciones, zapatas, cimientos de hormigón y ciclópeo.'],
            ['nombre' => 'Estructura',              'color' => '#1e40af', 'orden' => 2,  'descripcion' => 'Columnas, vigas, losas, escaleras y elementos de H°A°.'],
            ['nombre' => 'Albañilería',             'color' => '#b91c1c', 'orden' => 3,  'descripcion' => 'Muros de ladrillo, bloques, sobreciminentos de mampostería.'],
            ['nombre' => 'Cubierta',                'color' => '#166534', 'orden' => 4,  'descripcion' => 'Estructuras de madera, calamina, tejas y otras cubiertas.'],
            ['nombre' => 'Revoques y acabados',     'color' => '#4338ca', 'orden' => 5,  'descripcion' => 'Revoques de mortero, yeso, cielo rasos y acabados interiores.'],
            ['nombre' => 'Pisos',                   'color' => '#0f766e', 'orden' => 6,  'descripcion' => 'Contrapisos, cerámicas, porcelanato, piso de madera.'],
            ['nombre' => 'Pintura',                 'color' => '#0284c7', 'orden' => 7,  'descripcion' => 'Pintura interior y exterior, imprimaciones, impermeabilizantes.'],
            ['nombre' => 'Instalación sanitaria',   'color' => '#0891b2', 'orden' => 8,  'descripcion' => 'Puntos de agua, desagüe, artefactos sanitarios.'],
            ['nombre' => 'Instalación eléctrica',   'color' => '#ca8a04', 'orden' => 9,  'descripcion' => 'Puntos de luz, tomacorrientes, tableros de distribución.'],
            ['nombre' => 'Carpintería',             'color' => '#9a3412', 'orden' => 10, 'descripcion' => 'Puertas, ventanas, carpintería de madera y aluminio.'],
            ['nombre' => 'Insumos generales',       'color' => '#6b7280', 'orden' => 11, 'descripcion' => 'Materiales generales no atribuibles a un ítem específico.'],
        ];

        foreach ($categorias as $cat) {
            CategoriaConstructiva::firstOrCreate(['nombre' => $cat['nombre']], $cat);
        }
    }
}
