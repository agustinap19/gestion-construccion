<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Beneficiario;
use App\Models\Proyecto;
use App\Models\TipoVivienda;
use App\Models\User;

class BeneficiarioSeeder extends Seeder
{
    public function run(): void
    {
        $proyecto1 = Proyecto::where('codigo', 'PRJ-2026-0001')->first();
        $proyecto2 = Proyecto::where('codigo', 'PRJ-2026-0002')->first();
        $tipoA = TipoVivienda::where('nombre', 'LIKE', '%TIPO 1%')->first();
        $tipoB = TipoVivienda::where('nombre', 'LIKE', '%TIPO 2%')->first();
        
        $gerente = User::whereHas('rol', fn($q) => $q->where('nombre', 'gerente'))->first();
        $userId = $gerente ? $gerente->id : 1;

        if (!$proyecto1 || !$proyecto2) return;

        $beneficiariosP1 = [
            ['nombre' => 'María', 'apellido_paterno' => 'Choque', 'apellido_materno' => 'Quispe', 'ci' => '6892341', 'estado' => 'vivienda_entregada', 'tipo' => $tipoA?->id],
            ['nombre' => 'Pedro', 'apellido_paterno' => 'Mamani', 'apellido_materno' => 'Condori', 'ci' => '4532189', 'estado' => 'en_construccion', 'tipo' => $tipoB?->id],
            ['nombre' => 'Juana', 'apellido_paterno' => 'Apaza', 'apellido_materno' => 'Flores', 'ci' => '7812345', 'estado' => 'en_construccion', 'tipo' => $tipoA?->id],
            ['nombre' => 'Roberto', 'apellido_paterno' => 'Ticona', 'apellido_materno' => '', 'ci' => '3421890', 'estado' => 'aceptado', 'tipo' => $tipoA?->id],
            ['nombre' => 'Sonia', 'apellido_paterno' => 'Huanca', 'apellido_materno' => 'Perez', 'ci' => '5612347', 'estado' => 'aceptado', 'tipo' => $tipoA?->id],
            ['nombre' => 'Luis', 'apellido_paterno' => 'Fernandez', 'apellido_materno' => 'Gomez', 'ci' => '8923416', 'estado' => 'aceptado', 'tipo' => $tipoB?->id],
            ['nombre' => 'Carmen', 'apellido_paterno' => 'Vargas', 'apellido_materno' => 'Rios', 'ci' => '2345678', 'estado' => 'aceptado', 'tipo' => $tipoB?->id],
            ['nombre' => 'Julio', 'apellido_paterno' => 'Mendoza', 'apellido_materno' => 'Aliaga', 'ci' => '6789012', 'estado' => 'aceptado', 'tipo' => null],
        ];

        $latBase1 = -16.540000;
        $lngBase1 = -68.180000;

        foreach ($beneficiariosP1 as $i => $b) {
            $seq = str_pad($i + 1, 3, '0', STR_PAD_LEFT);
            Beneficiario::firstOrCreate(
                ['ci' => $b['ci']],
                [
                    'codigo_beneficiario' => "BNF-2026-0001-{$seq}",
                    'proyecto_id' => $proyecto1->id,
                    'usuario_registrador_id' => $userId,
                    'nombre' => $b['nombre'],
                    'apellido_paterno' => $b['apellido_paterno'],
                    'apellido_materno' => $b['apellido_materno'],
                    'estado_civil' => 'casado',
                    'genero' => in_array($b['nombre'], ['María', 'Juana', 'Sonia', 'Carmen']) ? 'femenino' : 'masculino',
                    'telefono_principal' => '7' . rand(1000000, 9999999),
                    'cantidad_familiares' => rand(3, 7),
                    'personas_dependientes' => rand(1, 4),
                    'ingreso_mensual_familiar' => rand(2500, 4500),
                    'latitud_terreno' => $latBase1 - (0.001 * $i),
                    'longitud_terreno' => $lngBase1 - (0.001 * $i),
                    'estado_seleccion' => $b['estado'],
                    'fecha_aceptacion' => '2026-01-15',
                    'fecha_entrega_vivienda' => $b['estado'] === 'vivienda_entregada' ? '2026-05-01' : null,
                    'tipo_vivienda_id' => $b['tipo'],
                    'documento_propiedad_terreno_url' => 'https://example.com/doc.pdf',
                    'fecha_nacimiento' => '19' . rand(70, 95) . '-05-10'
                ]
            );
        }

        $beneficiariosP2 = [
            ['nombre' => 'Ana', 'apellido_paterno' => 'Rojas', 'ci' => '9876543', 'estado' => 'candidato'],
            ['nombre' => 'Carlos', 'apellido_paterno' => 'Gutierrez', 'ci' => '8765432', 'estado' => 'candidato'],
            ['nombre' => 'Elena', 'apellido_paterno' => 'Suarez', 'ci' => '7654321', 'estado' => 'aceptado'],
            ['nombre' => 'Mario', 'apellido_paterno' => 'Paz', 'ci' => '6543210', 'estado' => 'aceptado'],
        ];

        $latBase2 = -17.821000;
        $lngBase2 = -63.142000;

        foreach ($beneficiariosP2 as $i => $b) {
            $seq = str_pad($i + 1, 3, '0', STR_PAD_LEFT);
            Beneficiario::firstOrCreate(
                ['ci' => $b['ci']],
                [
                    'codigo_beneficiario' => "BNF-2026-0002-{$seq}",
                    'proyecto_id' => $proyecto2->id,
                    'usuario_registrador_id' => $userId,
                    'nombre' => $b['nombre'],
                    'apellido_paterno' => $b['apellido_paterno'],
                    'estado_civil' => 'soltero',
                    'genero' => in_array($b['nombre'], ['Ana', 'Elena']) ? 'femenino' : 'masculino',
                    'telefono_principal' => '6' . rand(1000000, 9999999),
                    'cantidad_familiares' => rand(2, 5),
                    'personas_dependientes' => rand(0, 3),
                    'ingreso_mensual_familiar' => rand(2000, 3500),
                    'latitud_terreno' => $latBase2 - (0.001 * $i),
                    'longitud_terreno' => $lngBase2 - (0.001 * $i),
                    'estado_seleccion' => $b['estado'],
                    'fecha_aceptacion' => $b['estado'] === 'aceptado' ? '2026-05-02' : null,
                    'documento_propiedad_terreno_url' => 'https://example.com/doc.pdf',
                    'fecha_nacimiento' => '19' . rand(70, 95) . '-08-20'
                ]
            );
        }
    }
}
