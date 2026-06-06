<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TipoVivienda;
use App\Models\PlantillaConstructiva;

class TipoViviendaSeeder extends Seeder
{
    public function run(): void
    {
        // Eliminar registros viejos (Tipo A/B/C/Mejorada) que no tienen plantilla asignada
        TipoVivienda::whereNull('plantilla_constructiva_id')->forceDelete();

        $plantillas = PlantillaConstructiva::where('tipo_obra', 'vivienda_social')
            ->where('estado', true)
            ->get()
            ->keyBy('tipologia');

        $tipos = [
            [
                'tipologia_key'        => 'TIPO 1',
                'nombre'               => 'Vivienda Social TIPO 1 — 1 Dormitorio',
                'descripcion'          => 'Vivienda social básica de 1 dormitorio. ~45 m². Sala-comedor, baño, cocina.',
                'metros_cuadrados'     => 45.00,
                'cantidad_dormitorios' => 1,
                'cantidad_banos'       => 1,
                'costo_referencial'    => 75000.00,
            ],
            [
                'tipologia_key'        => 'TIPO 2',
                'nombre'               => 'Vivienda Social TIPO 2 — 2 Dormitorios',
                'descripcion'          => 'Vivienda social estándar de 2 dormitorios. ~60 m². Sala-comedor, baño, cocina.',
                'metros_cuadrados'     => 60.00,
                'cantidad_dormitorios' => 2,
                'cantidad_banos'       => 1,
                'costo_referencial'    => 95000.00,
            ],
            [
                'tipologia_key'        => 'TIPO 3',
                'nombre'               => 'Vivienda Social TIPO 3 — 3 Dormitorios',
                'descripcion'          => 'Vivienda social ampliada de 3 dormitorios. ~75 m². Sala-comedor, baño, cocina.',
                'metros_cuadrados'     => 75.00,
                'cantidad_dormitorios' => 3,
                'cantidad_banos'       => 1,
                'costo_referencial'    => 120000.00,
            ],
        ];

        foreach ($tipos as $tipo) {
            $plantilla = $plantillas[$tipo['tipologia_key']] ?? null;

            $existing = TipoVivienda::where('nombre', $tipo['nombre'])->first();
            if ($existing) {
                if ($plantilla && !$existing->plantilla_constructiva_id) {
                    $existing->update(['plantilla_constructiva_id' => $plantilla->id]);
                }
                continue;
            }

            TipoVivienda::create([
                'nombre'                    => $tipo['nombre'],
                'descripcion'               => $tipo['descripcion'],
                'metros_cuadrados'          => $tipo['metros_cuadrados'],
                'cantidad_dormitorios'      => $tipo['cantidad_dormitorios'],
                'cantidad_banos'            => $tipo['cantidad_banos'],
                'costo_referencial'         => $tipo['costo_referencial'],
                'estado'                    => 'activo',
                'plantilla_constructiva_id' => $plantilla?->id,
            ]);
        }
    }
}
