<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Faker\Factory as Faker;

class UsuarioSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_ES');
        $password = Hash::make('password123');

        $roles = DB::table('roles')->pluck('id', 'nombre');

        $direcciones = [
            'Av. 16 de Julio, La Paz',
            'Calle Sagárnaga, La Paz',
            'Av. 6 de Marzo, El Alto',
            'Zona Sur, Obrajes, La Paz',
            'Ciudad Satélite, El Alto',
            'Sopocachi, La Paz',
            'Villa Fátima, La Paz',
            'Ceja, El Alto'
        ];

        $usuarios = [
            [
                'nombre' => 'Juan Carlos',
                'apellido_paterno' => 'Mamani',
                'apellido_materno' => 'Quispe',
                'ci' => '4587963',
                'email' => 'gerente@cakanagf.com',
                'rol_id' => $roles['gerente'],
            ],
            [
                'nombre' => 'María Elena',
                'apellido_paterno' => 'Choque',
                'apellido_materno' => 'Ticona',
                'ci' => '6543210',
                'email' => 'mchoque@cakanagf.com',
                'rol_id' => $roles['encargado_finanzas'],
            ],
            [
                'nombre' => 'Carlos Alberto',
                'apellido_paterno' => 'Condori',
                'apellido_materno' => 'Flores',
                'ci' => '8765432',
                'email' => 'ccondori@cakanagf.com',
                'rol_id' => $roles['administrador_proyecto'],
            ],
            [
                'nombre' => 'Ana Beatriz',
                'apellido_paterno' => 'Rojas',
                'apellido_materno' => 'Mendoza',
                'ci' => '9876543',
                'email' => 'arojas@cakanagf.com',
                'rol_id' => $roles['administrador_proyecto'],
            ],
            [
                'nombre' => 'Roberto',
                'apellido_paterno' => 'Fernández',
                'apellido_materno' => 'Chura',
                'ci' => '5432167',
                'email' => 'rfernandez@cakanagf.com',
                'rol_id' => $roles['tecnico_campo'],
            ],
            [
                'nombre' => 'Luis Alberto',
                'apellido_paterno' => 'Colque',
                'apellido_materno' => 'Limachi',
                'ci' => '7654321',
                'email' => 'lcolque@cakanagf.com',
                'rol_id' => $roles['tecnico_campo'],
            ],
            [
                'nombre' => 'Pedro Ramiro',
                'apellido_paterno' => 'Huanca',
                'apellido_materno' => 'Apaza',
                'ci' => '6547890',
                'email' => 'phuanca@cakanagf.com',
                'rol_id' => $roles['encargado_almacen'],
            ],
            [
                'nombre' => 'Carmen Rosa',
                'apellido_paterno' => 'Gutiérrez',
                'apellido_materno' => 'Vargas',
                'ci' => '4321987',
                'email' => 'cgutierrez@cakanagf.com',
                'rol_id' => $roles['trabajadora_social'],
            ]
        ];

        foreach ($usuarios as $userData) {
            DB::table('usuarios')->insert([
                'nombre' => $userData['nombre'],
                'apellido_paterno' => $userData['apellido_paterno'],
                'apellido_materno' => $userData['apellido_materno'],
                'ci' => $userData['ci'],
                'ci_complemento' => null,
                'email' => $userData['email'],
                'password' => $password,
                'telefono' => '7' . $faker->randomNumber(7, true),
                'fecha_nacimiento' => $faker->dateTimeBetween('-50 years', '-25 years')->format('Y-m-d'),
                'direccion' => $faker->randomElement($direcciones),
                'rol_id' => $userData['rol_id'],
                'estado' => 'activo',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
