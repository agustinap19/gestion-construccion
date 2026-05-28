<?php

namespace Tests\Feature\Almacenes;

use App\Models\Almacen;
use App\Models\Material;
use App\Models\CategoriaMaterial;
use App\Models\UnidadMedida;
use App\Models\Permiso;
use App\Models\Rol;
use App\Models\StockMaterial;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AlmacenTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ────────────────────────────────────────────────────────────

    private function crearRol(array $attrs = []): Rol
    {
        return Rol::create(array_merge([
            'nombre' => 'rol_' . uniqid(), 'nombre_visible' => 'Rol Test',
            'es_sistema' => false, 'estado' => 'activo',
        ], $attrs));
    }

    private function crearUsuario(Rol $rol, array $permisos = []): User
    {
        $user = User::create([
            'nombre' => 'Test', 'apellido_paterno' => 'User',
            'ci' => (string) rand(1000000, 9999999),
            'email' => 'usr_' . uniqid() . '@test.com',
            'password' => Hash::make('Pass123!'),
            'rol_id' => $rol->id, 'estado' => 'activo',
            'debe_cambiar_password' => false,
        ]);

        foreach ($permisos as $codigo) {
            $p = Permiso::firstOrCreate(['codigo' => $codigo], [
                'nombre' => $codigo, 'nombre_visible' => $codigo,
                'modulo' => explode('.', $codigo)[0], 'accion' => explode('.', $codigo)[1] ?? 'ver',
            ]);
            $rol->permisos()->syncWithoutDetaching([$p->id]);
        }

        return $user;
    }

    private function crearAlmacen(array $attrs = []): Almacen
    {
        return Almacen::create(array_merge([
            'codigo' => 'ALM-' . uniqid(),
            'nombre' => 'Almacén Test',
            'tipo'   => 'obra',
            'estado' => 'activo',
        ], $attrs));
    }

    private function crearMaterial(): Material
    {
        $cat = CategoriaMaterial::create(['nombre' => 'Cat_' . uniqid(), 'color' => '#fff']);
        $um  = UnidadMedida::create(['nombre' => 'um_' . uniqid(), 'simbolo' => 'u', 'activa' => true]);
        return Material::create([
            'codigo' => 'MAT-' . uniqid(), 'nombre' => 'Material Test',
            'tipo' => 'maestro', 'estado' => true,
            'categoria_id' => $cat->id, 'unidad_medida_id' => $um->id,
        ]);
    }

    // ── Tests de Listado ──────────────────────────────────────────────────

    public function test_listar_almacenes_sin_permiso_retorna_403()
    {
        $rol     = $this->crearRol();
        $usuario = $this->crearUsuario($rol);

        $this->actingAs($usuario)->getJson('/api/almacenes')
            ->assertStatus(403);
    }

    public function test_listar_almacenes_con_permiso_retorna_200()
    {
        $rol     = $this->crearRol();
        $usuario = $this->crearUsuario($rol, ['almacenes.ver']);
        $this->crearAlmacen();

        $res = $this->actingAs($usuario)->getJson('/api/almacenes');
        $res->assertStatus(200)->assertJsonPath('status', 'success');
    }

    // ── Tests de Creación ─────────────────────────────────────────────────

    public function test_crear_almacen_sin_permiso_retorna_403()
    {
        $rol     = $this->crearRol();
        $usuario = $this->crearUsuario($rol, ['almacenes.ver']);

        $this->actingAs($usuario)->postJson('/api/almacenes', [
            'nombre' => 'Nuevo', 'tipo' => 'obra',
        ])->assertStatus(403);
    }

    public function test_crear_almacen_de_obra_exitosamente()
    {
        $rol     = $this->crearRol();
        $usuario = $this->crearUsuario($rol, ['almacenes.gestionar']);

        $res = $this->actingAs($usuario)->postJson('/api/almacenes', [
            'nombre' => 'Almacén Obra Test',
            'tipo'   => 'obra',
        ]);
        $res->assertStatus(201)->assertJsonPath('data.tipo', 'obra');
        $this->assertDatabaseHas('almacenes', ['nombre' => 'Almacén Obra Test']);
    }

    public function test_crear_almacen_central_exitosamente()
    {
        $rol     = $this->crearRol();
        $usuario = $this->crearUsuario($rol, ['almacenes.gestionar']);

        $res = $this->actingAs($usuario)->postJson('/api/almacenes', [
            'nombre' => 'Almacén Central',
            'tipo'   => 'central',
        ]);
        $res->assertStatus(201)->assertJsonPath('data.tipo', 'central');
    }

    public function test_crear_segundo_almacen_central_retorna_400()
    {
        $this->crearAlmacen(['tipo' => 'central', 'codigo' => 'ALM-C-0001']);

        $rol     = $this->crearRol();
        $usuario = $this->crearUsuario($rol, ['almacenes.gestionar']);

        $this->actingAs($usuario)->postJson('/api/almacenes', [
            'nombre' => 'Central 2',
            'tipo'   => 'central',
        ])->assertStatus(400);
    }

    public function test_codigo_duplicado_retorna_422()
    {
        $this->crearAlmacen(['codigo' => 'ALM-DUPLICADO']);

        $rol     = $this->crearRol();
        $usuario = $this->crearUsuario($rol, ['almacenes.gestionar']);

        $this->actingAs($usuario)->postJson('/api/almacenes', [
            'nombre' => 'Test', 'tipo' => 'obra', 'codigo' => 'ALM-DUPLICADO',
        ])->assertStatus(422);
    }

    // ── Tests de Stock ────────────────────────────────────────────────────

    public function test_registrar_entrada_actualiza_stock_y_pmp()
    {
        $rol      = $this->crearRol();
        $usuario  = $this->crearUsuario($rol, ['almacenes.gestionar']);
        $almacen  = $this->crearAlmacen();
        $material = $this->crearMaterial();

        $this->actingAs($usuario)->postJson("/api/almacenes/{$almacen->id}/entradas", [
            'material_id'     => $material->id,
            'cantidad'        => 10,
            'precio_unitario' => 50,
            'concepto'        => 'Compra inicial',
        ])->assertStatus(201);

        $stock = StockMaterial::where('almacen_id', $almacen->id)
            ->where('material_id', $material->id)->first();

        $this->assertNotNull($stock);
        $this->assertEquals(10, (float) $stock->cantidad);
        $this->assertEquals(50, (float) $stock->costo_promedio);
    }

    public function test_pmp_se_recalcula_en_segunda_entrada()
    {
        $rol      = $this->crearRol();
        $usuario  = $this->crearUsuario($rol, ['almacenes.gestionar']);
        $almacen  = $this->crearAlmacen();
        $material = $this->crearMaterial();

        $this->actingAs($usuario)->postJson("/api/almacenes/{$almacen->id}/entradas", [
            'material_id' => $material->id, 'cantidad' => 10, 'precio_unitario' => 50, 'concepto' => 'Entrada 1',
        ]);
        $this->actingAs($usuario)->postJson("/api/almacenes/{$almacen->id}/entradas", [
            'material_id' => $material->id, 'cantidad' => 10, 'precio_unitario' => 70, 'concepto' => 'Entrada 2',
        ]);

        // PMP = (10×50 + 10×70) / 20 = 1200/20 = 60
        $stock = StockMaterial::where('almacen_id', $almacen->id)->where('material_id', $material->id)->first();
        $this->assertEquals(60.0, (float) $stock->costo_promedio);
        $this->assertEquals(20.0, (float) $stock->cantidad);
    }

    public function test_salida_sin_stock_suficiente_retorna_400()
    {
        $rol      = $this->crearRol();
        $usuario  = $this->crearUsuario($rol, ['almacenes.gestionar']);
        $almacen  = $this->crearAlmacen();
        $material = $this->crearMaterial();

        $this->actingAs($usuario)->postJson("/api/almacenes/{$almacen->id}/entradas", [
            'material_id' => $material->id, 'cantidad' => 5, 'precio_unitario' => 50, 'concepto' => 'Entrada',
        ]);

        $this->actingAs($usuario)->postJson("/api/almacenes/{$almacen->id}/salidas", [
            'material_id' => $material->id, 'cantidad' => 10, 'concepto' => 'Salida excesiva',
        ])->assertStatus(400);
    }

    public function test_cambiar_estado_almacen_central_retorna_400()
    {
        $this->crearAlmacen(['tipo' => 'central', 'codigo' => 'ALM-C-0001']);
        $almacen = Almacen::where('tipo', 'central')->first();

        $rol     = $this->crearRol();
        $usuario = $this->crearUsuario($rol, ['almacenes.gestionar']);

        $this->actingAs($usuario)->patchJson("/api/almacenes/{$almacen->id}/estado", [
            'estado' => 'inactivo',
        ])->assertStatus(400);
    }
}
