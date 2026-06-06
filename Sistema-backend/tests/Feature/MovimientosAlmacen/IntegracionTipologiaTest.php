<?php

namespace Tests\Feature\MovimientosAlmacen;

use App\Models\CategoriaConstructiva;
use App\Models\ItemConstructivo;
use App\Models\PlantillaConstructiva;
use App\Models\ItemPlantillaConstructiva;
use App\Models\Permiso;
use App\Models\PresupuestoItemProyecto;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\TipoVivienda;
use App\Models\UnidadMedida;
use App\Models\User;
use App\Models\Vivienda;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntegracionTipologiaTest extends TestCase
{
    use RefreshDatabase;

    public function test_tipo_vivienda_vincula_plantilla_constructiva(): void
    {
        $plantilla = PlantillaConstructiva::create([
            'nombre'     => 'Plantilla Social Tipo 1',
            'es_sistema' => true,
            'estado'     => true,
            'tipo_obra'  => 'vivienda_social',
        ]);

        $tipoVivienda = TipoVivienda::create([
            'nombre'                  => 'TIPO 1 — 2 dormitorios',
            'metros_cuadrados'        => 60,
            'estado'                  => 'activo',
            'plantilla_constructiva_id' => $plantilla->id,
        ]);

        $this->assertEquals($plantilla->id, $tipoVivienda->fresh()->plantilla_constructiva_id);
        $this->assertEquals($plantilla->nombre, $tipoVivienda->plantillaConstructiva->nombre);
    }

    public function test_integracion_genera_items_al_crear_beneficiario(): void
    {
        // Crear estructura base
        $unidad   = UnidadMedida::create(['nombre' => 'Global', 'simbolo' => 'glb', 'tipo' => 'cantidad']);
        $categoria= CategoriaConstructiva::create(['nombre' => 'Cat Test', 'codigo' => 'CT', 'color' => '#fff']);
        $item = ItemConstructivo::create([
            'codigo'                   => 'ITM-001',
            'nombre'                   => 'Instalación eléctrica',
            'categoria_constructiva_id'=> $categoria->id,
            'unidad_base'              => 'glb',
            'estado'                   => true,
        ]);
        $plantilla = PlantillaConstructiva::create([
            'nombre'    => 'Plantilla Social A',
            'es_sistema'=> true,
            'estado'    => true,
            'tipo_obra' => 'vivienda_social',
        ]);
        ItemPlantillaConstructiva::create([
            'plantilla_id'          => $plantilla->id,
            'item_constructivo_id'  => $item->id,
            'cantidad_sugerida'     => 1,
            'orden'                 => 1,
            'ponderacion_avance'    => 99.99,
        ]);
        $tipoVivienda = TipoVivienda::create([
            'nombre'                    => 'TIPO 2',
            'metros_cuadrados'          => 50,
            'estado'                    => 'activo',
            'plantilla_constructiva_id' => $plantilla->id,
        ]);

        // Proyecto y usuario
        $rol = Rol::create(['nombre' => 'administrador', 'nombre_visible' => 'Administrador', 'descripcion' => 'Admin']);
        foreach (['beneficiarios.crear', 'beneficiarios.ver'] as $p) {
            $perm = Permiso::create(['codigo' => $p, 'nombre' => $p, 'modulo' => 'beneficiarios', 'descripcion' => $p]);
            $rol->permisos()->attach($perm);
        }
        $admin = User::factory()->create(['rol_id' => $rol->id]);

        // Verificar que TipoVivienda resuelve a PlantillaConstructiva
        $this->assertNotNull($tipoVivienda->plantillaConstructiva);
        $this->assertCount(1, $tipoVivienda->plantillaConstructiva->items);
    }
}
