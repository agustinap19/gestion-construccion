<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class PersonalCompetenciaSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_ES');
        $personal = DB::table('personal')->get();
        $competencias = DB::table('competencias')->get()->keyBy('nombre');

        $registros = [];

        foreach ($personal as $emp) {
            if ($emp->tipo == 'obrero') {
                // Obreros tienen Maestro albañil (o a veces nada)
                if (rand(0, 1)) {
                    $registros[] = [
                        'personal_id' => $emp->id,
                        'competencia_id' => $competencias['Maestro albañil']->id,
                        'fecha_emision' => $faker->dateTimeBetween('-5 years', '-1 year')->format('Y-m-d'),
                        'fecha_vencimiento' => null,
                        'entidad_emisora' => 'Escuela de Constructores',
                        'estado' => 'vigente',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            } elseif (in_array($emp->tipo, ['tecnico', 'gerente', 'administrador_proyecto'])) {
                // Técnicos y gerentes tienen entre 2 y 4 competencias
                $numComps = rand(2, 4);
                $compsDisponibles = $competencias->random($numComps);

                foreach ($compsDisponibles as $comp) {
                    $isVencida = rand(0, 3) == 0; // 25% prob de estar vencida
                    $fechaEmision = $faker->dateTimeBetween('-4 years', '-1 year')->format('Y-m-d');
                    
                    $fechaVenc = null;
                    $estado = 'vigente';

                    if ($comp->requiere_renovacion) {
                        $meses = $comp->duracion_validez_meses;
                        $fechaVencObj = (new \DateTime($fechaEmision))->modify("+$meses months");
                        $fechaVenc = $fechaVencObj->format('Y-m-d');
                        
                        if ($fechaVencObj < new \DateTime()) {
                            $estado = 'vencida';
                        }
                        
                        // Forzar estado vencida si se eligió aleatoriamente
                        if ($isVencida) {
                            $estado = 'vencida';
                            $fechaVenc = $faker->dateTimeBetween('-6 months', '-1 day')->format('Y-m-d');
                        }
                    }

                    $registros[] = [
                        'personal_id' => $emp->id,
                        'competencia_id' => $comp->id,
                        'fecha_emision' => $fechaEmision,
                        'fecha_vencimiento' => $fechaVenc,
                        'entidad_emisora' => 'Instituto Técnico',
                        'estado' => $estado,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }
        }

        DB::table('personal_competencia')->insert($registros);
    }
}
