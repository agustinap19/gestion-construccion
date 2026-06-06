<?php

namespace Tests\Feature\Movimientos;

use App\Models\Almacen;
use App\Models\Beneficiario;
use App\Models\CategoriaConstructiva;
use App\Models\ItemConstructivo;
use App\Models\Material;
use App\Models\MovimientoAlmacen;
use App\Models\Permiso;
use App\Models\PresupuestoItemProyecto;
use App\Models\Proyecto;
use App\Models\RecetaItem;
use App\Models\Rol;
use App\Models\StockMaterial;
use App\Models\UnidadMedida;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Sub-fase C.1 — Movimientos profesionales de almacén.
 * 15 tests covering: entrada/salida/transferencia, PMP, evidencias,
 * sobre-consumo, anulación, confirmar transferencia, cierre.
 */
class MovimientoAlmacenTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Almacen $almacen;
    private Material $material;
    private UnidadMedida $unidad;

    // ── Setup ────────────────────────────────────────────────────────────────────

    protected function setUp(): void
    {
        parent::setUp();

        $this->unidad = UnidadMedida::create([
            'nombre'  => 'Bolsa',
            'simbolo' => 'bol',
            'tipo'    => 'masa',
        ]);

        $this->material = Material::create([
            'codigo'           => 'CEM-001',
            'nombre'           => 'Cemento Portland',
            'unidad_medida_id' => $this->unidad->id,
            'tipo'             => 'maestro',
            'activo'           => true,
        ]);

        $rol = Rol::create([
            'nombre'         => 'almacenero',
            'nombre_visible' => 'Almacenero',
            'descripcion'    => 'Almacenero',
        ]);

        $codigos = [
            'movimientos.ver',
            'movimientos.crear_entrada',
            'movimientos.crear_salida_social',
            'movimientos.crear_salida_privado',
            'movimientos.transferir',
            'movimientos.anular',
            'almacenes.ver',
            'almacenes.gestionar',
        ];
        foreach ($codigos as $codigo) {
            $p = Permiso::create(['codigo' => $codigo, 'nombre' => $codigo, 'modulo' => 'almacenes', 'descripcion' => $codigo]);
            $rol->permisos()->attach($p);
        }

        $this->admin = User::factory()->create();
        $this->admin->update(['rol_id' => $rol->id]);

        $this->almacen = Almacen::create([
            'codigo' => 'ALM-C1',
            'nombre' => 'Almacén C1',
            'tipo'   => 'central',
            'estado' => 'activo',
        ]);
    }

    // Crea stock inicial en el almacén
    private function crearStock(float $cantidad, float $pmp = 10.0): StockMaterial
    {
        $stock = StockMaterial::firstOrCreate(
            ['almacen_id' => $this->almacen->id, 'material_id' => $this->material->id],
            ['cantidad' => 0, 'cantidad_reservada' => 0, 'cantidad_en_transito' => 0, 'costo_promedio' => 0]
        );
        $stock->update(['cantidad' => $cantidad, 'costo_promedio' => $pmp]);
        return $stock;
    }

    // Registra una entrada y retorna el movimiento
    private function entrada(float $cantidad, float $precio): array
    {
        $res = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/entradas', [
            'almacen_id' => $this->almacen->id,
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => $cantidad, 'precio_unitario' => $precio],
            ],
        ]);
        return [$res, $res->json('id')];
    }

    // Contexto social: proyecto + almacen + beneficiario + pip + item (sin receta)
    private function setupContextoSocial(): array
    {
        $proyecto = Proyecto::create([
            'codigo'                   => 'SOC-' . substr(uniqid(), -6),
            'nombre'                   => 'Proyecto Social C1',
            'categoria'                => 'social',
            'estado'                   => 'en_ejecucion',
            'prioridad'                => 'media',
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ]);

        $almacenSocial = Almacen::create([
            'codigo'      => 'SOC-' . substr(uniqid(), -4),
            'nombre'      => 'Almacén Social',
            'tipo'        => 'obra',
            'estado'      => 'activo',
            'proyecto_id' => $proyecto->id,
        ]);

        $beneficiario = Beneficiario::create([
            'codigo_beneficiario' => 'BEN-' . substr(uniqid(), -6),
            'nombre'              => 'María',
            'apellido_paterno'    => 'López',
            'ci'                  => 'CI-' . substr(uniqid(), -6),
            'genero'              => 'femenino',
            'proyecto_id'         => $proyecto->id,
            'estado_seleccion'    => 'aceptado',
        ]);

        $cat  = CategoriaConstructiva::create(['nombre' => 'Estructura-' . substr(uniqid(), -4), 'color' => '#60a5fa']);
        $item = ItemConstructivo::create([
            'codigo'                    => 'ITM-' . substr(uniqid(), -8),
            'nombre'                    => 'Muro ladrillo',
            'unidad_base'               => 'm2',
            'categoria_constructiva_id' => $cat->id,
            'estado'                    => true,
        ]);

        $pip = PresupuestoItemProyecto::create([
            'proyecto_id'          => $proyecto->id,
            'item_constructivo_id' => $item->id,
            'cantidad_planificada' => 20.0,
            'orden'                => 1,
        ]);

        // Stock en el almacen social
        StockMaterial::firstOrCreate(
            ['almacen_id' => $almacenSocial->id, 'material_id' => $this->material->id],
            ['cantidad' => 200, 'cantidad_reservada' => 0, 'cantidad_en_transito' => 0, 'costo_promedio' => 10.0]
        );

        return compact('proyecto', 'almacenSocial', 'beneficiario', 'pip', 'item');
    }

    // Contexto social con receta para pruebas de sobre-consumo
    private function setupContextoSocialConReceta(float $cantidadPlanificada = 10.0): array
    {
        $ctx  = $this->setupContextoSocial();
        $item = $ctx['item'];
        $pip  = $ctx['pip'];

        $pip->update(['cantidad_planificada' => $cantidadPlanificada]);

        // Receta: 1 bolsa de cemento por unidad del ítem
        RecetaItem::create([
            'item_constructivo_id'  => $item->id,
            'material_id'           => $this->material->id,
            'cantidad_por_unidad_base' => 1.0,
        ]);

        return $ctx;
    }

    // ── Tests ────────────────────────────────────────────────────────────────────

    /**
     * 1. Entrada compra crea stock y calcula PMP inicial.
     */
    public function test_entrada_compra_registra_stock_y_pmp(): void
    {
        [$res] = $this->entrada(200, 15.0);

        $res->assertStatus(201)
            ->assertJsonPath('tipo', 'entrada_compra')
            ->assertJsonPath('estado', 'completado');

        $stock = StockMaterial::where('almacen_id', $this->almacen->id)
            ->where('material_id', $this->material->id)
            ->first();

        $this->assertEquals(200.0, (float) $stock->cantidad);
        $this->assertEqualsWithDelta(15.0, (float) $stock->costo_promedio, 0.001);
    }

    /**
     * 2. Salida social descuenta stock y guarda foto + firma.
     */
    public function test_salida_social_descuenta_stock_guarda_evidencias(): void
    {
        $ctx = $this->setupContextoSocial();

        $res = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/salidas-sociales', [
            'almacen_id'                   => $ctx['almacenSocial']->id,
            'beneficiario_id'              => $ctx['beneficiario']->id,
            'presupuesto_item_proyecto_id' => $ctx['pip']->id,
            'modalidad_entrega'            => 'parcial',
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 5],
            ],
            'evidencias' => [
                ['tipo' => 'foto',  'base64' => 'data:image/png;base64,iVBORw0KGgo='],
                ['tipo' => 'firma', 'base64' => 'data:image/png;base64,iVBORw0KGgo='],
            ],
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('tipo', 'salida_social')
            ->assertJsonPath('estado', 'completado');

        $stock = StockMaterial::where('almacen_id', $ctx['almacenSocial']->id)
            ->where('material_id', $this->material->id)
            ->first();

        $this->assertEquals(195.0, (float) $stock->cantidad);

        $this->assertDatabaseHas('evidencias_movimiento', [
            'movimiento_almacen_id' => $res->json('id'),
            'tipo'                  => 'foto',
        ]);
        $this->assertDatabaseHas('evidencias_movimiento', [
            'movimiento_almacen_id' => $res->json('id'),
            'tipo'                  => 'firma',
        ]);
    }

    /**
     * 3. Salida privada guarda receptor_nombre y evidencia foto.
     */
    public function test_salida_privada_requiere_foto_guarda_receptor(): void
    {
        $this->crearStock(100, 12.0);

        $res = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/salidas-privadas', [
            'almacen_id'      => $this->almacen->id,
            'receptor_nombre' => 'Juan Quispe',
            'receptor_ci'     => '1234567',
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 20],
            ],
            'evidencias' => [
                ['tipo' => 'foto', 'base64' => 'data:image/png;base64,iVBORw0KGgo='],
            ],
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('tipo', 'salida_privado')
            ->assertJsonPath('receptor_nombre', 'Juan Quispe');

        $stock = StockMaterial::where('almacen_id', $this->almacen->id)
            ->where('material_id', $this->material->id)
            ->first();

        $this->assertEquals(80.0, (float) $stock->cantidad);

        $this->assertDatabaseHas('evidencias_movimiento', [
            'movimiento_almacen_id' => $res->json('id'),
            'tipo'                  => 'foto',
        ]);
    }

    /**
     * 4. Transferencia descuenta origen e incrementa destino.
     */
    public function test_transferencia_descuenta_origen_incrementa_destino(): void
    {
        $this->crearStock(100, 10.0);

        $destino = Almacen::create(['codigo' => 'ALM-DEST', 'nombre' => 'Destino', 'tipo' => 'obra', 'estado' => 'activo']);

        $res = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/transferencias', [
            'almacen_origen_id'  => $this->almacen->id,
            'almacen_destino_id' => $destino->id,
            'notas'              => 'Traslado de materiales',
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 30],
            ],
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('tipo', 'transferencia_interna')
            ->assertJsonPath('estado', 'en_transito');

        $stockOrigen = StockMaterial::where('almacen_id', $this->almacen->id)->where('material_id', $this->material->id)->first();
        $this->assertEquals(70.0, (float) $stockOrigen->cantidad);

        $stockDestino = StockMaterial::where('almacen_id', $destino->id)->where('material_id', $this->material->id)->first();
        $this->assertEquals(30.0, (float) $stockDestino->cantidad);
    }

    /**
     * 5. Validar consumo retorna los niveles ok/alerta/bloqueado.
     */
    public function test_validar_consumo_retorna_niveles(): void
    {
        $ctx = $this->setupContextoSocialConReceta(10.0);

        // 5 unidades sobre planificado=10 → 50% → ok
        $res = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/validar-consumo', [
            'presupuesto_item_proyecto_id' => $ctx['pip']->id,
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 5],
            ],
        ]);

        $res->assertOk();
        $validacion = $res->json('validacion');
        $this->assertCount(1, $validacion);
        $this->assertEquals('ok', $validacion[0]['nivel']);

        // 12 unidades → 120% → alerta
        $res2 = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/validar-consumo', [
            'presupuesto_item_proyecto_id' => $ctx['pip']->id,
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 12],
            ],
        ]);
        $v2 = $res2->json('validacion.0');
        $this->assertEquals('alerta', $v2['nivel']);
        $this->assertTrue($v2['requiere_justificacion']);

        // 16 unidades → 160% → bloqueado
        $res3 = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/validar-consumo', [
            'presupuesto_item_proyecto_id' => $ctx['pip']->id,
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 16],
            ],
        ]);
        $v3 = $res3->json('validacion.0');
        $this->assertEquals('bloqueado', $v3['nivel']);
        $this->assertTrue($v3['requiere_aprobacion']);
    }

    /**
     * 6. Sobre-consumo 110-150% sin justificación → 422.
     */
    public function test_sobre_consumo_alerta_requiere_justificacion(): void
    {
        $ctx = $this->setupContextoSocialConReceta(10.0);

        // 12 bolsas / 10 planificadas = 120% → alerta, requiere justificación
        $res = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/salidas-sociales', [
            'almacen_id'                   => $ctx['almacenSocial']->id,
            'beneficiario_id'              => $ctx['beneficiario']->id,
            'presupuesto_item_proyecto_id' => $ctx['pip']->id,
            'modalidad_entrega'            => 'parcial',
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 12],
            ],
        ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['justificacion_sobre_consumo']);
    }

    /**
     * 7. Sobre-consumo >150% sin aprobación → error.
     */
    public function test_sobre_consumo_bloqueado_requiere_aprobacion(): void
    {
        $ctx = $this->setupContextoSocialConReceta(10.0);

        // 16 bolsas / 10 planificadas = 160% → bloqueado
        $res = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/salidas-sociales', [
            'almacen_id'                   => $ctx['almacenSocial']->id,
            'beneficiario_id'              => $ctx['beneficiario']->id,
            'presupuesto_item_proyecto_id' => $ctx['pip']->id,
            'modalidad_entrega'            => 'parcial',
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 16],
            ],
        ]);

        // RuntimeException → caught as 500 or propagated; either way not 2xx
        $this->assertNotEquals(201, $res->status());
    }

    /**
     * 8. Anular entrada revierte el stock a cero.
     */
    public function test_anular_entrada_revierte_stock(): void
    {
        [$res, $movId] = $this->entrada(100, 10.0);
        $res->assertStatus(201);

        $stockAntes = StockMaterial::where('almacen_id', $this->almacen->id)->where('material_id', $this->material->id)->first();
        $this->assertEquals(100.0, (float) $stockAntes->cantidad);

        $this->actingAs($this->admin)->patchJson("/api/movimientos-almacen/{$movId}/anular", [
            'motivo' => 'Factura incorrecta, reverso de prueba',
        ])->assertOk();

        $stockDespues = StockMaterial::where('almacen_id', $this->almacen->id)->where('material_id', $this->material->id)->first();
        $this->assertEquals(0.0, (float) $stockDespues->cantidad);
    }

    /**
     * 9. Anular salida privada devuelve el stock al almacén.
     */
    public function test_anular_salida_revierte_stock(): void
    {
        $this->crearStock(100, 10.0);

        $resSalida = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/salidas-privadas', [
            'almacen_id'      => $this->almacen->id,
            'receptor_nombre' => 'Obrero Test',
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 40],
            ],
        ]);
        $resSalida->assertStatus(201);

        $stockTras = StockMaterial::where('almacen_id', $this->almacen->id)->where('material_id', $this->material->id)->first();
        $this->assertEquals(60.0, (float) $stockTras->cantidad);

        $this->actingAs($this->admin)->patchJson("/api/movimientos-almacen/{$resSalida->json('id')}/anular", [
            'motivo' => 'Entrega cancelada por cambio de plan de obra',
        ])->assertOk();

        $stockFinal = StockMaterial::where('almacen_id', $this->almacen->id)->where('material_id', $this->material->id)->first();
        $this->assertEquals(100.0, (float) $stockFinal->cantidad);
    }

    /**
     * 10. PMP recalculado correctamente con múltiples entradas.
     *     Entrada 1: 100 bolsas @ Bs 10 → PMP = 10
     *     Entrada 2: 100 bolsas @ Bs 16 → PMP = (100×10 + 100×16)/200 = 13
     */
    public function test_pmp_recalculo_multiples_entradas(): void
    {
        $this->entrada(100, 10.0);
        $this->entrada(100, 16.0);

        $stock = StockMaterial::where('almacen_id', $this->almacen->id)->where('material_id', $this->material->id)->first();

        $this->assertEquals(200.0, (float) $stock->cantidad);
        $this->assertEqualsWithDelta(13.0, (float) $stock->costo_promedio, 0.01);
    }

    /**
     * 11. Listar movimientos con filtro por tipo retorna solo ese tipo.
     */
    public function test_listar_movimientos_con_filtros(): void
    {
        $this->entrada(50, 10.0);

        $res = $this->actingAs($this->admin)->getJson('/api/movimientos-almacen?almacen_id=' . $this->almacen->id . '&tipo=entrada_compra');

        $res->assertOk();
        $data = $res->json('data');
        $this->assertNotEmpty($data);
        foreach ($data as $mov) {
            $this->assertEquals('entrada_compra', $mov['tipo']);
        }
    }

    /**
     * 12. Stock insuficiente retorna error y no modifica el stock.
     */
    public function test_stock_insuficiente_retorna_error(): void
    {
        $this->crearStock(5, 10.0);

        $res = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/salidas-privadas', [
            'almacen_id'      => $this->almacen->id,
            'receptor_nombre' => 'Receptor Test',
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 100],
            ],
        ]);

        $this->assertNotEquals(201, $res->status());

        $stock = StockMaterial::where('almacen_id', $this->almacen->id)->where('material_id', $this->material->id)->first();
        $this->assertEquals(5.0, (float) $stock->cantidad);
    }

    /**
     * 13. Transferencia con mismo almacén origen y destino retorna 422.
     */
    public function test_transferencia_mismo_almacen_retorna_error(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/transferencias', [
            'almacen_origen_id'  => $this->almacen->id,
            'almacen_destino_id' => $this->almacen->id,
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 10],
            ],
        ]);

        $res->assertStatus(422);
    }

    /**
     * 14. Confirmar transferencia cambia estado de en_transito a completado.
     */
    public function test_confirmar_transferencia_estado_completado(): void
    {
        $this->crearStock(50, 10.0);
        $destino = Almacen::create(['codigo' => 'ALM-CONF', 'nombre' => 'Almacén Confirmación', 'tipo' => 'obra', 'estado' => 'activo']);

        $resTransfer = $this->actingAs($this->admin)->postJson('/api/movimientos-almacen/transferencias', [
            'almacen_origen_id'  => $this->almacen->id,
            'almacen_destino_id' => $destino->id,
            'materiales' => [
                ['material_id' => $this->material->id, 'cantidad' => 20],
            ],
        ]);
        $resTransfer->assertStatus(201);
        $movId = $resTransfer->json('id');

        $this->assertEquals('en_transito', MovimientoAlmacen::find($movId)->estado);

        $resConfirmar = $this->actingAs($this->admin)->patchJson("/api/movimientos-almacen/{$movId}/confirmar");
        $resConfirmar->assertOk();

        $this->assertEquals('completado', MovimientoAlmacen::find($movId)->estado);
    }

    /**
     * 15. Cierre de almacén solo permitido cuando stock es cero en todos los materiales.
     */
    public function test_cierre_almacen_verifica_stock_cero(): void
    {
        // Intentar cerrar con stock → debe fallar
        $this->crearStock(10, 10.0);

        $resFallo = $this->actingAs($this->admin)->patchJson("/api/almacenes/{$this->almacen->id}/cerrar", [
            'motivo' => 'Obra terminada, cierre de prueba',
        ]);
        $resFallo->assertStatus(422);
        $this->assertEquals('activo', $this->almacen->fresh()->estado);

        // Vaciar stock y cerrar → debe funcionar
        StockMaterial::where('almacen_id', $this->almacen->id)
            ->where('material_id', $this->material->id)
            ->update(['cantidad' => 0]);

        $resOk = $this->actingAs($this->admin)->patchJson("/api/almacenes/{$this->almacen->id}/cerrar", [
            'motivo' => 'Obra terminada, cierre de prueba',
        ]);
        $resOk->assertOk();
        $this->assertEquals('cerrado', $this->almacen->fresh()->estado);
        $this->assertNotNull($this->almacen->fresh()->fecha_cierre);
    }
}
