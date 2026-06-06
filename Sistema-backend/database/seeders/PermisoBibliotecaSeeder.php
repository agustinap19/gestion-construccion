<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use Illuminate\Database\Seeder;

class PermisoBibliotecaSeeder extends Seeder
{
    public function run(): void
    {
        $permisos = [
            [
                'codigo'         => 'biblioteca_constructiva.ver',
                'nombre'         => 'biblioteca_constructiva.ver',
                'nombre_visible' => 'Ver Biblioteca Constructiva',
                'modulo'         => 'biblioteca_constructiva',
                'accion'         => 'ver',
                'descripcion'    => 'Ver ítems constructivos, recetas, plantillas y categorías constructivas.',
            ],
            [
                'codigo'         => 'biblioteca_constructiva.gestionar',
                'nombre'         => 'biblioteca_constructiva.gestionar',
                'nombre_visible' => 'Gestionar Biblioteca Constructiva',
                'modulo'         => 'biblioteca_constructiva',
                'accion'         => 'gestionar',
                'descripcion'    => 'Crear, editar y eliminar ítems constructivos, plantillas y categorías.',
            ],
            [
                'codigo'         => 'presupuesto_materiales.ver',
                'nombre'         => 'presupuesto_materiales.ver',
                'nombre_visible' => 'Ver Presupuesto de Materiales',
                'modulo'         => 'presupuesto_materiales',
                'accion'         => 'ver',
                'descripcion'    => 'Ver el presupuesto consolidado de materiales de un proyecto.',
            ],
            [
                'codigo'         => 'presupuesto_materiales.bloquear',
                'nombre'         => 'presupuesto_materiales.bloquear',
                'nombre_visible' => 'Bloquear Presupuesto de Materiales',
                'modulo'         => 'presupuesto_materiales',
                'accion'         => 'bloquear',
                'descripcion'    => 'Bloquear el presupuesto de materiales para evitar cambios no autorizados.',
            ],
            [
                'codigo'         => 'overrides_receta.aprobar',
                'nombre'         => 'overrides_receta.aprobar',
                'nombre_visible' => 'Aprobar Overrides de Receta',
                'modulo'         => 'overrides_receta',
                'accion'         => 'aprobar',
                'descripcion'    => 'Autorizar cambios a recetas paramétricas en proyectos específicos.',
            ],
        ];

        foreach ($permisos as $p) {
            Permiso::firstOrCreate(['codigo' => $p['codigo']], $p);
        }

        $rolesData = [
            'gerente' => [
                'biblioteca_constructiva.ver', 'biblioteca_constructiva.gestionar',
                'presupuesto_materiales.ver', 'presupuesto_materiales.bloquear',
                'overrides_receta.aprobar',
            ],
            'administrador_proyecto' => [
                'biblioteca_constructiva.ver',
                'presupuesto_materiales.ver',
                'overrides_receta.aprobar',
            ],
            'encargado_almacen' => [
                'biblioteca_constructiva.ver',
                'presupuesto_materiales.ver',
            ],
            'encargado_finanzas' => [
                'biblioteca_constructiva.ver',
                'presupuesto_materiales.ver',
            ],
        ];

        foreach ($rolesData as $rolNombre => $codigosPermisos) {
            $rol = Rol::where('nombre', $rolNombre)->first();
            if ($rol) {
                $ids = Permiso::whereIn('codigo', $codigosPermisos)->pluck('id');
                $rol->permisos()->syncWithoutDetaching($ids);
            }
        }
    }
}
