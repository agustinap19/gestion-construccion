<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PlanillaPagoSeeder extends Seeder
{
    public function run(): void
    {
        $planillas = [
            [
                'periodo_inicio' => '2026-01-01',
                'periodo_fin' => '2026-01-15',
                'tipo' => 'quincenal',
                'monto_total' => 0, // Se actualizará después
                'estado' => 'pagada',
                'fecha_pago' => '2026-01-16',
                'observaciones' => 'Pago correspondiente a la primera quincena de enero.',
            ],
            [
                'periodo_inicio' => '2026-01-16',
                'periodo_fin' => '2026-01-31',
                'tipo' => 'quincenal',
                'monto_total' => 0,
                'estado' => 'pagada',
                'fecha_pago' => '2026-02-02',
                'observaciones' => 'Pago correspondiente a la segunda quincena de enero.',
            ],
            [
                'periodo_inicio' => '2026-02-01',
                'periodo_fin' => '2026-02-15',
                'tipo' => 'quincenal',
                'monto_total' => 0,
                'estado' => 'aprobada',
                'fecha_pago' => null,
                'observaciones' => 'Pago correspondiente a la primera quincena de febrero. Pendiente de pago.',
            ]
        ];

        foreach ($planillas as $planilla) {
            DB::table('planillas_pago')->insert(array_merge($planilla, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
