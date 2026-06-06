<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\VisitaDomiciliaria;
use App\Models\Beneficiario;
use App\Models\Personal;
use Carbon\Carbon;

class VisitaDomiciliariaSeeder extends Seeder
{
    public function run(): void
    {
        // Encontrar trabajadora social o un personal por defecto
        $personal = Personal::first();
        if (!$personal) return;

        $beneficiarios = Beneficiario::whereNotNull('proyecto_id')->take(6)->get();

        foreach ($beneficiarios as $b) {
            // Visita inicial
            VisitaDomiciliaria::create([
                'proyecto_id' => $b->proyecto_id,
                'beneficiario_id' => $b->id,
                'personal_id' => $personal->id,
                'fecha_visita' => Carbon::now()->subDays(rand(30, 90)),
                'hora_visita' => '09:30',
                'latitud_visita' => $b->latitud_terreno,
                'longitud_visita' => $b->longitud_terreno,
                'tipo_visita' => 'inicial',
                'resultado' => 'exitosa',
                'observaciones' => 'Se verificó la situación económica de la familia y el terreno.',
                'gasto_transporte' => rand(15, 30),
            ]);

            // Visita de seguimiento (algunas)
            if (rand(0, 1)) {
                VisitaDomiciliaria::create([
                    'proyecto_id' => $b->proyecto_id,
                    'beneficiario_id' => $b->id,
                    'personal_id' => $personal->id,
                    'fecha_visita' => Carbon::now()->subDays(rand(5, 20)),
                    'hora_visita' => '14:00',
                    'tipo_visita' => 'seguimiento',
                    'resultado' => 'exitosa',
                    'observaciones' => 'Se hizo seguimiento a la construcción de la vivienda.',
                    'gasto_transporte' => rand(15, 40),
                ]);
            }
        }
        
        // Visita no encontrada
        if ($beneficiarios->first()) {
            VisitaDomiciliaria::create([
                'proyecto_id' => $beneficiarios->first()->proyecto_id,
                'beneficiario_id' => $beneficiarios->first()->id,
                'personal_id' => $personal->id,
                'fecha_visita' => Carbon::now()->subDays(2),
                'hora_visita' => '10:15',
                'tipo_visita' => 'verificacion',
                'resultado' => 'no_encontrado',
                'observaciones' => 'No había nadie en el domicilio al momento de la visita.',
                'gasto_transporte' => 20,
            ]);
        }
    }
}
