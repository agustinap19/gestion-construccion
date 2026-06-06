<?php

namespace Database\Seeders;

use App\Models\CategoriaConstructiva;
use App\Models\CategoriaMaterial;
use App\Models\ItemConstructivo;
use App\Models\Material;
use App\Models\RecetaItem;
use App\Models\UnidadMedida;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ItemsConstructivosSeeder extends Seeder
{
    public function run(): void
    {
        // Asegurar materiales adicionales necesarios para las recetas
        $this->seedMaterialesAdicionales();

        $cats = CategoriaConstructiva::pluck('id', 'nombre')->toArray();
        $mats = Material::pluck('id', 'nombre')->toArray();

        $items = $this->definirItems($cats, $mats);

        DB::transaction(function () use ($items) {
            foreach ($items as $itemDef) {
                $receta = $itemDef['receta'] ?? [];
                unset($itemDef['receta']);

                $item = ItemConstructivo::firstOrCreate(
                    ['codigo' => $itemDef['codigo']],
                    $itemDef
                );

                // Solo seed receta si el ítem es nuevo
                if ($item->wasRecentlyCreated) {
                    foreach ($receta as $ing) {
                        RecetaItem::firstOrCreate(
                            ['item_constructivo_id' => $item->id, 'material_id' => $ing['material_id']],
                            [
                                'cantidad_por_unidad_base' => $ing['cantidad'],
                                'unidad_material'          => $ing['unidad'] ?? null,
                                'notas'                    => $ing['notas'] ?? null,
                            ]
                        );
                    }
                }
            }
        });
    }

    private function mat(array $mats, string $nombre): ?int
    {
        return $mats[$nombre] ?? null;
    }

    private function seedMaterialesAdicionales(): void
    {
        $unidades = UnidadMedida::pluck('id', 'simbolo')->toArray();
        $categoriasM = CategoriaMaterial::pluck('id', 'nombre')->toArray();

        $nuevos = [
            ['nombre' => 'Agua para mezcla',            'cat' => 'Áridos',             'uni' => 'm3',       'precio' => 5.00],
            ['nombre' => 'Piedra desplazadora',         'cat' => 'Áridos',             'uni' => 'm3',       'precio' => 80.00],
            ['nombre' => 'Calamina galvanizada 0.30mm', 'cat' => 'Madera',             'uni' => 'pza',      'precio' => 28.00],
            ['nombre' => 'Clavo calaminero 2.5"',       'cat' => 'Herramientas menores','uni' => 'kg',      'precio' => 18.00],
            ['nombre' => 'Clavo 4" con cabeza',         'cat' => 'Herramientas menores','uni' => 'kg',      'precio' => 10.00],
            ['nombre' => 'Viga de madera rolliza 4"',   'cat' => 'Madera',             'uni' => 'pza',      'precio' => 45.00],
            ['nombre' => 'Listón de madera 2x3"',       'cat' => 'Madera',             'uni' => 'pza',      'precio' => 18.00],
            ['nombre' => 'Plastoformo 10x50x100cm',     'cat' => 'Madera',             'uni' => 'pza',      'precio' => 8.50],
            ['nombre' => 'Malla electrosoldada 15x15',  'cat' => 'Acero estructural',  'uni' => 'm2',       'precio' => 45.00],
            ['nombre' => 'Ladrillo adobito',            'cat' => 'Ladrillos y bloques','uni' => 'pza',      'precio' => 0.45],
            ['nombre' => 'Masilla mural',               'cat' => 'Acabados',           'uni' => 'bolsa_25', 'precio' => 42.00],
            ['nombre' => 'Lija de agua #100',           'cat' => 'Herramientas menores','uni' => 'pza',     'precio' => 3.00],
            ['nombre' => 'Fragua / emporador cerámica', 'cat' => 'Acabados',           'uni' => 'kg',       'precio' => 8.00],
            ['nombre' => 'Inodoro con accesorios',      'cat' => 'Plomería',           'uni' => 'pza',      'precio' => 420.00],
            ['nombre' => 'Lavamanos con grifería',      'cat' => 'Plomería',           'uni' => 'pza',      'precio' => 380.00],
            ['nombre' => 'Ducha cromada',               'cat' => 'Plomería',           'uni' => 'pza',      'precio' => 85.00],
            ['nombre' => 'Caja octogonal plástica',     'cat' => 'Electricidad',       'uni' => 'pza',      'precio' => 3.50],
            ['nombre' => 'Conduit PVC 3/4"',            'cat' => 'Electricidad',       'uni' => 'm',        'precio' => 5.50],
            ['nombre' => 'Tablero eléctrico 8 circuitos', 'cat' => 'Electricidad',     'uni' => 'pza',      'precio' => 320.00],
            ['nombre' => 'Breaker 15A',                 'cat' => 'Electricidad',       'uni' => 'pza',      'precio' => 35.00],
            ['nombre' => 'Puerta tablero madera 0.80x2.10m', 'cat' => 'Madera',        'uni' => 'pza',      'precio' => 850.00],
            ['nombre' => 'Marco puerta madera',         'cat' => 'Madera',             'uni' => 'pza',      'precio' => 120.00],
            ['nombre' => 'Bisagra 3" acero',            'cat' => 'Herramientas menores','uni' => 'pza',     'precio' => 8.00],
            ['nombre' => 'Cerradura puerta interior',   'cat' => 'Herramientas menores','uni' => 'pza',     'precio' => 65.00],
            ['nombre' => 'Ventana aluminio+vidrio 1.20x1.00m', 'cat' => 'Herramientas menores','uni' => 'pza','precio' => 480.00],
            ['nombre' => 'Teflón 3/4"',                 'cat' => 'Plomería',           'uni' => 'pza',      'precio' => 2.00],
            ['nombre' => 'Codo PVC 4" 90°',             'cat' => 'Plomería',           'uni' => 'pza',      'precio' => 12.00],
            ['nombre' => 'Codo PVC 1/2" 90°',           'cat' => 'Plomería',           'uni' => 'pza',      'precio' => 2.50],
            ['nombre' => 'Sombrero ventilación PVC 4"', 'cat' => 'Plomería',           'uni' => 'pza',      'precio' => 18.00],
            ['nombre' => 'Cal para replanteo',          'cat' => 'Cemento y mortero',  'uni' => 'bolsa',    'precio' => 25.00],
            ['nombre' => 'Estaca de madera',            'cat' => 'Madera',             'uni' => 'pza',      'precio' => 1.50],
            ['nombre' => 'Alquitrán impermeabilizante', 'cat' => 'Pintura',            'uni' => 'balde',    'precio' => 280.00],
            ['nombre' => 'Pintura látex exterior',      'cat' => 'Pintura',            'uni' => 'gal',      'precio' => 95.00],
            ['nombre' => 'Perfil C galvanizado 4"',     'cat' => 'Acero estructural',  'uni' => 'pza',      'precio' => 95.00],
            ['nombre' => 'Mocheta de ladrillo',         'cat' => 'Ladrillos y bloques','uni' => 'pza',      'precio' => 1.80],
        ];

        $codigo = Material::withTrashed()->count() + 1;
        foreach ($nuevos as $mat) {
            $catId = $categoriasM[$mat['cat']] ?? null;
            if (!$catId) continue;
            $uniId = $unidades[$mat['uni']] ?? null;
            if (!$uniId) continue;

            Material::firstOrCreate(
                ['nombre' => $mat['nombre'], 'categoria_id' => $catId],
                [
                    'codigo'             => 'MAT-' . str_pad($codigo++, 4, '0', STR_PAD_LEFT),
                    'unidad_medida_id'   => $uniId,
                    'precio_referencial' => $mat['precio'],
                    'stock_minimo'       => 5,
                    'tipo'               => 'maestro',
                    'activo'             => true,
                ]
            );
        }
    }

    private function definirItems(array $cats, array $mats): array
    {
        $m = fn(string $nombre) => $this->mat($mats, $nombre);
        $c = fn(string $nombre) => $cats[$nombre] ?? null;

        return [
            // ── CIMIENTOS ──────────────────────────────────────────────────────
            [
                'codigo' => 'ITM-001', 'nombre' => 'Replanteo y trazado de obra',
                'categoria_constructiva_id' => $c('Cimientos'), 'unidad_base' => 'm2',
                'descripcion' => 'Replanteo topográfico con cal y estacas. Sin costo de material relevante.',
                'receta' => [
                    ['material_id' => $m('Cal para replanteo'), 'cantidad' => 0.15, 'unidad' => 'bolsa/m2'],
                    ['material_id' => $m('Estaca de madera'),   'cantidad' => 0.50, 'unidad' => 'pza/m2'],
                ],
            ],
            [
                'codigo' => 'ITM-002', 'nombre' => 'Excavación manual de zapatas',
                'categoria_constructiva_id' => $c('Cimientos'), 'unidad_base' => 'm3',
                'descripcion' => 'Excavación manual en terreno semiduro para zapatas de cimentación.',
                'receta' => [],
            ],
            [
                'codigo' => 'ITM-003', 'nombre' => 'Hormigón ciclópeo para cimientos H12',
                'categoria_constructiva_id' => $c('Cimientos'), 'unidad_base' => 'm3',
                'descripcion' => 'Cimiento corrido de hormigón ciclópeo con piedra desplazadora 50-60%.',
                'receta' => [
                    ['material_id' => $m('Cemento Soboce IP-30'), 'cantidad' => 3.00, 'unidad' => 'bolsa/m3', 'notas' => 'Proporción 1:3:5'],
                    ['material_id' => $m('Piedra desplazadora'),  'cantidad' => 0.55, 'unidad' => 'm3/m3'],
                    ['material_id' => $m('Arena gruesa'),         'cantidad' => 0.35, 'unidad' => 'm3/m3'],
                    ['material_id' => $m('Agua para mezcla'),     'cantidad' => 0.18, 'unidad' => 'm3/m3'],
                ],
            ],
            [
                'codigo' => 'ITM-004', 'nombre' => 'Hormigón armado H21 para zapatas aisladas',
                'categoria_constructiva_id' => $c('Cimientos'), 'unidad_base' => 'm3',
                'descripcion' => 'Zapatas de H°A° resistencia H21 con fierro corrugado 12mm.',
                'receta' => [
                    ['material_id' => $m('Cemento Soboce IP-30'),  'cantidad' => 7.50, 'unidad' => 'bolsa/m3', 'notas' => 'H21 = 210 kg/cm²'],
                    ['material_id' => $m('Fierro corrugado 12mm'), 'cantidad' => 70.0, 'unidad' => 'kg/m3'],
                    ['material_id' => $m('Alambre de amarre #16'), 'cantidad' => 2.00, 'unidad' => 'kg/m3'],
                    ['material_id' => $m('Arena gruesa'),          'cantidad' => 0.45, 'unidad' => 'm3/m3'],
                    ['material_id' => $m('Grava común'),           'cantidad' => 0.85, 'unidad' => 'm3/m3'],
                    ['material_id' => $m('Agua para mezcla'),      'cantidad' => 0.18, 'unidad' => 'm3/m3'],
                ],
            ],
            [
                'codigo' => 'ITM-005', 'nombre' => 'Sobrecimiento de hormigón ciclópeo',
                'categoria_constructiva_id' => $c('Cimientos'), 'unidad_base' => 'm3',
                'descripcion' => 'Sobrecimiento sobre cimiento corrido hasta nivel ±0.00.',
                'receta' => [
                    ['material_id' => $m('Cemento Soboce IP-30'), 'cantidad' => 3.00, 'unidad' => 'bolsa/m3'],
                    ['material_id' => $m('Piedra desplazadora'),  'cantidad' => 0.50, 'unidad' => 'm3/m3'],
                    ['material_id' => $m('Arena gruesa'),         'cantidad' => 0.35, 'unidad' => 'm3/m3'],
                    ['material_id' => $m('Agua para mezcla'),     'cantidad' => 0.16, 'unidad' => 'm3/m3'],
                ],
            ],
            [
                'codigo' => 'ITM-006', 'nombre' => 'Relleno y compactación manual',
                'categoria_constructiva_id' => $c('Cimientos'), 'unidad_base' => 'm3',
                'descripcion' => 'Relleno con material seleccionado y compactación manual por capas.',
                'receta' => [],
            ],

            // ── ESTRUCTURA ─────────────────────────────────────────────────────
            [
                'codigo' => 'ITM-010', 'nombre' => 'Columna H°A° 20x20cm',
                'categoria_constructiva_id' => $c('Estructura'), 'unidad_base' => 'ml',
                'descripcion' => 'Columna de H°A° sección 20x20 con 4 fierros 10mm y estribos 6mm c/15cm.',
                'receta' => [
                    ['material_id' => $m('Cemento Soboce IP-30'),  'cantidad' => 1.50, 'unidad' => 'bolsa/ml'],
                    ['material_id' => $m('Fierro corrugado 10mm'), 'cantidad' => 6.50, 'unidad' => 'kg/ml', 'notas' => '4 varillas Ø10mm'],
                    ['material_id' => $m('Fierro corrugado 8mm'),  'cantidad' => 2.20, 'unidad' => 'kg/ml', 'notas' => 'Estribos Ø8mm c/15cm'],
                    ['material_id' => $m('Alambre de amarre #16'), 'cantidad' => 0.30, 'unidad' => 'kg/ml'],
                    ['material_id' => $m('Arena gruesa'),          'cantidad' => 0.10, 'unidad' => 'm3/ml'],
                    ['material_id' => $m('Grava común'),           'cantidad' => 0.15, 'unidad' => 'm3/ml'],
                    ['material_id' => $m('Agua para mezcla'),      'cantidad' => 0.04, 'unidad' => 'm3/ml'],
                ],
            ],
            [
                'codigo' => 'ITM-011', 'nombre' => 'Columna H°A° 25x25cm',
                'categoria_constructiva_id' => $c('Estructura'), 'unidad_base' => 'ml',
                'descripcion' => 'Columna de H°A° sección 25x25 con 4 fierros 12mm y estribos 8mm c/15cm.',
                'receta' => [
                    ['material_id' => $m('Cemento Soboce IP-30'),  'cantidad' => 2.20, 'unidad' => 'bolsa/ml'],
                    ['material_id' => $m('Fierro corrugado 12mm'), 'cantidad' => 9.50, 'unidad' => 'kg/ml'],
                    ['material_id' => $m('Fierro corrugado 8mm'),  'cantidad' => 3.00, 'unidad' => 'kg/ml'],
                    ['material_id' => $m('Alambre de amarre #16'), 'cantidad' => 0.40, 'unidad' => 'kg/ml'],
                    ['material_id' => $m('Arena gruesa'),          'cantidad' => 0.14, 'unidad' => 'm3/ml'],
                    ['material_id' => $m('Grava común'),           'cantidad' => 0.22, 'unidad' => 'm3/ml'],
                    ['material_id' => $m('Agua para mezcla'),      'cantidad' => 0.05, 'unidad' => 'm3/ml'],
                ],
            ],
            [
                'codigo' => 'ITM-012', 'nombre' => 'Viga H°A° 15x25cm',
                'categoria_constructiva_id' => $c('Estructura'), 'unidad_base' => 'ml',
                'descripcion' => 'Viga principal de H°A° sección 15x25cm.',
                'receta' => [
                    ['material_id' => $m('Cemento Soboce IP-30'),  'cantidad' => 1.80, 'unidad' => 'bolsa/ml'],
                    ['material_id' => $m('Fierro corrugado 12mm'), 'cantidad' => 8.00, 'unidad' => 'kg/ml', 'notas' => 'Longitudinal'],
                    ['material_id' => $m('Fierro corrugado 8mm'),  'cantidad' => 2.50, 'unidad' => 'kg/ml', 'notas' => 'Estribos'],
                    ['material_id' => $m('Alambre de amarre #16'), 'cantidad' => 0.35, 'unidad' => 'kg/ml'],
                    ['material_id' => $m('Arena gruesa'),          'cantidad' => 0.12, 'unidad' => 'm3/ml'],
                    ['material_id' => $m('Grava común'),           'cantidad' => 0.18, 'unidad' => 'm3/ml'],
                    ['material_id' => $m('Agua para mezcla'),      'cantidad' => 0.04, 'unidad' => 'm3/ml'],
                ],
            ],
            [
                'codigo' => 'ITM-013', 'nombre' => 'Losa alivianada con plastoformo e=12cm',
                'categoria_constructiva_id' => $c('Estructura'), 'unidad_base' => 'm2',
                'descripcion' => 'Losa alivianada nervada con casetones de plastoformo, malla electrosoldada y capa de compresión.',
                'receta' => [
                    ['material_id' => $m('Cemento Soboce IP-30'),   'cantidad' => 0.55, 'unidad' => 'bolsa/m2'],
                    ['material_id' => $m('Fierro corrugado 10mm'),  'cantidad' => 2.50, 'unidad' => 'kg/m2', 'notas' => 'Nervios longitudinales'],
                    ['material_id' => $m('Malla electrosoldada 15x15'), 'cantidad' => 1.05, 'unidad' => 'm2/m2', 'notas' => 'Capa de compresión 5cm'],
                    ['material_id' => $m('Plastoformo 10x50x100cm'), 'cantidad' => 2.00, 'unidad' => 'pza/m2', 'notas' => 'Aligerador'],
                    ['material_id' => $m('Arena gruesa'),            'cantidad' => 0.04, 'unidad' => 'm3/m2'],
                    ['material_id' => $m('Grava común'),             'cantidad' => 0.06, 'unidad' => 'm3/m2'],
                    ['material_id' => $m('Alambre de amarre #16'),   'cantidad' => 0.10, 'unidad' => 'kg/m2'],
                ],
            ],
            [
                'codigo' => 'ITM-014', 'nombre' => 'Losa maciza H°A° e=12cm',
                'categoria_constructiva_id' => $c('Estructura'), 'unidad_base' => 'm2',
                'descripcion' => 'Losa maciza de H°A° resistencia H21, espesor 12cm.',
                'receta' => [
                    ['material_id' => $m('Cemento Soboce IP-30'),  'cantidad' => 0.75, 'unidad' => 'bolsa/m2'],
                    ['material_id' => $m('Fierro corrugado 10mm'), 'cantidad' => 5.00, 'unidad' => 'kg/m2'],
                    ['material_id' => $m('Alambre de amarre #16'), 'cantidad' => 0.15, 'unidad' => 'kg/m2'],
                    ['material_id' => $m('Arena gruesa'),          'cantidad' => 0.05, 'unidad' => 'm3/m2'],
                    ['material_id' => $m('Grava común'),           'cantidad' => 0.08, 'unidad' => 'm3/m2'],
                    ['material_id' => $m('Agua para mezcla'),      'cantidad' => 0.02, 'unidad' => 'm3/m2'],
                ],
            ],

            // ── ALBAÑILERÍA ────────────────────────────────────────────────────
            [
                'codigo' => 'ITM-020', 'nombre' => 'Muro de ladrillo 6 huecos e=12cm',
                'categoria_constructiva_id' => $c('Albañilería'), 'unidad_base' => 'm2',
                'descripcion' => 'Muro de ladrillo cerámico 6 huecos aparejado tipo soga, e=12cm.',
                'receta' => [
                    ['material_id' => $m('Ladrillo 6 huecos'),    'cantidad' => 36.0, 'unidad' => 'pza/m2', 'notas' => 'Incluye 5% desperdicio'],
                    ['material_id' => $m('Cemento Soboce IP-30'), 'cantidad' => 0.22, 'unidad' => 'bolsa/m2'],
                    ['material_id' => $m('Arena fina'),           'cantidad' => 0.018,'unidad' => 'm3/m2', 'notas' => 'Mortero 1:4'],
                ],
            ],
            [
                'codigo' => 'ITM-021', 'nombre' => 'Muro de ladrillo gambote aparejado',
                'categoria_constructiva_id' => $c('Albañilería'), 'unidad_base' => 'm2',
                'descripcion' => 'Muro de ladrillo gambote (macizo) aparejado con mortero 1:4.',
                'receta' => [
                    ['material_id' => $m('Ladrillo gambote'),     'cantidad' => 70.0, 'unidad' => 'pza/m2', 'notas' => 'Incluye 5% desperdicio'],
                    ['material_id' => $m('Cemento Soboce IP-30'), 'cantidad' => 0.30, 'unidad' => 'bolsa/m2'],
                    ['material_id' => $m('Arena fina'),           'cantidad' => 0.025,'unidad' => 'm3/m2'],
                ],
            ],
            [
                'codigo' => 'ITM-022', 'nombre' => 'Muro de ladrillo adobito e=8cm',
                'categoria_constructiva_id' => $c('Albañilería'), 'unidad_base' => 'm2',
                'descripcion' => 'Tabique liviano de ladrillo adobito soga, e=8cm.',
                'receta' => [
                    ['material_id' => $m('Ladrillo adobito'),     'cantidad' => 58.0, 'unidad' => 'pza/m2'],
                    ['material_id' => $m('Cemento Soboce IP-30'), 'cantidad' => 0.18, 'unidad' => 'bolsa/m2'],
                    ['material_id' => $m('Arena fina'),           'cantidad' => 0.015,'unidad' => 'm3/m2'],
                ],
            ],
            [
                'codigo' => 'ITM-023', 'nombre' => 'Dintel de H°A° sobre vanos',
                'categoria_constructiva_id' => $c('Albañilería'), 'unidad_base' => 'ml',
                'descripcion' => 'Dintel de H°A° 15x15cm armado sobre vanos de puertas y ventanas.',
                'receta' => [
                    ['material_id' => $m('Cemento Soboce IP-30'),  'cantidad' => 0.35, 'unidad' => 'bolsa/ml'],
                    ['material_id' => $m('Fierro corrugado 10mm'), 'cantidad' => 1.80, 'unidad' => 'kg/ml'],
                    ['material_id' => $m('Arena gruesa'),          'cantidad' => 0.025,'unidad' => 'm3/ml'],
                    ['material_id' => $m('Grava común'),           'cantidad' => 0.035,'unidad' => 'm3/ml'],
                ],
            ],

            // ── CUBIERTA ──────────────────────────────────────────────────────
            [
                'codigo' => 'ITM-030', 'nombre' => 'Estructura de cubierta madera rolliza',
                'categoria_constructiva_id' => $c('Cubierta'), 'unidad_base' => 'm2',
                'descripcion' => 'Estructura de cubierta con vigas rollizas de eucalipto y listones, pendiente 20-30%.',
                'receta' => [
                    ['material_id' => $m('Viga de madera rolliza 4"'), 'cantidad' => 0.35, 'unidad' => 'pza/m2'],
                    ['material_id' => $m('Listón de madera 2x3"'),     'cantidad' => 1.20, 'unidad' => 'pza/m2'],
                    ['material_id' => $m('Clavo 4" con cabeza'),       'cantidad' => 0.12, 'unidad' => 'kg/m2'],
                ],
            ],
            [
                'codigo' => 'ITM-031', 'nombre' => 'Cubierta de calamina galvanizada 0.30mm',
                'categoria_constructiva_id' => $c('Cubierta'), 'unidad_base' => 'm2',
                'descripcion' => 'Cubierta de calamina galvanizada lisa sobre estructura de madera.',
                'receta' => [
                    ['material_id' => $m('Calamina galvanizada 0.30mm'), 'cantidad' => 1.10, 'unidad' => 'pza/m2', 'notas' => 'Traslape 10%'],
                    ['material_id' => $m('Clavo calaminero 2.5"'),       'cantidad' => 0.10, 'unidad' => 'kg/m2'],
                    ['material_id' => $m('Listón de madera 2x3"'),       'cantidad' => 0.50, 'unidad' => 'pza/m2'],
                ],
            ],
            [
                'codigo' => 'ITM-032', 'nombre' => 'Impermeabilización de cubierta plana',
                'categoria_constructiva_id' => $c('Cubierta'), 'unidad_base' => 'm2',
                'descripcion' => 'Impermeabilización con alquitrán + membrana asfáltica en cubierta plana.',
                'receta' => [
                    ['material_id' => $m('Alquitrán impermeabilizante'), 'cantidad' => 0.05, 'unidad' => 'balde/m2'],
                    ['material_id' => $m('Impermeabilizante acrílico'),  'cantidad' => 0.04, 'unidad' => 'balde/m2'],
                ],
            ],

            // ── REVOQUES Y ACABADOS ────────────────────────────────────────────
            [
                'codigo' => 'ITM-040', 'nombre' => 'Revoque grueso de mortero cem-arena interior',
                'categoria_constructiva_id' => $c('Revoques y acabados'), 'unidad_base' => 'm2',
                'descripcion' => 'Revoque base de mortero 1:4 sobre muros interiores, e=1.5cm.',
                'receta' => [
                    ['material_id' => $m('Cemento Soboce IP-30'), 'cantidad' => 0.15, 'unidad' => 'bolsa/m2', 'notas' => 'Mortero 1:4'],
                    ['material_id' => $m('Arena fina'),           'cantidad' => 0.020,'unidad' => 'm3/m2'],
                ],
            ],
            [
                'codigo' => 'ITM-041', 'nombre' => 'Revoque grueso de mortero cem-arena exterior',
                'categoria_constructiva_id' => $c('Revoques y acabados'), 'unidad_base' => 'm2',
                'descripcion' => 'Revoque base de mortero 1:3 sobre muros exteriores, e=2cm.',
                'receta' => [
                    ['material_id' => $m('Cemento Soboce IP-30'), 'cantidad' => 0.20, 'unidad' => 'bolsa/m2'],
                    ['material_id' => $m('Arena fina'),           'cantidad' => 0.025,'unidad' => 'm3/m2'],
                ],
            ],
            [
                'codigo' => 'ITM-042', 'nombre' => 'Revoque fino con yeso interior',
                'categoria_constructiva_id' => $c('Revoques y acabados'), 'unidad_base' => 'm2',
                'descripcion' => 'Enlucido fino de yeso sobre revoque grueso, e=5mm.',
                'receta' => [
                    ['material_id' => $m('Yeso de construcción'), 'cantidad' => 0.25, 'unidad' => 'bolsa/m2'],
                ],
            ],
            [
                'codigo' => 'ITM-043', 'nombre' => 'Cielo raso de yeso plano',
                'categoria_constructiva_id' => $c('Revoques y acabados'), 'unidad_base' => 'm2',
                'descripcion' => 'Cielo raso de yeso sobre base de malla metálica, acabado liso.',
                'receta' => [
                    ['material_id' => $m('Yeso de construcción'), 'cantidad' => 0.35, 'unidad' => 'bolsa/m2'],
                    ['material_id' => $m('Alambre de amarre #16'),'cantidad' => 0.05, 'unidad' => 'kg/m2'],
                ],
            ],

            // ── PISOS ──────────────────────────────────────────────────────────
            [
                'codigo' => 'ITM-050', 'nombre' => 'Contrapiso de hormigón simple e=5cm',
                'categoria_constructiva_id' => $c('Pisos'), 'unidad_base' => 'm2',
                'descripcion' => 'Contrapiso de H° simple sobre apisonado, e=5cm.',
                'receta' => [
                    ['material_id' => $m('Cemento Soboce IP-30'), 'cantidad' => 0.35, 'unidad' => 'bolsa/m2'],
                    ['material_id' => $m('Arena gruesa'),         'cantidad' => 0.03, 'unidad' => 'm3/m2'],
                    ['material_id' => $m('Grava común'),          'cantidad' => 0.04, 'unidad' => 'm3/m2'],
                ],
            ],
            [
                'codigo' => 'ITM-051', 'nombre' => 'Piso cerámico 30x30cm antideslizante',
                'categoria_constructiva_id' => $c('Pisos'), 'unidad_base' => 'm2',
                'descripcion' => 'Piso de cerámica 30x30 antideslizante con pegamento y fragua.',
                'receta' => [
                    ['material_id' => $m('Cerámica piso 30x30 antideslizante'), 'cantidad' => 1.08, 'unidad' => 'm2/m2', 'notas' => '8% desperdicio'],
                    ['material_id' => $m('Pegamento cerámico estándar'),        'cantidad' => 0.40, 'unidad' => 'bolsa/m2'],
                    ['material_id' => $m('Fragua / emporador cerámica'),        'cantidad' => 0.20, 'unidad' => 'kg/m2'],
                    ['material_id' => $m('Cemento Soboce IP-30'),               'cantidad' => 0.10, 'unidad' => 'bolsa/m2', 'notas' => 'Nivelación'],
                ],
            ],
            [
                'codigo' => 'ITM-052', 'nombre' => 'Zócalo cerámico 8x25cm h=10cm',
                'categoria_constructiva_id' => $c('Pisos'), 'unidad_base' => 'ml',
                'descripcion' => 'Zócalo cerámico de 10cm de altura pegado con pegamento.',
                'receta' => [
                    ['material_id' => $m('Cerámica baño 20x30 blanca'),  'cantidad' => 0.12, 'unidad' => 'm2/ml'],
                    ['material_id' => $m('Pegamento cerámico estándar'), 'cantidad' => 0.05, 'unidad' => 'bolsa/ml'],
                    ['material_id' => $m('Fragua / emporador cerámica'), 'cantidad' => 0.03, 'unidad' => 'kg/ml'],
                ],
            ],
            [
                'codigo' => 'ITM-053', 'nombre' => 'Revestimiento cerámico de baño 20x30cm',
                'categoria_constructiva_id' => $c('Pisos'), 'unidad_base' => 'm2',
                'descripcion' => 'Cerámica de pared para baño 20x30cm con pegamento y emporado.',
                'receta' => [
                    ['material_id' => $m('Cerámica baño 20x30 blanca'),  'cantidad' => 1.08, 'unidad' => 'm2/m2'],
                    ['material_id' => $m('Pegamento cerámico estándar'), 'cantidad' => 0.40, 'unidad' => 'bolsa/m2'],
                    ['material_id' => $m('Fragua / emporador cerámica'), 'cantidad' => 0.25, 'unidad' => 'kg/m2'],
                ],
            ],

            // ── PINTURA ────────────────────────────────────────────────────────
            [
                'codigo' => 'ITM-060', 'nombre' => 'Pintura látex interior 2 manos',
                'categoria_constructiva_id' => $c('Pintura'), 'unidad_base' => 'm2',
                'descripcion' => 'Pintura látex blanca 2 manos sobre revoque fino, incluye masilla y lija.',
                'receta' => [
                    ['material_id' => $m('Pintura látex blanca interior'), 'cantidad' => 0.13, 'unidad' => 'gal/m2', 'notas' => '2 manos'],
                    ['material_id' => $m('Masilla mural'),                 'cantidad' => 0.05, 'unidad' => 'bolsa/m2'],
                    ['material_id' => $m('Lija de agua #100'),             'cantidad' => 0.10, 'unidad' => 'pza/m2'],
                ],
            ],
            [
                'codigo' => 'ITM-061', 'nombre' => 'Pintura látex exterior 2 manos',
                'categoria_constructiva_id' => $c('Pintura'), 'unidad_base' => 'm2',
                'descripcion' => 'Pintura látex exterior resistente a la intemperie, 2 manos.',
                'receta' => [
                    ['material_id' => $m('Pintura látex exterior'), 'cantidad' => 0.14, 'unidad' => 'gal/m2'],
                    ['material_id' => $m('Masilla mural'),          'cantidad' => 0.03, 'unidad' => 'bolsa/m2'],
                    ['material_id' => $m('Lija de agua #100'),      'cantidad' => 0.08, 'unidad' => 'pza/m2'],
                ],
            ],
            [
                'codigo' => 'ITM-062', 'nombre' => 'Barniz sintético para madera 2 manos',
                'categoria_constructiva_id' => $c('Pintura'), 'unidad_base' => 'm2',
                'descripcion' => 'Barniz sintético transparente sobre carpintería de madera.',
                'receta' => [
                    ['material_id' => $m('Pintura sintética negra'), 'cantidad' => 0.10, 'unidad' => 'gal/m2', 'notas' => 'Usar barniz transparente'],
                    ['material_id' => $m('Lija de agua #100'),       'cantidad' => 0.15, 'unidad' => 'pza/m2'],
                ],
            ],

            // ── INSTALACIÓN SANITARIA ──────────────────────────────────────────
            [
                'codigo' => 'ITM-070', 'nombre' => 'Punto de agua fría 1/2" PVC',
                'categoria_constructiva_id' => $c('Instalación sanitaria'), 'unidad_base' => 'pza',
                'descripcion' => 'Punto de agua fría con tubería PVC 1/2" hasta salida de artefacto.',
                'receta' => [
                    ['material_id' => $m('Tubería PVC 1/2" agua potable'), 'cantidad' => 4.00, 'unidad' => 'm/pza'],
                    ['material_id' => $m('Codo PVC 1/2" 90°'),            'cantidad' => 2.00, 'unidad' => 'pza/pto'],
                    ['material_id' => $m('Teflón 3/4"'),                  'cantidad' => 1.00, 'unidad' => 'pza/pto'],
                    ['material_id' => $m('Pegamento PVC'),                 'cantidad' => 0.05, 'unidad' => 'L/pto'],
                ],
            ],
            [
                'codigo' => 'ITM-071', 'nombre' => 'Punto de desagüe 4" PVC',
                'categoria_constructiva_id' => $c('Instalación sanitaria'), 'unidad_base' => 'pza',
                'descripcion' => 'Punto de desagüe con tubería PVC 4" hasta columna colectora.',
                'receta' => [
                    ['material_id' => $m('Tubería PVC 4" desagüe'), 'cantidad' => 2.00, 'unidad' => 'm/pto'],
                    ['material_id' => $m('Codo PVC 4" 90°'),        'cantidad' => 1.00, 'unidad' => 'pza/pto'],
                    ['material_id' => $m('Pegamento PVC'),           'cantidad' => 0.10, 'unidad' => 'L/pto'],
                ],
            ],
            [
                'codigo' => 'ITM-072', 'nombre' => 'Inodoro con cisterna instalado',
                'categoria_constructiva_id' => $c('Instalación sanitaria'), 'unidad_base' => 'pza',
                'descripcion' => 'Inodoro de porcelana con cisterna, accesorios y anclaje.',
                'receta' => [
                    ['material_id' => $m('Inodoro con accesorios'), 'cantidad' => 1.00, 'unidad' => 'pza/pza'],
                    ['material_id' => $m('Teflón 3/4"'),            'cantidad' => 2.00, 'unidad' => 'pza/pza'],
                    ['material_id' => $m('Cemento Soboce IP-30'),   'cantidad' => 0.02, 'unidad' => 'bolsa/pza', 'notas' => 'Anclaje base'],
                ],
            ],
            [
                'codigo' => 'ITM-073', 'nombre' => 'Lavamanos con grifería instalado',
                'categoria_constructiva_id' => $c('Instalación sanitaria'), 'unidad_base' => 'pza',
                'descripcion' => 'Lavamanos de porcelana con grifería monocomando y accesorios.',
                'receta' => [
                    ['material_id' => $m('Lavamanos con grifería'), 'cantidad' => 1.00, 'unidad' => 'pza/pza'],
                    ['material_id' => $m('Teflón 3/4"'),            'cantidad' => 2.00, 'unidad' => 'pza/pza'],
                ],
            ],
            [
                'codigo' => 'ITM-074', 'nombre' => 'Ducha cromada instalada',
                'categoria_constructiva_id' => $c('Instalación sanitaria'), 'unidad_base' => 'pza',
                'descripcion' => 'Ducha cromada teléfono con válvula termostática.',
                'receta' => [
                    ['material_id' => $m('Ducha cromada'), 'cantidad' => 1.00, 'unidad' => 'pza/pza'],
                    ['material_id' => $m('Teflón 3/4"'),   'cantidad' => 2.00, 'unidad' => 'pza/pza'],
                ],
            ],
            [
                'codigo' => 'ITM-075', 'nombre' => 'Cámara séptica prefabricada',
                'categoria_constructiva_id' => $c('Instalación sanitaria'), 'unidad_base' => 'glb',
                'descripcion' => 'Cámara séptica prefabricada de concreto con tapa para casa de 1 baño.',
                'receta' => [
                    ['material_id' => $m('Cemento Soboce IP-30'), 'cantidad' => 5.00, 'unidad' => 'bolsa/glb'],
                    ['material_id' => $m('Arena gruesa'),         'cantidad' => 0.40, 'unidad' => 'm3/glb'],
                    ['material_id' => $m('Piedra manzana'),       'cantidad' => 0.60, 'unidad' => 'm3/glb'],
                ],
            ],

            // ── INSTALACIÓN ELÉCTRICA ──────────────────────────────────────────
            [
                'codigo' => 'ITM-080', 'nombre' => 'Punto de luz (salida para luminaria)',
                'categoria_constructiva_id' => $c('Instalación eléctrica'), 'unidad_base' => 'pza',
                'descripcion' => 'Punto de luz completo con caja octogonal, conduit, cable y foco LED.',
                'receta' => [
                    ['material_id' => $m('Cable eléctrico 2.5mm2 AWG'), 'cantidad' => 6.00, 'unidad' => 'm/pto'],
                    ['material_id' => $m('Caja octogonal plástica'),    'cantidad' => 1.00, 'unidad' => 'pza/pto'],
                    ['material_id' => $m('Conduit PVC 3/4"'),           'cantidad' => 3.00, 'unidad' => 'm/pto'],
                    ['material_id' => $m('Interruptor simple'),         'cantidad' => 1.00, 'unidad' => 'pza/pto'],
                    ['material_id' => $m('Foco LED 9W luz fría'),       'cantidad' => 1.00, 'unidad' => 'pza/pto'],
                ],
            ],
            [
                'codigo' => 'ITM-081', 'nombre' => 'Tomacorriente doble instalado',
                'categoria_constructiva_id' => $c('Instalación eléctrica'), 'unidad_base' => 'pza',
                'descripcion' => 'Tomacorriente doble con caja y conduit.',
                'receta' => [
                    ['material_id' => $m('Cable eléctrico 2.5mm2 AWG'), 'cantidad' => 5.00, 'unidad' => 'm/pza'],
                    ['material_id' => $m('Caja octogonal plástica'),    'cantidad' => 1.00, 'unidad' => 'pza/pza'],
                    ['material_id' => $m('Conduit PVC 3/4"'),           'cantidad' => 2.50, 'unidad' => 'm/pza'],
                    ['material_id' => $m('Tomacorriente doble'),        'cantidad' => 1.00, 'unidad' => 'pza/pza'],
                ],
            ],
            [
                'codigo' => 'ITM-082', 'nombre' => 'Tablero de distribución 8 circuitos',
                'categoria_constructiva_id' => $c('Instalación eléctrica'), 'unidad_base' => 'glb',
                'descripcion' => 'Tablero termomagnético de 8 circuitos con breakers y acometida.',
                'receta' => [
                    ['material_id' => $m('Tablero eléctrico 8 circuitos'), 'cantidad' => 1.00, 'unidad' => 'pza/glb'],
                    ['material_id' => $m('Breaker 15A'),                   'cantidad' => 8.00, 'unidad' => 'pza/glb'],
                    ['material_id' => $m('Cable eléctrico 4.0mm2 AWG'),   'cantidad' => 10.0, 'unidad' => 'm/glb', 'notas' => 'Alimentador'],
                ],
            ],

            // ── CARPINTERÍA ────────────────────────────────────────────────────
            [
                'codigo' => 'ITM-090', 'nombre' => 'Puerta tablero madera 0.80x2.10m',
                'categoria_constructiva_id' => $c('Carpintería'), 'unidad_base' => 'pza',
                'descripcion' => 'Puerta tablero de madera dura 0.80x2.10m con marco, bisagras y cerradura.',
                'receta' => [
                    ['material_id' => $m('Puerta tablero madera 0.80x2.10m'), 'cantidad' => 1.00, 'unidad' => 'pza/pza'],
                    ['material_id' => $m('Marco puerta madera'),              'cantidad' => 1.00, 'unidad' => 'pza/pza'],
                    ['material_id' => $m('Bisagra 3" acero'),                 'cantidad' => 3.00, 'unidad' => 'pza/pza'],
                    ['material_id' => $m('Cerradura puerta interior'),        'cantidad' => 1.00, 'unidad' => 'pza/pza'],
                    ['material_id' => $m('Pintura látex blanca interior'),    'cantidad' => 0.10, 'unidad' => 'gal/pza', 'notas' => 'Acabado marco'],
                ],
            ],
            [
                'codigo' => 'ITM-091', 'nombre' => 'Ventana aluminio+vidrio 1.20x1.00m',
                'categoria_constructiva_id' => $c('Carpintería'), 'unidad_base' => 'pza',
                'descripcion' => 'Ventana corredera de aluminio natural con vidrio templado 4mm.',
                'receta' => [
                    ['material_id' => $m('Ventana aluminio+vidrio 1.20x1.00m'), 'cantidad' => 1.00, 'unidad' => 'pza/pza'],
                ],
            ],
            [
                'codigo' => 'ITM-092', 'nombre' => 'Puerta tablero madera 0.90x2.10m principal',
                'categoria_constructiva_id' => $c('Carpintería'), 'unidad_base' => 'pza',
                'descripcion' => 'Puerta principal maciza con marco, bisagras de seguridad y cerradura embutida.',
                'receta' => [
                    ['material_id' => $m('Puerta tablero madera 0.80x2.10m'), 'cantidad' => 1.00, 'unidad' => 'pza/pza'],
                    ['material_id' => $m('Marco puerta madera'),              'cantidad' => 1.00, 'unidad' => 'pza/pza'],
                    ['material_id' => $m('Bisagra 3" acero'),                 'cantidad' => 3.00, 'unidad' => 'pza/pza'],
                    ['material_id' => $m('Cerradura puerta interior'),        'cantidad' => 1.00, 'unidad' => 'pza/pza'],
                ],
            ],

            // ── INSUMOS GENERALES ──────────────────────────────────────────────
            [
                'codigo' => 'ITM-100', 'nombre' => 'Insumos generales de obra',
                'categoria_constructiva_id' => $c('Insumos generales'), 'unidad_base' => 'glb',
                'descripcion' => 'Clavos surtidos, alambre, ferretería menor y consumibles de obra.',
                'receta' => [
                    ['material_id' => $m('Clavos 2" con cabeza'),    'cantidad' => 5.00, 'unidad' => 'kg/glb'],
                    ['material_id' => $m('Clavos 3" con cabeza'),    'cantidad' => 5.00, 'unidad' => 'kg/glb'],
                    ['material_id' => $m('Alambre de amarre #16'),   'cantidad' => 3.00, 'unidad' => 'kg/glb'],
                    ['material_id' => $m('Disco de corte metal 4.5"'), 'cantidad' => 2.00, 'unidad' => 'pza/glb'],
                ],
            ],
            [
                'codigo' => 'ITM-101', 'nombre' => 'Limpieza final de obra',
                'categoria_constructiva_id' => $c('Insumos generales'), 'unidad_base' => 'glb',
                'descripcion' => 'Limpieza general de la obra incluyendo retiro de escombros y entrega.',
                'receta' => [],
            ],
        ];
    }
}
