<?php

namespace Tests\Feature\Almacenes;

use App\Models\Almacen;
use App\Models\Beneficiario;
use App\Models\CategoriaMaterial;
use App\Models\CategoriaConstructiva;
use App\Models\ItemConstructivo;
use App\Models\Material;
use App\Models\Permiso;
use App\Models\PresupuestoItemProyecto;
use App\Models\Proyecto;
use App\Models\RecetaItem;
use App\Models\Rol;
use App\Models\StockMaterial;
use App\Models\UnidadMedida;
use App\Models\User;
use App\Models\Vivienda;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MaterialesConStockTest extends TestCase
{
    use RefreshDatabase;

    private function crearUsuarioConPermiso(string ...$permisos): User
    {
        $rol = Rol::create([
            'nombre' => 'rol_' . uniqid(), 'nombre_visible' => 'Test',
            'es_sistema' => false, 'estado' => 'activo',
        ]);
        $user = User::create([
            'nombre' => 'Test', 'apellido_paterno' => 'User',
            'ci' => (string) rand(1000000, 9999999),
            'email' => 'usr_' . uniqid() . '@test.com',
            'password' => Hash::make('Pass!'),
            'rol_id' => $rol->id, 'estado' => 'activo',
            'debe_cambiar_password' => false,
        ]);
        foreach ($permisos as $codigo) {
            $p = Permiso::firstOrCreate(
                ['codigo' => $codigo],
                ['nombre' => $codigo, 'nombre_visible' => $codigo, 'modulo' => explode('.', $codigo)[0], 'accion' => explode('.', $codigo)[1] ?? 'ver']
            );
            $rol->permisos()->syncWithoutDetaching([$p->id]);
        }
        return $user;
    }

    private function crearMaterial(string $nombre = 'Material Test'): Material
    {
        $cat = CategoriaMaterial::create(['nombre' => 'Cat_' . uniqid(), 'color' => '#fff']);
        $um  = UnidadMedida::firstOrCreate(
            ['simbolo' => 'bl' . substr(uniqid(), -4)],
            ['nombre' => 'um_' . uniqid(), 'activa' => true]
        );
        return Material::create([
            'codigo' => 'MAT-' . uniqid(), 'nombre' => $nombre,
            'tipo' => 'maestro', 'estado' => true,
            'categoria_id' => $cat->id, 'unidad_medida_id' => $um->id,
        ]);
    }

    private function crearStockEnAlmacen(Almacen $almacen, Material $material, float $cantidad, float $reservada = 0): StockMaterial
    {
        return StockMaterial::create([
            'almacen_id'          => $almacen->id,
            'material_id'         => $material->id,
            'cantidad'            => $cantidad,
            'cantidad_reservada'  => $reservada,
            'cantidad_en_transito'=> 0,
            'costo_promedio'      => 10.0,
        ]);
    }

    // ── Test 1: endpoint retorna solo materiales con stock disponible > 0 ──────

    public function test_endpoint_materiales_con_stock_retorna_solo_materiales_con_stock_positivo(): void
    {
        $user    = $this->crearUsuarioConPermiso('almacenes.ver');
        $almacen = Almacen::create([
            'codigo' => 'ALM-' . uniqid(), 'nombre' => 'Almacén Test',
            'tipo' => 'obra', 'estado' => 'activo',
        ]);

        $mat1 = $this->crearMaterial('Cemento Portland');
        $mat2 = $this->crearMaterial('Arena gruesa');
        $mat3 = $this->crearMaterial('Cal hidratada'); // stock = 0

        $this->crearStockEnAlmacen($almacen, $mat1, 50.0);   // disponible = 50
        $this->crearStockEnAlmacen($almacen, $mat2, 30.0);   // disponible = 30
        $this->crearStockEnAlmacen($almacen, $mat3, 0.0);    // disponible = 0 — no debe aparecer

        $res = $this->actingAs($user)
            ->getJson("/api/almacenes/{$almacen->id}/materiales-con-stock");

        $res->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $data = $res->json('data');
        $this->assertCount(2, $data, 'Solo deben retornarse los 2 materiales con stock > 0');

        $ids = collect($data)->pluck('material_id')->all();
        $this->assertContains($mat1->id, $ids);
        $this->assertContains($mat2->id, $ids);
        $this->assertNotContains($mat3->id, $ids);

        // Verifica estructura de cada fila
        $primero = $data[0];
        $this->assertArrayHasKey('material_id', $primero);
        $this->assertArrayHasKey('nombre', $primero);
        $this->assertArrayHasKey('codigo', $primero);
        $this->assertArrayHasKey('unidad', $primero);
        $this->assertArrayHasKey('cantidad_disponible', $primero);
        $this->assertArrayHasKey('pmp', $primero);
    }

    public function test_endpoint_materiales_con_stock_excluye_agotados_por_reserva(): void
    {
        $user    = $this->crearUsuarioConPermiso('almacenes.ver');
        $almacen = Almacen::create([
            'codigo' => 'ALM-' . uniqid(), 'nombre' => 'Almacén Test 2',
            'tipo' => 'obra', 'estado' => 'activo',
        ]);

        $mat = $this->crearMaterial('Ladrillo hueco');
        // cantidad = 100, reservada = 100 → disponible = 0
        $this->crearStockEnAlmacen($almacen, $mat, 100.0, 100.0);

        $res = $this->actingAs($user)
            ->getJson("/api/almacenes/{$almacen->id}/materiales-con-stock");

        $res->assertStatus(200);
        $this->assertCount(0, $res->json('data'), 'Toda la cantidad está reservada, no debe aparecer');
    }

    public function test_endpoint_materiales_con_stock_requiere_permiso(): void
    {
        $user    = $this->crearUsuarioConPermiso(); // sin permisos
        $almacen = Almacen::create([
            'codigo' => 'ALM-' . uniqid(), 'nombre' => 'Almacén Test 3',
            'tipo' => 'obra', 'estado' => 'activo',
        ]);

        $this->actingAs($user)
            ->getJson("/api/almacenes/{$almacen->id}/materiales-con-stock")
            ->assertStatus(403);
    }

    // ── Test 2: porBeneficiario retorna receta con disponibilidad ─────────────

    public function test_endpoint_receta_con_stock_retorna_materiales_con_disponibilidad(): void
    {
        $user    = $this->crearUsuarioConPermiso('presupuesto_materiales.ver');

        $proyecto = Proyecto::create([
            'codigo'                   => 'PRJ-' . substr(uniqid(), -6),
            'nombre'                   => 'Proyecto Test',
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

        $cat  = CategoriaConstructiva::create(['nombre' => 'Cat_' . uniqid(), 'color' => '#f00']);
        $item = ItemConstructivo::create([
            'codigo'                    => 'ITM-' . substr(uniqid(), -8),
            'nombre'                    => 'Replanteo y trazado',
            'unidad_base'               => 'm2',
            'categoria_constructiva_id' => $cat->id,
            'estado'                    => true,
        ]);

        $mat1 = $this->crearMaterial('Cemento');
        $mat2 = $this->crearMaterial('Cal'); // sin stock en almacén

        RecetaItem::create([
            'item_constructivo_id'  => $item->id,
            'material_id'           => $mat1->id,
            'cantidad_por_unidad_base' => 1.5,
            'unidad_material'       => 'bol',
        ]);
        RecetaItem::create([
            'item_constructivo_id'  => $item->id,
            'material_id'           => $mat2->id,
            'cantidad_por_unidad_base' => 0.5,
            'unidad_material'       => 'bol',
        ]);

        PresupuestoItemProyecto::create([
            'proyecto_id'          => $proyecto->id,
            'vivienda_id'          => $vivienda->id,
            'item_constructivo_id' => $item->id,
            'cantidad_planificada' => 10.0,
            'orden'                => 1,
        ]);

        $res = $this->actingAs($user)
            ->getJson("/api/presupuesto-items-proyecto?proyecto_id={$proyecto->id}&vivienda_id={$vivienda->id}");

        $res->assertStatus(200);

        $items = $res->json('data');
        $this->assertNotEmpty($items, 'Debe retornar al menos un ítem');

        $primer = $items[0];
        $this->assertArrayHasKey('item_constructivo', $primer);
        $this->assertArrayHasKey('receta', $primer['item_constructivo'], 'La receta debe estar incluida en item_constructivo');

        $receta = $primer['item_constructivo']['receta'];
        $this->assertCount(2, $receta, 'La receta debe tener 2 materiales');

        // Verifica que cada entrada de receta incluye el material
        foreach ($receta as $r) {
            $this->assertArrayHasKey('material_id', $r);
            $this->assertArrayHasKey('cantidad_por_unidad_base', $r);
            $this->assertArrayHasKey('material', $r, 'La relación material debe estar cargada');
        }
    }

    // ── Test 3: flujo entrega social — datos suficientes en Paso 2 ────────────

    public function test_paso_2_entrega_social_carga_materiales_al_seleccionar_item(): void
    {
        $user    = $this->crearUsuarioConPermiso('almacenes.ver', 'presupuesto_materiales.ver');

        $proyecto = Proyecto::create([
            'codigo'                   => 'SOC-' . substr(uniqid(), -6),
            'nombre'                   => 'Proyecto Social',
            'categoria'                => 'social',
            'estado'                   => 'en_ejecucion',
            'prioridad'                => 'media',
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ]);

        $almacen = Almacen::create([
            'codigo'      => 'ALM-' . substr(uniqid(), -6),
            'nombre'      => 'Almacén Social',
            'tipo'        => 'obra',
            'estado'      => 'activo',
            'proyecto_id' => $proyecto->id,
        ]);

        $vivienda = Vivienda::create([
            'codigo'      => 'VIV-' . substr(uniqid(), -6),
            'proyecto_id' => $proyecto->id,
            'estado'      => 'planificada',
        ]);

        $beneficiario = Beneficiario::create([
            'codigo_beneficiario' => 'BEN-' . substr(uniqid(), -6),
            'nombre'              => 'Juan',
            'apellido_paterno'    => 'Pérez',
            'ci'                  => 'CI-' . substr(uniqid(), -6),
            'genero'              => 'masculino',
            'proyecto_id'         => $proyecto->id,
            'estado_seleccion'    => 'aceptado',
        ]);

        $vivienda->update(['beneficiario_id' => $beneficiario->id]);

        $cat  = CategoriaConstructiva::create(['nombre' => 'Cat_' . uniqid(), 'color' => '#0f0']);
        $item = ItemConstructivo::create([
            'codigo'                    => 'ITM-' . substr(uniqid(), -8),
            'nombre'                    => 'Replanteo y trazado de obra',
            'unidad_base'               => 'm2',
            'categoria_constructiva_id' => $cat->id,
            'estado'                    => true,
        ]);

        $cemento = $this->crearMaterial('Cemento Portland');
        RecetaItem::create([
            'item_constructivo_id'     => $item->id,
            'material_id'              => $cemento->id,
            'cantidad_por_unidad_base' => 2.0,
            'unidad_material'          => 'bol',
        ]);

        PresupuestoItemProyecto::create([
            'proyecto_id'          => $proyecto->id,
            'vivienda_id'          => $vivienda->id,
            'item_constructivo_id' => $item->id,
            'cantidad_planificada' => 15.0,
            'orden'                => 1,
            'estado_ejecucion'     => 'en_proceso',
        ]);

        // Cemento en el almacén con stock disponible
        $this->crearStockEnAlmacen($almacen, $cemento, 200.0);

        // --- Verificar que el endpoint de materiales retorna el cemento ---
        $resMats = $this->actingAs($user)
            ->getJson("/api/almacenes/{$almacen->id}/materiales-con-stock");

        $resMats->assertStatus(200);
        $mats = $resMats->json('data');
        $this->assertNotEmpty($mats, 'El dropdown debe tener materiales con stock');
        $this->assertEquals($cemento->id, $mats[0]['material_id']);
        $this->assertEquals(200.0, $mats[0]['cantidad_disponible']);

        // --- Verificar que los ítems del beneficiario incluyen la receta ---
        $resItems = $this->actingAs($user)
            ->getJson("/api/presupuesto-items-proyecto?proyecto_id={$proyecto->id}&beneficiario_id={$beneficiario->id}");

        $resItems->assertStatus(200);
        $items = $resItems->json('data');
        $this->assertNotEmpty($items, 'Debe retornar ítems para el beneficiario');

        $pip    = $items[0];
        $receta = $pip['item_constructivo']['receta'] ?? [];
        $this->assertNotEmpty($receta, 'La receta debe estar cargada en el ítem');
        $this->assertEquals($cemento->id, $receta[0]['material_id']);
        $this->assertEquals('2.0000', $receta[0]['cantidad_por_unidad_base']);
        $this->assertNotNull($receta[0]['material'], 'El material de la receta debe estar eager-loaded');
    }
}
