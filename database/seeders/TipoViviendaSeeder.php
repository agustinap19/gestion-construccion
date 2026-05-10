<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TipoVivienda;

class TipoViviendaSeeder extends Seeder
{
    public function run(): void
    {
        $tipos = [
            [
                'nombre' => 'Vivienda Tipo A (40 m²)',
                'descripcion' => 'Vivienda básica de 40 metros cuadrados.',
                'metros_cuadrados' => 40.00,
                'cantidad_dormitorios' => 2,
                'cantidad_banos' => 1,
                'tiene_cocina' => true,
                'tiene_sala_comedor' => true,
                'tiene_patio' => false,
                'tiene_lavanderia' => true,
                'costo_estimado' => 75000.00
            ],
            [
                'nombre' => 'Vivienda Tipo B (55 m²)',
                'descripcion' => 'Vivienda estándar de 55 metros cuadrados.',
                'metros_cuadrados' => 55.00,
                'cantidad_dormitorios' => 3,
                'cantidad_banos' => 1,
                'tiene_cocina' => true,
                'tiene_sala_comedor' => true,
                'tiene_patio' => false,
                'tiene_lavanderia' => true,
                'costo_estimado' => 95000.00
            ],
            [
                'nombre' => 'Vivienda Tipo C (70 m²)',
                'descripcion' => 'Vivienda ampliada con estudio.',
                'metros_cuadrados' => 70.00,
                'cantidad_dormitorios' => 3,
                'cantidad_banos' => 2,
                'tiene_cocina' => true,
                'tiene_sala_comedor' => true,
                'tiene_patio' => true,
                'tiene_lavanderia' => true,
                'costo_estimado' => 130000.00
            ],
            [
                'nombre' => 'Vivienda Mejorada (60 m²)',
                'descripcion' => 'Vivienda con acabados premium y aislamiento térmico.',
                'metros_cuadrados' => 60.00,
                'cantidad_dormitorios' => 3,
                'cantidad_banos' => 1,
                'tiene_cocina' => true,
                'tiene_sala_comedor' => true,
                'tiene_patio' => false,
                'tiene_lavanderia' => true,
                'costo_estimado' => 110000.00
            ]
        ];

        foreach ($tipos as $tipo) {
            TipoVivienda::firstOrCreate(['nombre' => $tipo['nombre']], $tipo);
        }
    }
}
