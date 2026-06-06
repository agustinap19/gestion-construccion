<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class DetallePlanillaSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_ES');
        $planillas = DB::table('planillas_pago')->get();
        $personal = DB::table('personal')->where('estado_laboral', 'activo')->get();

        foreach ($planillas as $planilla) {
            $montoTotalPlanilla = 0;
            $detalles = [];

            foreach ($personal as $emp) {
                $diasTrabajados = $faker->randomFloat(2, 12, 15);
                
                // Cálculo aproximado: salario_base es mensual, dividimos entre 30 para salario diario
                $salarioDiario = $emp->salario_base / 30;
                $montoBruto = $salarioDiario * $diasTrabajados;

                $bonos = 0;
                if (rand(0, 10) > 7) {
                    $bonos = $faker->randomFloat(2, 100, 500); // Bonos ocasionales
                }

                $descuentos = 0;
                // Descuento AFP aprox 12.71%
                $descuentos = $montoBruto * 0.1271;
                
                if (rand(0, 10) > 8) {
                    $descuentos += $faker->randomFloat(2, 50, 200); // Otros descuentos
                }

                $montoNeto = $montoBruto + $bonos - $descuentos;
                $montoTotalPlanilla += $montoNeto;

                $detalles[] = [
                    'planilla_id' => $planilla->id,
                    'personal_id' => $emp->id,
                    'dias_trabajados' => $diasTrabajados,
                    'horas_extras' => 0,
                    'bonos' => $bonos,
                    'descuentos' => $descuentos,
                    'monto_bruto' => $montoBruto,
                    'monto_neto' => $montoNeto,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            DB::table('detalles_planilla')->insert($detalles);

            // Actualizar el monto total de la planilla
            DB::table('planillas_pago')
                ->where('id', $planilla->id)
                ->update(['monto_total' => $montoTotalPlanilla]);
        }
    }
}
