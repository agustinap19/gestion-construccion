<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\FaseProyecto;
use App\Models\Proyecto;

class FaseProyectoSeeder extends Seeder
{
    public function run(): void
    {
        $proyecto = Proyecto::where('codigo', 'PRJ-2026-0003')->first();
        if (!$proyecto) return;

        $fases = [
            [
                'nombre' => 'Cimentación y Excavación',
                'descripcion' => 'Preparación del terreno, excavación de zapatas y construcción de cimientos.',
                'peso_porcentual' => 25.00,
                'orden' => 1,
                'estado' => 'completada',
                'porcentaje_avance_interno' => 100,
                'fecha_inicio_planificada' => '2026-04-01',
                'fecha_fin_planificada' => '2026-04-30',
                'fecha_inicio_real' => '2026-04-03',
                'fecha_fin_real' => '2026-04-28',
            ],
            [
                'nombre' => 'Estructura y Obra Gruesa',
                'descripcion' => 'Levantamiento de muros, columnas, vigas y losa.',
                'peso_porcentual' => 30.00,
                'orden' => 2,
                'estado' => 'en_proceso',
                'porcentaje_avance_interno' => 45,
                'fecha_inicio_planificada' => '2026-05-01',
                'fecha_fin_planificada' => '2026-06-15',
                'fecha_inicio_real' => '2026-05-02',
            ],
            [
                'nombre' => 'Albañilería y Revoque',
                'descripcion' => 'Revoque interior y exterior, contrapisos.',
                'peso_porcentual' => 20.00,
                'orden' => 3,
                'estado' => 'pendiente',
                'porcentaje_avance_interno' => 0,
                'fecha_inicio_planificada' => '2026-06-16',
                'fecha_fin_planificada' => '2026-07-31',
            ],
            [
                'nombre' => 'Acabados e Instalaciones',
                'descripcion' => 'Instalaciones eléctricas, sanitarias, pisos, pintura.',
                'peso_porcentual' => 15.00,
                'orden' => 4,
                'estado' => 'pendiente',
                'porcentaje_avance_interno' => 0,
                'fecha_inicio_planificada' => '2026-08-01',
                'fecha_fin_planificada' => '2026-09-15',
            ],
            [
                'nombre' => 'Inspección y Entrega',
                'descripcion' => 'Inspección final, correcciones y entrega al cliente.',
                'peso_porcentual' => 10.00,
                'orden' => 5,
                'estado' => 'pendiente',
                'porcentaje_avance_interno' => 0,
                'fecha_inicio_planificada' => '2026-09-16',
                'fecha_fin_planificada' => '2026-09-30',
            ],
        ];

        $anteriorId = null;
        foreach ($fases as $idx => $faseData) {
            $secuencia = str_pad($idx + 1, 3, '0', STR_PAD_LEFT);
            $codigo = "FAS-PRJ-2026-0003-{$secuencia}";

            $fase = FaseProyecto::firstOrCreate(
                ['codigo' => $codigo],
                array_merge($faseData, [
                    'proyecto_id' => $proyecto->id,
                    'codigo' => $codigo,
                    'fase_prerrequisito_id' => $anteriorId,
                    'usuario_creador_id' => 1,
                ])
            );
            $anteriorId = $fase->id;
        }

        // Recalcular avance: 25*100/100 + 30*45/100 = 25 + 13.5 = 38.5%
        $proyecto->porcentaje_avance = 38.50;
        $proyecto->save();
    }
}
