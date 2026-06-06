<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Faker\Factory as Faker;

class UserSeeder extends Seeder
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
            'Ceja, El Alto',
        ];

        $usuarios = [
            [
                'nombre'                => 'Agustin Alvaro',
                'apellido_paterno'      => 'Cruz',
                'apellido_materno'      => 'Mamani',
                'ci'                    => '9860901',
                'email'                 => 'agustinapaza1817@gmail.com',
                'telefono'              => '74027119',
                'fecha_nacimiento'      => '2005-08-27',
                'direccion'             => 'Ojos del Salado, El Alto',
                'rol_id'                => $roles['super_admin'],
                'es_admin_central'      => true,
                'debe_cambiar_password' => false,
                'totp_secret'           => 'JBSWY3DPEHPK3PXP',
                'totp_activo'           => true,
                'totp_activado_en'      => now(),
            ],
            [
                'nombre'                => 'Eduardo',
                'apellido_paterno'      => 'Kanagf',
                'apellido_materno'      => 'Apaza',
                'ci'                    => '5001234',
                'email'                 => 'gerente@cakanagf.com',
                'telefono'              => '72000001',
                'fecha_nacimiento'      => '1978-03-15',
                'direccion'             => 'Sopocachi, La Paz',
                'rol_id'                => $roles['gerente'],
                'es_admin_central'      => false,
                'debe_cambiar_password' => false,
            ],
            [
                'nombre'                => 'Maria Elena',
                'apellido_paterno'      => 'Choque',
                'apellido_materno'      => 'Ticona',
                'ci'                    => '6543210',
                'email'                 => 'mchoque@cakanagf.com',
                'rol_id'                => $roles['encargado_finanzas'],
                'debe_cambiar_password' => true,
            ],
            [
                'nombre'                => 'Carlos Alberto',
                'apellido_paterno'      => 'Condori',
                'apellido_materno'      => 'Flores',
                'ci'                    => '8765432',
                'email'                 => 'ccondori@cakanagf.com',
                'rol_id'                => $roles['administrador_proyecto'],
                'debe_cambiar_password' => false,
            ],
            [
                'nombre'                => 'Ana Beatriz',
                'apellido_paterno'      => 'Rojas',
                'apellido_materno'      => 'Mendoza',
                'ci'                    => '9876543',
                'email'                 => 'arojas@cakanagf.com',
                'rol_id'                => $roles['administrador_proyecto'],
                'debe_cambiar_password' => true,
            ],
            [
                'nombre'                => 'Roberto',
                'apellido_paterno'      => 'Fernandez',
                'apellido_materno'      => 'Chura',
                'ci'                    => '5432167',
                'email'                 => 'rfernandez@cakanagf.com',
                'rol_id'                => $roles['tecnico_campo'],
                'debe_cambiar_password' => false,
            ],
            [
                'nombre'                => 'Luis Alberto',
                'apellido_paterno'      => 'Colque',
                'apellido_materno'      => 'Limachi',
                'ci'                    => '7654321',
                'email'                 => 'lcolque@cakanagf.com',
                'rol_id'                => $roles['tecnico_campo'],
                'debe_cambiar_password' => true,
            ],
            [
                'nombre'                => 'Pedro Ramiro',
                'apellido_paterno'      => 'Huanca',
                'apellido_materno'      => 'Apaza',
                'ci'                    => '6547890',
                'email'                 => 'phuanca@cakanagf.com',
                'rol_id'                => $roles['encargado_almacen'],
                'debe_cambiar_password' => false,
            ],
            [
                'nombre'                => 'Admin',
                'apellido_paterno'      => 'Prueba',
                'apellido_materno'      => 'CA',
                'ci'                    => '1000001',
                'email'                 => 'admin@prueba.com',
                'password'              => Hash::make('Admin123!'),
                'rol_id'                => $roles['super_admin'],
                'es_admin_central'      => false,
                'debe_cambiar_password' => false,
                'totp_secret'           => 'JBSWY3DPEHPK3PXP',
                'totp_activo'           => true,
                'totp_activado_en'      => now(),
            ],
            [
                'nombre'                => 'User',
                'apellido_paterno'      => 'Prueba',
                'apellido_materno'      => 'CA',
                'ci'                    => '1000002',
                'email'                 => 'user@prueba.com',
                'password'              => Hash::make('User123!'),
                'rol_id'                => $roles['tecnico_campo'],
                'es_admin_central'      => false,
                'debe_cambiar_password' => false,
                'totp_secret'           => 'KNRW24TMMJQXEZLJ',
                'totp_activo'           => true,
                'totp_activado_en'      => now(),
            ],
        ];

        foreach ($usuarios as $userData) {
            $debeCambiar = $userData['debe_cambiar_password'];
            DB::table('users')->updateOrInsert(
                ['email' => $userData['email']],
                [
                    'nombre'                => $userData['nombre'],
                    'apellido_paterno'      => $userData['apellido_paterno'],
                    'apellido_materno'      => $userData['apellido_materno'] ?? null,
                    'ci'                    => $userData['ci'],
                    'ci_complemento'        => null,
                    'email'                 => $userData['email'],
                    'password'              => $userData['password'] ?? $password,
                    'telefono'              => $userData['telefono'] ?? ('7' . $faker->randomNumber(7, true)),
                    'fecha_nacimiento'      => $userData['fecha_nacimiento'] ?? $faker->dateTimeBetween('-50 years', '-25 years')->format('Y-m-d'),
                    'direccion'             => $userData['direccion'] ?? $faker->randomElement($direcciones),
                    'rol_id'                => $userData['rol_id'],
                    'estado'                => 'activo',
                    'debe_cambiar_password' => $debeCambiar,
                    'password_cambiado_en'  => $debeCambiar ? null : now(),
                    'es_admin_central'      => $userData['es_admin_central'] ?? false,
                    'totp_secret'           => $userData['totp_secret'] ?? null,
                    'totp_activo'           => $userData['totp_activo'] ?? false,
                    'totp_activado_en'      => $userData['totp_activado_en'] ?? null,
                    'created_at'            => now(),
                    'updated_at'            => now(),
                ]
            );
        }
    }
}
