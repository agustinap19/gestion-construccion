<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TipoProyecto;

class TipoProyectoSeeder extends Seeder
{
    public function run(): void
    {
        $tipos = [
            [
                'nombre' => 'Vivienda Social Rural',
                'descripcion' => 'Proyectos de construcción de viviendas en zonas rurales financiados por el estado.',
                'categoria' => 'social',
                'requiere_beneficiarios' => true,
                'requiere_entidad_estatal' => true
            ],
            [
                'nombre' => 'Vivienda Social Urbana',
                'descripcion' => 'Proyectos de construcción de viviendas en zonas urbanas y periurbanas.',
                'categoria' => 'social',
                'requiere_beneficiarios' => true,
                'requiere_entidad_estatal' => true
            ],
            [
                'nombre' => 'Casa Privada Individual',
                'descripcion' => 'Construcción de vivienda para clientes particulares.',
                'categoria' => 'privado',
                'requiere_beneficiarios' => false,
                'requiere_entidad_estatal' => false
            ],
            [
                'nombre' => 'Edificio Residencial',
                'descripcion' => 'Construcción de edificio de departamentos privados.',
                'categoria' => 'privado',
                'requiere_beneficiarios' => false,
                'requiere_entidad_estatal' => false
            ],
            [
                'nombre' => 'Edificio Comercial',
                'descripcion' => 'Construcción de espacios comerciales o galerías.',
                'categoria' => 'privado',
                'requiere_beneficiarios' => false,
                'requiere_entidad_estatal' => false
            ],
            [
                'nombre' => 'Remodelación',
                'descripcion' => 'Obras menores y remodelaciones de infraestructura existente.',
                'categoria' => 'privado',
                'requiere_beneficiarios' => false,
                'requiere_entidad_estatal' => false
            ],
            [
                'nombre' => 'Consultoría Técnica',
                'descripcion' => 'Diseño de planos, estudios de suelo, cálculos estructurales.',
                'categoria' => 'privado',
                'requiere_beneficiarios' => false,
                'requiere_entidad_estatal' => false
            ]
        ];

        foreach ($tipos as $tipo) {
            TipoProyecto::firstOrCreate(['nombre' => $tipo['nombre']], $tipo);
        }
    }
}
