<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PlantillaChecklist;
use App\Models\ItemPlantilla;

class PlantillaChecklistSeeder extends Seeder
{
    public function run(): void
    {
        $plantillas = [
            [
                'clave'            => 'vivienda_social',
                'nombre'           => 'Vivienda Social',
                'tipo_obra'        => 'vivienda_social',
                'descripcion'      => 'Checklist estándar para viviendas de proyectos sociales',
                'es_predeterminada' => false,
                'items' => [
                    ['nombre' => 'Replanteo y nivelación del terreno', 'orden' => 1],
                    ['nombre' => 'Excavación y cimentación',            'orden' => 2],
                    ['nombre' => 'Muros y estructura',                   'orden' => 3],
                    ['nombre' => 'Cubierta y techo',                     'orden' => 4],
                    ['nombre' => 'Acabados interiores',                  'orden' => 5],
                    ['nombre' => 'Acabados exteriores',                  'orden' => 6],
                    ['nombre' => 'Instalaciones sanitarias',             'orden' => 7],
                    ['nombre' => 'Instalaciones eléctricas',             'orden' => 8],
                    ['nombre' => 'Inspección final y entrega',           'orden' => 9],
                ],
            ],
            [
                'clave'            => 'casa_privada',
                'nombre'           => 'Casa Privada / Vivienda Unifamiliar',
                'tipo_obra'        => 'vivienda_unifamiliar',
                'descripcion'      => 'Checklist para casas y viviendas unifamiliares privadas',
                'es_predeterminada' => false,
                'items' => [
                    ['nombre' => 'Limpieza y preparación del terreno',   'orden' => 1],
                    ['nombre' => 'Cimentación y zapatas',                 'orden' => 2],
                    ['nombre' => 'Estructura (columnas y vigas)',          'orden' => 3],
                    ['nombre' => 'Albañilería y muros',                   'orden' => 4],
                    ['nombre' => 'Instalaciones (sanitaria y eléctrica)', 'orden' => 5],
                    ['nombre' => 'Acabados y pintura',                    'orden' => 6],
                    ['nombre' => 'Entrega y limpieza final',              'orden' => 7],
                ],
            ],
            [
                'clave'            => 'edificio',
                'nombre'           => 'Edificio Multifamiliar / Comercial',
                'tipo_obra'        => 'edificio',
                'descripcion'      => 'Checklist para edificios de varios pisos',
                'es_predeterminada' => false,
                'items' => [
                    ['nombre' => 'Estudios de suelo y replanteo',         'orden' => 1],
                    ['nombre' => 'Excavación y cimentación profunda',      'orden' => 2],
                    ['nombre' => 'Estructura principal (losas y columnas)', 'orden' => 3],
                    ['nombre' => 'Cerramientos y fachada',                 'orden' => 4],
                    ['nombre' => 'Instalaciones hidrosanitarias',          'orden' => 5],
                    ['nombre' => 'Instalaciones eléctricas y especiales',  'orden' => 6],
                    ['nombre' => 'Acabados por piso',                      'orden' => 7],
                    ['nombre' => 'Áreas comunes y exteriores',             'orden' => 8],
                    ['nombre' => 'Inspección municipal y habilitación',    'orden' => 9],
                    ['nombre' => 'Entrega de unidades',                    'orden' => 10],
                ],
            ],
            [
                'clave'            => 'remodelacion',
                'nombre'           => 'Remodelación / Ampliación',
                'tipo_obra'        => 'remodelacion',
                'descripcion'      => 'Checklist para obras de remodelación y ampliación',
                'es_predeterminada' => false,
                'items' => [
                    ['nombre' => 'Diagnóstico y demolición de elementos a retirar', 'orden' => 1],
                    ['nombre' => 'Refuerzo estructural (si aplica)',                 'orden' => 2],
                    ['nombre' => 'Albañilería y nuevas particiones',                'orden' => 3],
                    ['nombre' => 'Actualización instalaciones sanitarias',          'orden' => 4],
                    ['nombre' => 'Actualización instalaciones eléctricas',          'orden' => 5],
                    ['nombre' => 'Acabados y pintura general',                      'orden' => 6],
                    ['nombre' => 'Limpieza y entrega',                              'orden' => 7],
                ],
            ],
            [
                'clave'            => 'generica',
                'nombre'           => 'Plantilla Genérica',
                'tipo_obra'        => null,
                'descripcion'      => 'Plantilla de fallback para tipos de obra no clasificados',
                'es_predeterminada' => true,
                'items' => [
                    ['nombre' => 'Preparación y movilización',  'orden' => 1],
                    ['nombre' => 'Ejecución de obra gruesa',     'orden' => 2],
                    ['nombre' => 'Instalaciones y servicios',    'orden' => 3],
                    ['nombre' => 'Acabados',                     'orden' => 4],
                    ['nombre' => 'Inspección y control calidad', 'orden' => 5],
                    ['nombre' => 'Entrega y cierre',             'orden' => 6],
                ],
            ],
        ];

        foreach ($plantillas as $data) {
            $items = $data['items'];
            unset($data['items']);

            $totalItems = count($items);
            $ponderacionPorItem = $totalItems > 0 ? round(100 / $totalItems, 2) : 0;

            $plantilla = PlantillaChecklist::firstOrCreate(
                ['clave' => $data['clave']],
                $data
            );

            if ($plantilla->items()->count() === 0) {
                foreach ($items as $item) {
                    ItemPlantilla::create([
                        'plantilla_id' => $plantilla->id,
                        'nombre'       => $item['nombre'],
                        'orden'        => $item['orden'],
                        'ponderacion'  => $ponderacionPorItem,
                    ]);
                }
            }
        }
    }
}
