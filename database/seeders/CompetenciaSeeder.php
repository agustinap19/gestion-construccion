<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CompetenciaSeeder extends Seeder
{
    public function run(): void
    {
        $competencias = [
            ['nombre' => 'Operador de mezcladora', 'tipo' => 'habilidad_tecnica', 'requiere_renovacion' => false, 'duracion_validez_meses' => null],
            ['nombre' => 'Trabajo en altura', 'tipo' => 'certificacion_oficial', 'requiere_renovacion' => true, 'duracion_validez_meses' => 24],
            ['nombre' => 'Maestro albañil', 'tipo' => 'habilidad_tecnica', 'requiere_renovacion' => false, 'duracion_validez_meses' => null],
            ['nombre' => 'Soldador certificado', 'tipo' => 'certificacion_oficial', 'requiere_renovacion' => true, 'duracion_validez_meses' => 36],
            ['nombre' => 'Operador de volqueta', 'tipo' => 'certificacion_oficial', 'requiere_renovacion' => true, 'duracion_validez_meses' => 24],
            ['nombre' => 'Electricista domiciliario', 'tipo' => 'capacitacion_interna', 'requiere_renovacion' => false, 'duracion_validez_meses' => null],
            ['nombre' => 'Plomero e instalaciones sanitarias', 'tipo' => 'capacitacion_interna', 'requiere_renovacion' => false, 'duracion_validez_meses' => null],
            ['nombre' => 'Primeros auxilios en obra', 'tipo' => 'certificacion_oficial', 'requiere_renovacion' => true, 'duracion_validez_meses' => 12],
            ['nombre' => 'Manejo seguro de químicos', 'tipo' => 'certificacion_oficial', 'requiere_renovacion' => true, 'duracion_validez_meses' => 12],
            ['nombre' => 'Topografía básica', 'tipo' => 'habilidad_tecnica', 'requiere_renovacion' => false, 'duracion_validez_meses' => null],
        ];

        foreach ($competencias as $comp) {
            DB::table('competencias')->insert([
                'nombre' => $comp['nombre'],
                'descripcion' => 'Competencia en ' . strtolower($comp['nombre']),
                'tipo' => $comp['tipo'],
                'requiere_renovacion' => $comp['requiere_renovacion'],
                'duracion_validez_meses' => $comp['duracion_validez_meses'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
