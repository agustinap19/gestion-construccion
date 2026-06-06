<?php

namespace Database\Seeders;

use App\Models\ConfiguracionPorcentajesPresupuesto;
use Illuminate\Database\Seeder;

class ConfiguracionPorcentajesPresupuestoSeeder extends Seeder
{
    public function run(): void
    {
        ConfiguracionPorcentajesPresupuesto::updateOrCreate(
            ['tipo_proyecto' => 'social'],
            [
                'porcentaje_mano_obra'         => 30.00,
                'porcentaje_gastos_generales'  => 12.00,
                'porcentaje_utilidad_esperada' => 15.00,
                'umbral_rentabilidad_minima'   => 5.00,
                'notas'                        => 'Set estándar SICOOES para proyectos sociales en Bolivia',
            ]
        );

        ConfiguracionPorcentajesPresupuesto::updateOrCreate(
            ['tipo_proyecto' => 'privado'],
            [
                'porcentaje_mano_obra'         => 28.00,
                'porcentaje_gastos_generales'  => 10.00,
                'porcentaje_utilidad_esperada' => 18.00,
                'umbral_rentabilidad_minima'   => 5.00,
                'notas'                        => 'Set estándar para proyectos privados en Bolivia',
            ]
        );
    }
}
