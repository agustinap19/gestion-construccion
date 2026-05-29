<?php

namespace Database\Factories;

use App\Models\Proyecto;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProyectoFactory extends Factory
{
    protected $model = Proyecto::class;

    public function definition(): array
    {
        return [
            'codigo'   => 'PRY-' . strtoupper($this->faker->unique()->lexify('????')),
            'nombre'   => 'Proyecto ' . $this->faker->words(3, true),
            'categoria'=> $this->faker->randomElement(['social', 'privado', 'institucional']),
            'estado'   => 'en_ejecucion',
        ];
    }
}
