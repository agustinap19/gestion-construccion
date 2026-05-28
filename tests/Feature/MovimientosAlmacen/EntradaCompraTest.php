<?php

namespace Tests\Feature\MovimientosAlmacen;

use App\Models\Almacen;
use App\Models\Material;
use App\Models\MovimientoAlmacen;
use App\Models\Permiso;
use App\Models\Rol;
use App\Models\StockMaterial;
use App\Models\UnidadMedida;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EntradaCompraTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Almacen $almacen;
    private Material $material;

    protected function setUp(): void
    {
        parent::setUp();

        $unidad = UnidadMedida::create(['nombre' => 'Kilogramo', 'simbolo' => 'kg', 'tipo' => 'masa']);

        $this->material = Material::create([
            'codigo'          => 'MAT-001',
            'nombre'          => 'Cemento Portland',
            'unidad_medida_id'=> $unidad->id,
            'tipo'            => 'maestro',
            'activo'          => true,
        ]);

        $rol = Rol::create(['nombre' => 'administrador', 'nombre_visible' => 'Administrador', 'descripcion' => 'Admin']);

        $permisos = ['movimientos.ver', 'movimientos.crear_entrada'];
        foreach ($permisos as $p) {
            $perm = Permiso::create(['codigo' => $p, 'nombre' => $p, 'modulo' => 'movimientos', 'descripcion' => $p]);
            $rol->permisos()->attach($perm);
        }

        $this->admin = User::factory()->create();
        $this->admin->update(['rol_id' => $rol->id]);

        $this->almacen = Almacen::create([
            'codigo'  => 'ALM-001',
            'nombre'  => 'Almacén Central',
            'tipo'    => 'central',
            'estado'  => 'activo',
        ]);
    }

    public function test_registrar_entrada_compra_multimaterial(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/entradas', [
            'almacen_id'       => $this->almacen->id,
            'proveedor_nombre' => 'Distribuidora ABC',
            'numero_factura'   => '001-001-00000001',
            'fecha_factura'    => '2026-05-26',
            'materiales' => [
                [
                    'material_id'    => $this->material->id,
                    'cantidad'       => 100,
                    'precio_unitario'=> 8.50,
                ],
            ],
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('tipo', 'entrada_compra')
                 ->assertJsonPath('estado', 'completado');

        $this->assertDatabaseHas('movimientos_almacen', [
            'tipo'            => 'entrada_compra',
            'almacen_destino_id' => $this->almacen->id,
        ]);

        $this->assertDatabaseHas('stock_material', [
            'almacen_id'  => $this->almacen->id,
            'material_id' => $this->material->id,
            'cantidad'    => 100,
        ]);
    }

    public function test_entrada_sin_permiso_retorna_403(): void
    {
        $rolSinPermiso = Rol::create(['nombre' => 'sin_permiso', 'nombre_visible' => 'Sin Permisos', 'descripcion' => 'Sin permisos']);
        $user = User::factory()->create(['rol_id' => $rolSinPermiso->id]);

        $response = $this->actingAs($user)->postJson('/api/movimientos-almacen/entradas', [
            'almacen_id' => $this->almacen->id,
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 10, 'precio_unitario' => 5],
            ],
        ]);

        $response->assertStatus(403);
    }

    public function test_pmp_se_calcula_correctamente(): void
    {
        // Primera entrada: 100 unidades a 8.00
        $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/entradas', [
            'almacen_id' => $this->almacen->id,
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 100, 'precio_unitario' => 8.00],
            ],
        ]);

        // Segunda entrada: 50 unidades a 11.00
        // PMP esperado = (100*8 + 50*11) / 150 = (800 + 550) / 150 = 9.00
        $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/entradas', [
            'almacen_id' => $this->almacen->id,
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 50, 'precio_unitario' => 11.00],
            ],
        ]);

        $stock = StockMaterial::where('almacen_id', $this->almacen->id)
            ->where('material_id', $this->material->id)
            ->first();

        $this->assertEquals(150, (float) $stock->cantidad);
        $this->assertEqualsWithDelta(9.0, (float) $stock->costo_promedio, 0.01);
    }

    public function test_kardex_queda_vinculado_al_movimiento(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/entradas', [
            'almacen_id' => $this->almacen->id,
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 50, 'precio_unitario' => 10],
            ],
        ]);

        $movId = $response->json('id');
        $mov   = MovimientoAlmacen::with('movimientosKardex')->find($movId);

        $this->assertCount(1, $mov->movimientosKardex);
        $this->assertEquals($movId, $mov->movimientosKardex->first()->movimiento_almacen_id);
    }
}
