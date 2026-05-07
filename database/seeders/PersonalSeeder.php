<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class PersonalSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_ES');
        $usuarios = DB::table('usuarios')->get();
        $roles = DB::table('roles')->pluck('nombre', 'id');
        
        $bancos = ['Banco Nacional de Bolivia', 'Banco Mercantil Santa Cruz', 'Banco Unión', 'Banco BISA'];
        
        $personalRecords = [];
        $contadorEmp = 1;

        // Crear personal para los usuarios existentes
        foreach ($usuarios as $user) {
            $rolNombre = $roles[$user->rol_id];
            
            // Determinar tipo, salario, y otros campos basados en el rol
            $tipo = 'administrativo';
            $salario = 5000;
            if ($rolNombre == 'gerente') {
                $tipo = 'gerente';
                $salario = 12000;
            } elseif ($rolNombre == 'encargado_finanzas') {
                $tipo = 'encargado_finanzas';
                $salario = 8000;
            } elseif ($rolNombre == 'administrador_proyecto') {
                $tipo = 'administrativo';
                $salario = 9000;
            } elseif ($rolNombre == 'tecnico_campo') {
                $tipo = 'tecnico';
                $salario = 6000;
            } elseif ($rolNombre == 'encargado_almacen') {
                $tipo = 'encargado_almacen';
                $salario = 5000;
            } elseif ($rolNombre == 'trabajadora_social') {
                $tipo = 'trabajadora_social';
                $salario = 5500;
            }

            $personalRecords[] = [
                'usuario_id' => $user->id,
                'codigo_empleado' => 'EMP' . str_pad($contadorEmp++, 3, '0', STR_PAD_LEFT),
                'nombre' => $user->nombre,
                'apellido_paterno' => $user->apellido_paterno,
                'apellido_materno' => $user->apellido_materno,
                'ci' => $user->ci,
                'telefono' => $user->telefono,
                'direccion' => $user->direccion,
                'fecha_nacimiento' => $user->fecha_nacimiento,
                'tipo' => $tipo,
                'fecha_contratacion' => $faker->dateTimeBetween('2020-01-01', '2025-01-01')->format('Y-m-d'),
                'tipo_contrato' => 'indefinido',
                'salario_base' => $salario,
                'frecuencia_pago' => 'mensual',
                'banco' => $faker->randomElement($bancos),
                'numero_cuenta' => $faker->randomNumber(8, true),
                'tipo_cuenta' => 'ahorro',
                'estado_laboral' => 'activo',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Agregar los 2 obreros sin cuenta de usuario
        $obreros = [
            [
                'nombre' => 'José Antonio',
                'apellido_paterno' => 'Mamani',
                'apellido_materno' => 'Ticona',
                'ci' => '3216548',
            ],
            [
                'nombre' => 'Franz Eduardo',
                'apellido_paterno' => 'Condori',
                'apellido_materno' => 'Mamani',
                'ci' => '7894561',
            ]
        ];

        foreach ($obreros as $obrero) {
            $personalRecords[] = [
                'usuario_id' => null,
                'codigo_empleado' => 'EMP' . str_pad($contadorEmp++, 3, '0', STR_PAD_LEFT),
                'nombre' => $obrero['nombre'],
                'apellido_paterno' => $obrero['apellido_paterno'],
                'apellido_materno' => $obrero['apellido_materno'],
                'ci' => $obrero['ci'],
                'telefono' => '7' . $faker->randomNumber(7, true),
                'direccion' => 'El Alto, ' . $faker->streetName,
                'fecha_nacimiento' => $faker->dateTimeBetween('-45 years', '-20 years')->format('Y-m-d'),
                'tipo' => 'obrero',
                'fecha_contratacion' => $faker->dateTimeBetween('2023-01-01', '2025-01-01')->format('Y-m-d'),
                'tipo_contrato' => 'obra',
                'salario_base' => 3500,
                'frecuencia_pago' => 'quincenal',
                'banco' => $faker->randomElement($bancos),
                'numero_cuenta' => $faker->randomNumber(8, true),
                'tipo_cuenta' => 'ahorro',
                'estado_laboral' => 'activo',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::table('personal')->insert($personalRecords);
    }
}
