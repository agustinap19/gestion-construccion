<?php

namespace Database\Seeders;

use App\Models\ItemConstructivo;
use App\Models\ItemPlantillaConstructiva;
use App\Models\PlantillaConstructiva;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PlantillasConstructivasSeeder extends Seeder
{
    public function run(): void
    {
        $items = ItemConstructivo::pluck('id', 'codigo')->toArray();

        DB::transaction(function () use ($items) {
            $this->crearPlantillaSocial1($items);
            $this->crearPlantillaSocial2($items);
            $this->crearPlantillaSocial3($items);
            $this->crearCasaPrivada($items);
            $this->crearEdificio($items);
            $this->crearRemodelacion($items);
        });
    }

    private function crearPlantilla(string $nombre, string $tipo, ?string $tipologia, string $descripcion, array $itemsConfig): PlantillaConstructiva
    {
        if (PlantillaConstructiva::where('nombre', $nombre)->where('tipo_obra', $tipo)->exists()) {
            return PlantillaConstructiva::where('nombre', $nombre)->where('tipo_obra', $tipo)->first();
        }

        $plantilla = PlantillaConstructiva::create([
            'nombre'      => $nombre,
            'descripcion' => $descripcion,
            'tipo_obra'   => $tipo,
            'tipologia'   => $tipologia,
            'version'     => 1,
            'estado'      => true,
            'es_sistema'  => true,
        ]);

        foreach ($itemsConfig as $orden => $cfg) {
            ItemPlantillaConstructiva::create([
                'plantilla_id'         => $plantilla->id,
                'item_constructivo_id' => $cfg['id'],
                'orden'                => $orden + 1,
                'ponderacion_avance'   => $cfg['pond'],
                'cantidad_sugerida'    => $cfg['cant'] ?? null,
            ]);
        }

        return $plantilla;
    }

    private function crearPlantillaSocial1(array $items): void
    {
        // Vivienda social TIPO 1 — 1 dorm, ~45 m²
        $this->crearPlantilla(
            'Vivienda Social TIPO 1 — 1 Dormitorio',
            'vivienda_social',
            'TIPO 1',
            'Plantilla para vivienda social de 1 dormitorio. Ambientes: dormitorio, sala-comedor, baño, cocina. ~45 m² construidos.',
            array_filter([
                ['id' => $items['ITM-001'] ?? null, 'pond' => 1.00, 'cant' => 45.00],
                ['id' => $items['ITM-002'] ?? null, 'pond' => 1.50, 'cant' => 18.00],
                ['id' => $items['ITM-003'] ?? null, 'pond' => 2.00, 'cant' => 5.50],
                ['id' => $items['ITM-004'] ?? null, 'pond' => 3.00, 'cant' => 8.00],
                ['id' => $items['ITM-005'] ?? null, 'pond' => 1.50, 'cant' => 2.80],
                ['id' => $items['ITM-010'] ?? null, 'pond' => 4.00, 'cant' => 28.00],
                ['id' => $items['ITM-012'] ?? null, 'pond' => 3.50, 'cant' => 18.00],
                ['id' => $items['ITM-013'] ?? null, 'pond' => 4.00, 'cant' => 35.00],
                ['id' => $items['ITM-020'] ?? null, 'pond' => 4.00, 'cant' => 55.00],
                ['id' => $items['ITM-021'] ?? null, 'pond' => 2.00, 'cant' => 12.00],
                ['id' => $items['ITM-023'] ?? null, 'pond' => 1.50, 'cant' => 8.00],
                ['id' => $items['ITM-030'] ?? null, 'pond' => 3.00, 'cant' => 35.00],
                ['id' => $items['ITM-031'] ?? null, 'pond' => 2.50, 'cant' => 38.00],
                ['id' => $items['ITM-040'] ?? null, 'pond' => 3.00, 'cant' => 110.00],
                ['id' => $items['ITM-042'] ?? null, 'pond' => 2.00, 'cant' => 110.00],
                ['id' => $items['ITM-043'] ?? null, 'pond' => 1.50, 'cant' => 38.00],
                ['id' => $items['ITM-050'] ?? null, 'pond' => 2.00, 'cant' => 38.00],
                ['id' => $items['ITM-051'] ?? null, 'pond' => 2.50, 'cant' => 32.00],
                ['id' => $items['ITM-052'] ?? null, 'pond' => 1.00, 'cant' => 14.00],
                ['id' => $items['ITM-060'] ?? null, 'pond' => 2.00, 'cant' => 110.00],
                ['id' => $items['ITM-070'] ?? null, 'pond' => 2.50, 'cant' => 3.00],
                ['id' => $items['ITM-071'] ?? null, 'pond' => 2.50, 'cant' => 3.00],
                ['id' => $items['ITM-072'] ?? null, 'pond' => 2.50, 'cant' => 1.00],
                ['id' => $items['ITM-073'] ?? null, 'pond' => 2.00, 'cant' => 1.00],
                ['id' => $items['ITM-080'] ?? null, 'pond' => 2.00, 'cant' => 6.00],
                ['id' => $items['ITM-081'] ?? null, 'pond' => 2.00, 'cant' => 4.00],
                ['id' => $items['ITM-082'] ?? null, 'pond' => 2.50, 'cant' => 1.00],
                ['id' => $items['ITM-090'] ?? null, 'pond' => 3.00, 'cant' => 3.00],
                ['id' => $items['ITM-091'] ?? null, 'pond' => 2.50, 'cant' => 2.00],
                ['id' => $items['ITM-101'] ?? null, 'pond' => 2.00, 'cant' => 1.00],
            ], fn($i) => ($i['id'] ?? null) !== null)
        );
    }

    private function crearPlantillaSocial2(array $items): void
    {
        // Vivienda social TIPO 2 — 2 dorm, ~60 m²
        $this->crearPlantilla(
            'Vivienda Social TIPO 2 — 2 Dormitorios',
            'vivienda_social',
            'TIPO 2',
            'Plantilla para vivienda social de 2 dormitorios. Ambientes: 2 dormitorios, sala-comedor, baño, cocina. ~60 m² construidos.',
            array_filter([
                ['id' => $items['ITM-001'] ?? null, 'pond' => 1.00, 'cant' => 60.00],
                ['id' => $items['ITM-002'] ?? null, 'pond' => 1.50, 'cant' => 22.00],
                ['id' => $items['ITM-003'] ?? null, 'pond' => 2.00, 'cant' => 7.00],
                ['id' => $items['ITM-004'] ?? null, 'pond' => 3.00, 'cant' => 10.50],
                ['id' => $items['ITM-005'] ?? null, 'pond' => 1.00, 'cant' => 3.50],
                ['id' => $items['ITM-010'] ?? null, 'pond' => 4.00, 'cant' => 36.00],
                ['id' => $items['ITM-012'] ?? null, 'pond' => 3.50, 'cant' => 24.00],
                ['id' => $items['ITM-013'] ?? null, 'pond' => 4.00, 'cant' => 48.00],
                ['id' => $items['ITM-020'] ?? null, 'pond' => 4.00, 'cant' => 75.00],
                ['id' => $items['ITM-021'] ?? null, 'pond' => 1.50, 'cant' => 14.00],
                ['id' => $items['ITM-023'] ?? null, 'pond' => 1.00, 'cant' => 10.00],
                ['id' => $items['ITM-030'] ?? null, 'pond' => 2.50, 'cant' => 48.00],
                ['id' => $items['ITM-031'] ?? null, 'pond' => 2.50, 'cant' => 52.00],
                ['id' => $items['ITM-040'] ?? null, 'pond' => 3.00, 'cant' => 145.00],
                ['id' => $items['ITM-042'] ?? null, 'pond' => 2.00, 'cant' => 145.00],
                ['id' => $items['ITM-043'] ?? null, 'pond' => 1.00, 'cant' => 52.00],
                ['id' => $items['ITM-050'] ?? null, 'pond' => 1.50, 'cant' => 52.00],
                ['id' => $items['ITM-051'] ?? null, 'pond' => 2.50, 'cant' => 44.00],
                ['id' => $items['ITM-052'] ?? null, 'pond' => 1.00, 'cant' => 16.00],
                ['id' => $items['ITM-060'] ?? null, 'pond' => 2.00, 'cant' => 145.00],
                ['id' => $items['ITM-070'] ?? null, 'pond' => 2.00, 'cant' => 4.00],
                ['id' => $items['ITM-071'] ?? null, 'pond' => 2.00, 'cant' => 4.00],
                ['id' => $items['ITM-072'] ?? null, 'pond' => 2.50, 'cant' => 1.00],
                ['id' => $items['ITM-073'] ?? null, 'pond' => 2.00, 'cant' => 1.00],
                ['id' => $items['ITM-080'] ?? null, 'pond' => 2.00, 'cant' => 8.00],
                ['id' => $items['ITM-081'] ?? null, 'pond' => 2.00, 'cant' => 5.00],
                ['id' => $items['ITM-082'] ?? null, 'pond' => 2.00, 'cant' => 1.00],
                ['id' => $items['ITM-090'] ?? null, 'pond' => 3.00, 'cant' => 4.00],
                ['id' => $items['ITM-091'] ?? null, 'pond' => 2.50, 'cant' => 3.00],
                ['id' => $items['ITM-101'] ?? null, 'pond' => 2.00, 'cant' => 1.00],
            ], fn($i) => ($i['id'] ?? null) !== null)
        );
    }

    private function crearPlantillaSocial3(array $items): void
    {
        // Vivienda social TIPO 3 — 3 dorm, ~75 m²
        $this->crearPlantilla(
            'Vivienda Social TIPO 3 — 3 Dormitorios',
            'vivienda_social',
            'TIPO 3',
            'Plantilla para vivienda social de 3 dormitorios. Ambientes: 3 dormitorios, sala-comedor, baño, cocina. ~75 m² construidos.',
            array_filter([
                ['id' => $items['ITM-001'] ?? null, 'pond' => 1.00, 'cant' => 75.00],
                ['id' => $items['ITM-002'] ?? null, 'pond' => 1.00, 'cant' => 28.00],
                ['id' => $items['ITM-003'] ?? null, 'pond' => 2.00, 'cant' => 9.00],
                ['id' => $items['ITM-004'] ?? null, 'pond' => 3.00, 'cant' => 13.00],
                ['id' => $items['ITM-005'] ?? null, 'pond' => 1.00, 'cant' => 4.50],
                ['id' => $items['ITM-010'] ?? null, 'pond' => 4.00, 'cant' => 44.00],
                ['id' => $items['ITM-011'] ?? null, 'pond' => 2.00, 'cant' => 8.00],
                ['id' => $items['ITM-012'] ?? null, 'pond' => 3.00, 'cant' => 28.00],
                ['id' => $items['ITM-013'] ?? null, 'pond' => 3.00, 'cant' => 60.00],
                ['id' => $items['ITM-020'] ?? null, 'pond' => 3.50, 'cant' => 95.00],
                ['id' => $items['ITM-021'] ?? null, 'pond' => 1.50, 'cant' => 18.00],
                ['id' => $items['ITM-023'] ?? null, 'pond' => 1.00, 'cant' => 12.00],
                ['id' => $items['ITM-030'] ?? null, 'pond' => 2.50, 'cant' => 60.00],
                ['id' => $items['ITM-031'] ?? null, 'pond' => 2.00, 'cant' => 65.00],
                ['id' => $items['ITM-040'] ?? null, 'pond' => 3.00, 'cant' => 185.00],
                ['id' => $items['ITM-042'] ?? null, 'pond' => 2.00, 'cant' => 185.00],
                ['id' => $items['ITM-043'] ?? null, 'pond' => 1.00, 'cant' => 65.00],
                ['id' => $items['ITM-050'] ?? null, 'pond' => 1.50, 'cant' => 65.00],
                ['id' => $items['ITM-051'] ?? null, 'pond' => 2.50, 'cant' => 55.00],
                ['id' => $items['ITM-052'] ?? null, 'pond' => 1.00, 'cant' => 20.00],
                ['id' => $items['ITM-060'] ?? null, 'pond' => 2.00, 'cant' => 185.00],
                ['id' => $items['ITM-070'] ?? null, 'pond' => 2.00, 'cant' => 5.00],
                ['id' => $items['ITM-071'] ?? null, 'pond' => 2.00, 'cant' => 5.00],
                ['id' => $items['ITM-072'] ?? null, 'pond' => 2.00, 'cant' => 1.00],
                ['id' => $items['ITM-073'] ?? null, 'pond' => 1.50, 'cant' => 1.00],
                ['id' => $items['ITM-074'] ?? null, 'pond' => 1.50, 'cant' => 1.00],
                ['id' => $items['ITM-080'] ?? null, 'pond' => 2.00, 'cant' => 10.00],
                ['id' => $items['ITM-081'] ?? null, 'pond' => 1.50, 'cant' => 7.00],
                ['id' => $items['ITM-082'] ?? null, 'pond' => 2.00, 'cant' => 1.00],
                ['id' => $items['ITM-090'] ?? null, 'pond' => 2.50, 'cant' => 5.00],
                ['id' => $items['ITM-091'] ?? null, 'pond' => 2.50, 'cant' => 4.00],
                ['id' => $items['ITM-100'] ?? null, 'pond' => 1.00, 'cant' => 1.00],
                ['id' => $items['ITM-101'] ?? null, 'pond' => 2.00, 'cant' => 1.00],
            ], fn($i) => ($i['id'] ?? null) !== null)
        );
    }

    private function crearCasaPrivada(array $items): void
    {
        $this->crearPlantilla(
            'Casa Privada Estándar — 100 m²',
            'casa_privada',
            null,
            'Plantilla genérica para vivienda unifamiliar privada ~100 m². Incluye todos los ambientes, acabados de calidad media-alta.',
            array_filter([
                ['id' => $items['ITM-001'] ?? null, 'pond' => 1.00, 'cant' => 100.00],
                ['id' => $items['ITM-002'] ?? null, 'pond' => 1.50, 'cant' => 35.00],
                ['id' => $items['ITM-004'] ?? null, 'pond' => 3.00, 'cant' => 18.00],
                ['id' => $items['ITM-005'] ?? null, 'pond' => 1.50, 'cant' => 6.00],
                ['id' => $items['ITM-010'] ?? null, 'pond' => 4.00, 'cant' => 52.00],
                ['id' => $items['ITM-011'] ?? null, 'pond' => 2.00, 'cant' => 12.00],
                ['id' => $items['ITM-012'] ?? null, 'pond' => 3.00, 'cant' => 35.00],
                ['id' => $items['ITM-013'] ?? null, 'pond' => 4.00, 'cant' => 85.00],
                ['id' => $items['ITM-020'] ?? null, 'pond' => 3.50, 'cant' => 130.00],
                ['id' => $items['ITM-023'] ?? null, 'pond' => 1.00, 'cant' => 16.00],
                ['id' => $items['ITM-030'] ?? null, 'pond' => 3.00, 'cant' => 80.00],
                ['id' => $items['ITM-031'] ?? null, 'pond' => 2.00, 'cant' => 85.00],
                ['id' => $items['ITM-032'] ?? null, 'pond' => 1.00, 'cant' => 15.00],
                ['id' => $items['ITM-040'] ?? null, 'pond' => 2.50, 'cant' => 250.00],
                ['id' => $items['ITM-041'] ?? null, 'pond' => 1.50, 'cant' => 80.00],
                ['id' => $items['ITM-042'] ?? null, 'pond' => 2.00, 'cant' => 250.00],
                ['id' => $items['ITM-043'] ?? null, 'pond' => 1.50, 'cant' => 85.00],
                ['id' => $items['ITM-050'] ?? null, 'pond' => 1.50, 'cant' => 88.00],
                ['id' => $items['ITM-051'] ?? null, 'pond' => 2.00, 'cant' => 75.00],
                ['id' => $items['ITM-053'] ?? null, 'pond' => 1.50, 'cant' => 18.00],
                ['id' => $items['ITM-052'] ?? null, 'pond' => 1.00, 'cant' => 22.00],
                ['id' => $items['ITM-060'] ?? null, 'pond' => 2.00, 'cant' => 250.00],
                ['id' => $items['ITM-061'] ?? null, 'pond' => 1.50, 'cant' => 80.00],
                ['id' => $items['ITM-070'] ?? null, 'pond' => 2.00, 'cant' => 8.00],
                ['id' => $items['ITM-071'] ?? null, 'pond' => 2.00, 'cant' => 8.00],
                ['id' => $items['ITM-072'] ?? null, 'pond' => 2.00, 'cant' => 2.00],
                ['id' => $items['ITM-073'] ?? null, 'pond' => 1.50, 'cant' => 2.00],
                ['id' => $items['ITM-074'] ?? null, 'pond' => 1.50, 'cant' => 1.00],
                ['id' => $items['ITM-080'] ?? null, 'pond' => 2.00, 'cant' => 14.00],
                ['id' => $items['ITM-081'] ?? null, 'pond' => 1.50, 'cant' => 10.00],
                ['id' => $items['ITM-082'] ?? null, 'pond' => 2.00, 'cant' => 1.00],
                ['id' => $items['ITM-090'] ?? null, 'pond' => 2.50, 'cant' => 6.00],
                ['id' => $items['ITM-092'] ?? null, 'pond' => 1.50, 'cant' => 1.00],
                ['id' => $items['ITM-091'] ?? null, 'pond' => 2.00, 'cant' => 5.00],
                ['id' => $items['ITM-100'] ?? null, 'pond' => 1.00, 'cant' => 1.00],
                ['id' => $items['ITM-101'] ?? null, 'pond' => 2.00, 'cant' => 1.00],
            ], fn($i) => ($i['id'] ?? null) !== null)
        );
    }

    private function crearEdificio(array $items): void
    {
        $this->crearPlantilla(
            'Edificio Multifamiliar — Plantilla Base (por piso)',
            'edificio',
            null,
            'Items típicos por nivel/piso en edificio multifamiliar. Multiplicar por cantidad de pisos para el presupuesto global.',
            array_filter([
                ['id' => $items['ITM-010'] ?? null, 'pond' => 5.00, 'cant' => 60.00],
                ['id' => $items['ITM-011'] ?? null, 'pond' => 4.00, 'cant' => 20.00],
                ['id' => $items['ITM-012'] ?? null, 'pond' => 5.00, 'cant' => 45.00],
                ['id' => $items['ITM-014'] ?? null, 'pond' => 6.00, 'cant' => 200.00],
                ['id' => $items['ITM-020'] ?? null, 'pond' => 5.00, 'cant' => 180.00],
                ['id' => $items['ITM-022'] ?? null, 'pond' => 3.00, 'cant' => 60.00],
                ['id' => $items['ITM-040'] ?? null, 'pond' => 4.00, 'cant' => 350.00],
                ['id' => $items['ITM-042'] ?? null, 'pond' => 3.00, 'cant' => 350.00],
                ['id' => $items['ITM-050'] ?? null, 'pond' => 3.00, 'cant' => 160.00],
                ['id' => $items['ITM-051'] ?? null, 'pond' => 3.00, 'cant' => 140.00],
                ['id' => $items['ITM-053'] ?? null, 'pond' => 2.00, 'cant' => 40.00],
                ['id' => $items['ITM-060'] ?? null, 'pond' => 3.00, 'cant' => 350.00],
                ['id' => $items['ITM-070'] ?? null, 'pond' => 3.00, 'cant' => 12.00],
                ['id' => $items['ITM-071'] ?? null, 'pond' => 3.00, 'cant' => 12.00],
                ['id' => $items['ITM-072'] ?? null, 'pond' => 3.00, 'cant' => 4.00],
                ['id' => $items['ITM-073'] ?? null, 'pond' => 2.00, 'cant' => 4.00],
                ['id' => $items['ITM-080'] ?? null, 'pond' => 3.00, 'cant' => 20.00],
                ['id' => $items['ITM-081'] ?? null, 'pond' => 3.00, 'cant' => 16.00],
                ['id' => $items['ITM-082'] ?? null, 'pond' => 3.00, 'cant' => 2.00],
                ['id' => $items['ITM-090'] ?? null, 'pond' => 4.00, 'cant' => 10.00],
                ['id' => $items['ITM-091'] ?? null, 'pond' => 3.00, 'cant' => 8.00],
                ['id' => $items['ITM-101'] ?? null, 'pond' => 5.00, 'cant' => 1.00],
            ], fn($i) => ($i['id'] ?? null) !== null)
        );
    }

    private function crearRemodelacion(array $items): void
    {
        $this->crearPlantilla(
            'Remodelación Estándar',
            'remodelacion',
            null,
            'Items típicos para remodelación de vivienda existente. Sin estructura nueva. Enfocado en acabados, instalaciones y carpintería.',
            array_filter([
                ['id' => $items['ITM-001'] ?? null, 'pond' => 2.00, 'cant' => 60.00],
                ['id' => $items['ITM-022'] ?? null, 'pond' => 5.00, 'cant' => 30.00],
                ['id' => $items['ITM-023'] ?? null, 'pond' => 3.00, 'cant' => 8.00],
                ['id' => $items['ITM-040'] ?? null, 'pond' => 6.00, 'cant' => 120.00],
                ['id' => $items['ITM-042'] ?? null, 'pond' => 5.00, 'cant' => 120.00],
                ['id' => $items['ITM-043'] ?? null, 'pond' => 4.00, 'cant' => 50.00],
                ['id' => $items['ITM-050'] ?? null, 'pond' => 4.00, 'cant' => 45.00],
                ['id' => $items['ITM-051'] ?? null, 'pond' => 6.00, 'cant' => 40.00],
                ['id' => $items['ITM-053'] ?? null, 'pond' => 4.00, 'cant' => 15.00],
                ['id' => $items['ITM-052'] ?? null, 'pond' => 3.00, 'cant' => 18.00],
                ['id' => $items['ITM-060'] ?? null, 'pond' => 6.00, 'cant' => 120.00],
                ['id' => $items['ITM-061'] ?? null, 'pond' => 4.00, 'cant' => 50.00],
                ['id' => $items['ITM-062'] ?? null, 'pond' => 2.00, 'cant' => 20.00],
                ['id' => $items['ITM-070'] ?? null, 'pond' => 4.00, 'cant' => 5.00],
                ['id' => $items['ITM-071'] ?? null, 'pond' => 4.00, 'cant' => 5.00],
                ['id' => $items['ITM-072'] ?? null, 'pond' => 3.00, 'cant' => 1.00],
                ['id' => $items['ITM-073'] ?? null, 'pond' => 3.00, 'cant' => 1.00],
                ['id' => $items['ITM-080'] ?? null, 'pond' => 4.00, 'cant' => 8.00],
                ['id' => $items['ITM-081'] ?? null, 'pond' => 4.00, 'cant' => 6.00],
                ['id' => $items['ITM-090'] ?? null, 'pond' => 8.00, 'cant' => 5.00],
                ['id' => $items['ITM-091'] ?? null, 'pond' => 6.00, 'cant' => 4.00],
                ['id' => $items['ITM-101'] ?? null, 'pond' => 4.00, 'cant' => 1.00],
                ['id' => $items['ITM-100'] ?? null, 'pond' => 2.00, 'cant' => 1.00],
            ], fn($i) => ($i['id'] ?? null) !== null)
        );
    }
}
