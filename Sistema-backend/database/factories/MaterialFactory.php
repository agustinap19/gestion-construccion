<?php

namespace Database\Factories;

use App\Models\Material;
use Illuminate\Database\Eloquent\Factories\Factory;

class MaterialFactory extends Factory
{
    protected $model = Material::class;

    public function definition(): array
    {
        return [
            'codigo'              => 'MAT-' . strtoupper($this->faker->unique()->lexify('??????')),
            'nombre'              => $this->faker->words(3, true),
            'tipo'                => 'maestro',
            'activo'              => true,
            'precio_referencial'  => $this->faker->randomFloat(2, 5, 200),
            'categoria_id'        => null,
            'unidad_medida_id'    => null,
        ];
    }
}
