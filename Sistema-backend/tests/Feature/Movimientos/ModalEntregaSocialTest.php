<?php

namespace Tests\Feature\Movimientos;

use App\Models\Almacen;
use App\Models\Beneficiario;
use App\Models\CategoriaMaterial;
use App\Models\CategoriaConstructiva;
use App\Models\DetalleMovimientoAlmacen;
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
use App\Models\Vivienda;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Tests para los 3 fixes del modal Entrega Social:
 *   FIX 1 - sin firma digital
 *   FIX 2 - bloqueo de materiales sin stock
 *   FIX 3 - porcentaje sobre teórico_restante
 */
class ModalEntregaSocialTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Material $material;
    private UnidadMedida $unidad;

    protected function setUp(): void
    {
        parent::setUp();

        $this->unidad = UnidadMedida::firstOrCreate(
            ['simbolo' => 'bol'],
            ['nombre' => 'Bolsa', 'activa' => true]
        );

        $cat = CategoriaMaterial::firstOrCreate(
            ['nombre' => 'Cementos'],
            ['color' => '#fbbf24']
        );

        $this->material = Material::create([
            'codigo'           => 'CEM-TST',
            'nombre'           => 'Cemento Portland Test',
            'unidad_medida_id' => $this->unidad->id,
            'categoria_id'     => $cat->id,
            'tipo'             => 'maestro',
            'estado'           => true,
        ]);

        $rol = Rol::create(['nombre' => 'admin_test', 'nombre_visible' => 'Admin Test']);

        $permisos = [
            'movimientos.ver', 'movimientos.crear_entrada',
            'movimientos.crear_salida_social', 'movimientos.crear_salida_privado',
            'movimientos.transferir', 'movimientos.anular',
            'almacenes.ver', 'almacenes.gestionar',
            'presupuesto_materiales.ver',
        ];
        foreach ($permisos as $codigo) {
            $p = Permiso::firstOrCreate(
                ['codigo' => $codigo],
                ['nombre' => $codigo, 'nombre_visible' => $codigo,
                 'modulo' => explode('.', $codigo)[0], 'accion' => explode('.', $codigo)[1] ?? 'ver']
            );
            $rol->permisos()->syncWithoutDetaching([$p->id]);
        }

        $this->admin = User::factory()->create(['debe_cambiar_password' => false]);
        $this->admin->update(['rol_id' => $rol->id]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private function crearContextoSocial(float $cantPlan = 10.0, float $coefReceta = 1.0): array
    {
        $proyecto = Proyecto::create([
            'codigo'                   => 'SOC-' . substr(uniqid(), -6),
            'nombre'                   => 'Proyecto Test',
            'categoria'                => 'social',
            'estado'                   => 'en_ejecucion',
            'prioridad'                => 'media',
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ]);

        $almacen = Almacen::create([
            'codigo'      => 'ALM-' . substr(uniqid(), -6),
            'nombre'      => 'Almacén Social Test',
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

        $cat  = CategoriaConstructiva::create(['nombre' => 'Cat_' . uniqid(), 'color' => '#60a5fa']);
        $item = ItemConstructivo::create([
            'codigo'                    => 'ITM-' . substr(uniqid(), -8),
            'nombre'                    => 'Replanteo y trazado',
            'unidad_base'               => 'm2',
            'categoria_constructiva_id' => $cat->id,
            'estado'                    => true,
        ]);

        RecetaItem::create([
            'item_constructivo_id'     => $item->id,
            'material_id'              => $this->material->id,
            'cantidad_por_unidad_base' => $coefReceta,
            'unidad_material'          => 'bol',
        ]);

        $pip = PresupuestoItemProyecto::create([
            'proyecto_id'          => $proyecto->id,
            'vivienda_id'          => $vivienda->id,
            'item_constructivo_id' => $item->id,
            'cantidad_planificada' => $cantPlan,
            'orden'                => 1,
        ]);

        return compact('proyecto', 'almacen', 'vivienda', 'beneficiario', 'item', 'pip');
    }

    private function crearStock(Almacen $almacen, float $cantidad, float $reservada = 0): StockMaterial
    {
        return StockMaterial::create([
            'almacen_id'           => $almacen->id,
            'material_id'          => $this->material->id,
            'cantidad'             => $cantidad,
            'cantidad_reservada'   => $reservada,
            'cantidad_en_transito' => 0,
            'costo_promedio'       => 10.0,
        ]);
    }

    /** Simula entregas anteriores directamente en BD sin pasar por el servicio */
    private function simularEntregasAnteriores(array $ctx, float $cantidadEntregada): void
    {
        $mov = MovimientoAlmacen::create([
            'codigo'                       => 'SA-TST-' . uniqid(),
            'tipo'                         => 'salida_social',
            'estado'                       => 'completado',
            'almacen_origen_id'            => $ctx['almacen']->id,
            'almacen_destino_id'           => null,
            'proyecto_id'                  => $ctx['proyecto']->id,
            'beneficiario_id'              => $ctx['beneficiario']->id,
            'presupuesto_item_proyecto_id' => $ctx['pip']->id,
            'modalidad_entrega'            => 'parcial',
            'registrado_por_id'            => $this->admin->id,
            'fecha_movimiento'             => now()->subDay(),
            'monto_total'                  => 0,
        ]);

        DetalleMovimientoAlmacen::create([
            'movimiento_almacen_id' => $mov->id,
            'material_id'           => $this->material->id,
            'cantidad'              => $cantidadEntregada,
            'precio_unitario'       => 10.0,
            'saldo_anterior'        => 200.0,
            'saldo_posterior'       => 200.0 - $cantidadEntregada,
        ]);
    }

    // ── FIX 2: test_material_sin_stock_aparece_deshabilitado_en_receta ───────────

    public function test_material_sin_stock_aparece_deshabilitado_en_receta(): void
    {
        $ctx = $this->crearContextoSocial();
        // SIN crear stock en el almacén → disponible = 0

        $res = $this->actingAs($this->admin)
            ->getJson("/api/presupuesto-items-proyecto/{$ctx['pip']->id}/receta-con-stock/{$ctx['almacen']->id}");

        $res->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $data = $res->json('data');
        $this->assertCount(1, $data);
        $material = $data[0];

        $this->assertEquals($this->material->id, $material['material_id']);
        $this->assertFalse($material['tiene_stock'], 'Sin stock → tiene_stock debe ser false');
        $this->assertEquals(0.0, $material['cantidad_disponible_almacen']);
        $this->assertFalse($material['item_completo']);
        $this->assertGreaterThan(0, $material['teorico_restante']);
    }

    public function test_material_con_stock_aparece_habilitado_en_receta(): void
    {
        $ctx = $this->crearContextoSocial();
        $this->crearStock($ctx['almacen'], 50.0);

        $res = $this->actingAs($this->admin)
            ->getJson("/api/presupuesto-items-proyecto/{$ctx['pip']->id}/receta-con-stock/{$ctx['almacen']->id}");

        $res->assertStatus(200);
        $material = $res->json('data.0');

        $this->assertTrue($material['tiene_stock'], 'Con stock → tiene_stock debe ser true');
        $this->assertEquals(50.0, $material['cantidad_disponible_almacen']);
    }

    // ── FIX 2: test_no_se_puede_avanzar_si_cantidad_excede_stock_disponible ──────

    public function test_no_se_puede_avanzar_si_cantidad_excede_stock_disponible(): void
    {
        $ctx = $this->crearContextoSocial();
        $this->crearStock($ctx['almacen'], 10.0); // solo 10 disponibles

        // Intentar registrar 25 (excede stock disponible)
        $res = $this->actingAs($this->admin)
            ->postJson('/api/movimientos-almacen/salidas-sociales', [
                'almacen_id'                   => $ctx['almacen']->id,
                'beneficiario_id'              => $ctx['beneficiario']->id,
                'presupuesto_item_proyecto_id' => $ctx['pip']->id,
                'modalidad_entrega'            => 'parcial',
                'materiales' => [
                    ['material_id' => $this->material->id, 'cantidad' => 25],
                ],
            ]);

        // StockService lanza excepción "Stock insuficiente" → 500 o 400
        $this->assertTrue(
            in_array($res->status(), [400, 422, 500]),
            "Debe fallar al exceder stock disponible. Status: {$res->status()}"
        );
    }

    // ── FIX 3: test_porcentaje_tolerancia_usa_teorico_restante ──────────────────

    public function test_porcentaje_tolerancia_usa_teorico_restante(): void
    {
        // Planificado: 10 unidades × coef 1.6 = 16 bolsas teóricas
        $ctx = $this->crearContextoSocial(cantPlan: 10.0, coefReceta: 1.6);
        $this->crearStock($ctx['almacen'], 200.0);

        // Simular 10 bolsas ya entregadas anteriormente
        // teórico_total = 16, ya_entregado = 10 → teórico_restante = 6
        $this->simularEntregasAnteriores($ctx, cantidadEntregada: 10.0);

        // Validar consumo de 8 bolsas nuevas
        // Con la fórmula NUEVA: 8 / 6 × 100 = 133.33% → nivel 'alerta'
        // Con la fórmula ANTIGUA: (10+8) / 16 × 100 = 112.5% → nivel 'alerta' (pero mal calculado)
        $res = $this->actingAs($this->admin)
            ->postJson('/api/movimientos-almacen/validar-consumo', [
                'presupuesto_item_proyecto_id' => $ctx['pip']->id,
                'materiales' => [
                    ['material_id' => $this->material->id, 'cantidad' => 8],
                ],
            ]);

        $res->assertStatus(200);
        $validacion = $res->json('validacion.0');

        $this->assertEquals($this->material->id, $validacion['material_id']);

        // FIX 3: debe ser 133.33% (8/6×100), NO 112.5% (18/16×100)
        $this->assertEqualsWithDelta(133.33, $validacion['porcentaje'], 0.1,
            'El porcentaje debe calcularse sobre el teórico RESTANTE (8/6×100=133%), no el total (18/16×100=112.5%)');

        $this->assertEquals('alerta', $validacion['nivel'],
            '133% debe clasificar como "alerta" (entre 110% y 150%)');
    }

    // ── FIX 3: test_item_completo_deshabilita_materiales ────────────────────────

    public function test_item_completo_deshabilita_materiales(): void
    {
        // teórico_total = 10 × 1.0 = 10 bolsas
        $ctx = $this->crearContextoSocial(cantPlan: 10.0, coefReceta: 1.0);
        $this->crearStock($ctx['almacen'], 200.0);

        // Simular entrega EXACTA de 10 bolsas (teórico_restante = 0)
        $this->simularEntregasAnteriores($ctx, cantidadEntregada: 10.0);

        $res = $this->actingAs($this->admin)
            ->getJson("/api/presupuesto-items-proyecto/{$ctx['pip']->id}/receta-con-stock/{$ctx['almacen']->id}");

        $res->assertStatus(200);
        $material = $res->json('data.0');

        $this->assertTrue($material['item_completo'],
            'Con teórico_restante = 0, item_completo debe ser true');
        $this->assertEquals(0.0, $material['teorico_restante']);
        $this->assertEquals(10.0, $material['ya_entregado']);

        // Además verificar que validarConsumo con cualquier cantidad > 0 retorna 9999%
        $resVal = $this->actingAs($this->admin)
            ->postJson('/api/movimientos-almacen/validar-consumo', [
                'presupuesto_item_proyecto_id' => $ctx['pip']->id,
                'materiales' => [
                    ['material_id' => $this->material->id, 'cantidad' => 1],
                ],
            ]);

        $resVal->assertStatus(200);
        $this->assertGreaterThanOrEqual(9999, $resVal->json('validacion.0.porcentaje'),
            'Con teórico_restante = 0, cualquier entrega debe retornar porcentaje extremo (9999)');
        $this->assertEquals('bloqueado', $resVal->json('validacion.0.nivel'));
    }

    // ── FIX 1: test_paso_4_no_tiene_firma_digital ────────────────────────────────

    public function test_paso_4_no_tiene_firma_digital(): void
    {
        $ctx = $this->crearContextoSocial();
        $this->crearStock($ctx['almacen'], 50.0);

        // Registrar salida social con SOLO foto (sin firma)
        $res = $this->actingAs($this->admin)
            ->postJson('/api/movimientos-almacen/salidas-sociales', [
                'almacen_id'                   => $ctx['almacen']->id,
                'beneficiario_id'              => $ctx['beneficiario']->id,
                'presupuesto_item_proyecto_id' => $ctx['pip']->id,
                'modalidad_entrega'            => 'parcial',
                'materiales' => [
                    ['material_id' => $this->material->id, 'cantidad' => 5],
                ],
                'evidencias' => [
                    ['tipo' => 'foto', 'base64' => 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAgEASABIAAD'],
                ],
            ]);

        $res->assertStatus(201, 'Debe aceptar entrega con solo foto, sin firma');
        $movId = $res->json('id');

        // Verificar que EXISTE evidencia de foto
        $this->assertDatabaseHas('evidencias_movimiento', [
            'movimiento_almacen_id' => $movId,
            'tipo'                  => 'foto',
        ]);

        // Verificar que NO existe evidencia de firma
        $this->assertDatabaseMissing('evidencias_movimiento', [
            'movimiento_almacen_id' => $movId,
            'tipo'                  => 'firma',
        ]);
    }

    public function test_paso_4_requiere_permiso(): void
    {
        // Sin permisos → 403
        $sinPermiso = User::factory()->create(['debe_cambiar_password' => false]);
        $rolVacio   = Rol::create(['nombre' => 'sin_permisos_' . uniqid(), 'nombre_visible' => 'Vacío']);
        $sinPermiso->update(['rol_id' => $rolVacio->id]);

        $ctx = $this->crearContextoSocial();

        $this->actingAs($sinPermiso)
            ->postJson('/api/movimientos-almacen/salidas-sociales', [
                'almacen_id'                   => $ctx['almacen']->id,
                'beneficiario_id'              => $ctx['beneficiario']->id,
                'presupuesto_item_proyecto_id' => $ctx['pip']->id,
                'modalidad_entrega'            => 'parcial',
                'materiales' => [['material_id' => $this->material->id, 'cantidad' => 1]],
            ])
            ->assertStatus(403);
    }
}
