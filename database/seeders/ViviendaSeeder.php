<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vivienda;
use App\Models\Proyecto;
use App\Models\Beneficiario;
use App\Models\TipoVivienda;

class ViviendaSeeder extends Seeder
{
    public function run(): void
    {
        $proyecto = Proyecto::where('codigo', 'PRJ-2026-0001')->first();
        if (!$proyecto) return;

        $tipoVivienda = TipoVivienda::first();
        $beneficiarios = Beneficiario::where('proyecto_id', $proyecto->id)->get();

        $estados = ['planificada', 'cimentacion', 'obra_gruesa', 'acabados', 'obra_fina', 'entregada', 'planificada', 'cimentacion'];
        $avances = [0, 15, 40, 65, 80, 100, 0, 15];

        for ($i = 1; $i <= 8; $i++) {
            $idx = $i - 1;
            $beneficiario = $beneficiarios->get($idx);

            Vivienda::firstOrCreate(
                ['proyecto_id' => $proyecto->id, 'codigo' => "VIV-PRJ-2026-0001-" . str_pad($i, 3, '0', STR_PAD_LEFT)],
                [
                    'proyecto_id'                => $proyecto->id,
                    'tipo_vivienda_id'           => $tipoVivienda?->id,
                    'beneficiario_id'            => $beneficiario?->id,
                    'codigo'                     => "VIV-PRJ-2026-0001-" . str_pad($i, 3, '0', STR_PAD_LEFT),
                    'estado'                     => $estados[$idx],
                    'porcentaje_avance'          => $avances[$idx],
                    'latitud'                    => -16.540123 + ($i * 0.001),
                    'longitud'                   => -68.182456 + ($i * 0.001),
                    'tiene_observaciones_activas' => false,
                    'usuario_creador_id'         => 1,
                ]
            );
        }
    }
}
