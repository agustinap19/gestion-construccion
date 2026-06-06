<?php

namespace Tests\Feature\Proyectos;

use App\Models\Almacen;
use App\Models\Beneficiario;
use App\Models\CategoriaMaterial;
use App\Models\CategoriaConstructiva;
use App\Models\DetalleMovimientoAlmacen;
use App\Models\ItemConstructivo;
use App\Models\Material;
use App\Models\MovimientoAlmacen;
use App\Models\OverrideItemProyecto;
use App\Models\Permiso;
use App\Models\PresupuestoItemProyecto;
use App\Models\PresupuestoMaterialProyecto;
use App\Models\Proyecto;
use App\Models\RecetaItem;
use App\Models\Rol;
use App\Models\StockMaterial;
use App\Models\UnidadMedida;
use App\Models\User;
use App\Models\Vivienda;
use Illuminate\Support\Facades\Hash;

trait EditorItemsTestTrait
{
    private function crearUnidad(): UnidadMedida
    {
        return UnidadMedida::firstOrCreate(
            ['simbolo' => 'bol'],
            ['nombre' => 'Bolsa', 'activa' => true]
        );
    }

    private function crearMaterial(string $suffix = ''): Material
    {
        $cat = CategoriaMaterial::firstOrCreate(
            ['nombre' => 'CatEdit' . $suffix],
            ['color' => '#fbbf24']
        );
        $um = $this->crearUnidad();
        return Material::create([
            'codigo'           => 'MAT-ED' . $suffix . uniqid(),
            'nombre'           => 'Material Editor ' . $suffix,
            'tipo'             => 'maestro',
            'estado'           => true,
            'categoria_id'     => $cat->id,
            'unidad_medida_id' => $um->id,
        ]);
    }

    private function crearUsuarioConPermisos(array $codigos): User
    {
        $rol = Rol::create([
            'nombre'         => 'rol_' . uniqid(),
            'nombre_visible' => 'Rol Test',
        ]);
        foreach ($codigos as $codigo) {
            $p = Permiso::firstOrCreate(
                ['codigo' => $codigo],
                ['nombre' => $codigo, 'nombre_visible' => $codigo,
                 'modulo' => explode('.', $codigo)[0], 'accion' => explode('.', $codigo)[1] ?? 'ver']
            );
            $rol->permisos()->syncWithoutDetaching([$p->id]);
        }
        $user = User::factory()->create(['debe_cambiar_password' => false]);
        $user->update(['rol_id' => $rol->id]);
        return $user;
    }

    private function crearContextoCompleto(float $cantPlan = 10.0, float $coef = 1.5): array
    {
        $proyecto = Proyecto::create([
            'codigo'                   => 'PRY-' . substr(uniqid(), -6),
            'nombre'                   => 'Proyecto Editor Test',
            'categoria'                => 'social',
            'estado'                   => 'en_ejecucion',
            'prioridad'                => 'media',
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ]);

        $vivienda = Vivienda::create([
            'codigo'      => 'VIV-' . substr(uniqid(), -6),
            'proyecto_id' => $proyecto->id,
            'estado'      => 'planificada',
        ]);

        $vivienda2 = Vivienda::create([
            'codigo'      => 'VIV2-' . substr(uniqid(), -6),
            'proyecto_id' => $proyecto->id,
            'estado'      => 'planificada',
        ]);

        $cat = CategoriaConstructiva::firstOrCreate(
            ['nombre' => 'CatConstr'],
            ['color'  => '#a855f7']
        );
        $item = ItemConstructivo::create([
            'codigo'                    => 'ITM-' . substr(uniqid(), -8),
            'nombre'                    => 'Ítem Editor Test',
            'unidad_base'               => 'm2',
            'categoria_constructiva_id' => $cat->id,
            'estado'                    => true,
        ]);

        $material = $this->crearMaterial('A');

        RecetaItem::create([
            'item_constructivo_id'     => $item->id,
            'material_id'              => $material->id,
            'cantidad_por_unidad_base' => $coef,
            'unidad_material'          => 'bol',
        ]);

        $pip1 = PresupuestoItemProyecto::create([
            'proyecto_id'          => $proyecto->id,
            'vivienda_id'          => $vivienda->id,
            'item_constructivo_id' => $item->id,
            'cantidad_planificada' => $cantPlan,
            'orden'                => 1,
            'estado_ejecucion'     => 'pendiente',
        ]);

        $pip2 = PresupuestoItemProyecto::create([
            'proyecto_id'          => $proyecto->id,
            'vivienda_id'          => $vivienda2->id,
            'item_constructivo_id' => $item->id,
            'cantidad_planificada' => $cantPlan,
            'orden'                => 2,
            'estado_ejecucion'     => 'pendiente',
        ]);

        $almacen = Almacen::create([
            'codigo'      => 'ALM-' . substr(uniqid(), -6),
            'nombre'      => 'Almacén Editor',
            'tipo'        => 'obra',
            'estado'      => 'activo',
            'proyecto_id' => $proyecto->id,
        ]);

        StockMaterial::create([
            'almacen_id'           => $almacen->id,
            'material_id'          => $material->id,
            'cantidad'             => 500.0,
            'cantidad_reservada'   => 0,
            'cantidad_en_transito' => 0,
            'costo_promedio'       => 10.0,
        ]);

        return compact('proyecto', 'vivienda', 'vivienda2', 'item', 'material', 'pip1', 'pip2', 'almacen');
    }
}
