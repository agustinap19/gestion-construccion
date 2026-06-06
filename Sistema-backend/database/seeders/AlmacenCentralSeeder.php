<?php

namespace Database\Seeders;

use App\Models\Almacen;
use Illuminate\Database\Seeder;

class AlmacenCentralSeeder extends Seeder
{
    public function run(): void
    {
        if (Almacen::where('tipo', 'central')->exists()) {
            return;
        }

        Almacen::create([
            'codigo'      => 'ALM-C-0001',
            'nombre'      => 'Almacén Central',
            'descripcion' => 'Almacén principal de la empresa. Repositorio maestro de todos los materiales.',
            'tipo'        => 'central',
            'estado'      => 'activo',
            'ubicacion'   => 'Sede principal CA & KANAGF S.R.L.',
        ]);
    }
}
