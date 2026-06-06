<?php

namespace Database\Factories;

use App\Models\Almacen;
use App\Models\Proyecto;
use Illuminate\Database\Eloquent\Factories\Factory;

class AlmacenFactory extends Factory
{
    protected $model = Almacen::class;

    public function definition(): array
    {
        return [
            'codigo'     => 'ALM-' . strtoupper($this->faker->unique()->lexify('????')),
            'nombre'     => 'Almacén ' . $this->faker->word(),
            'tipo'       => 'obra',
            'estado'     => 'activo',
            'proyecto_id'=> null,
        ];
    }
}
