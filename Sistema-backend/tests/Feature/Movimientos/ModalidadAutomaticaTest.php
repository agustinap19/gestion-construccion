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
use Tests\TestCase;

/**
 * Tests para el fix de modalidad automática (sin Paso "Modalidad" en el modal).
 */
class ModalidadAutomaticaTest extends TestCase
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
            ['nombre' => 'CementosMod'],
            ['color' => '#fbbf24']
        );

        $this->material = Material::create([
            'codigo'           => 'CEM-MOD',
            'nombre'           => 'Cemento Modalidad Test',
            'unidad_medida_id' => $this->unidad->id,
            'categoria_id'     => $cat->id,
            'tipo'             => 'maestro',
            'estado'           => true,
        ]);

        $rol = Rol::create(['nombre' => 'admin_mod_' . uniqid(), 'nombre_visible' => 'Admin Mod']);

        $permisos = [
            'movimientos.ver', 'movimientos.crear_entrada',
            'movimientos.crear_salida_social',
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

    private function crearContexto(float $cantPlan = 10.0, float $coefReceta = 1.0): array
    {
        $proyecto = Proyecto::create([
            'codigo'                   => 'MOD-' . substr(uniqid(), -6),
            'nombre'                   => 'Proyecto Modalidad',
            'categoria'                => 'social',
            'estado'                   => 'en_ejecucion',
            'prioridad'                => 'media',
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ]);

        $almacen = Almacen::create([
            'codigo'      => 'ALM-' . substr(uniqid(), -6),
            'nombre'      => 'Almacén Modalidad',
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
            'nombre'              => 'Ana',
            'apellido_paterno'    => 'García',
            'ci'                  => 'CI-' . substr(uniqid(), -6),
            'genero'              => 'femenino',
            'proyecto_id'         => $proyecto->id,
            'estado_seleccion'    => 'aceptado',
        ]);
        $vivienda->update(['beneficiario_id' => $beneficiario->id]);

        $cat  = CategoriaConstructiva::create(['nombre' => 'CatMod_' . uniqid(), 'color' => '#a855f7']);
        $item = ItemConstructivo::create([
            'codigo'                    => 'ITM-' . substr(uniqid(), -8),
            'nombre'                    => 'Ítem Modalidad Test',
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

        // Stock disponible suficiente
        StockMaterial::create([
            'almacen_id'           => $almacen->id,
            'material_id'          => $this->material->id,
            'cantidad'             => 1000.0,
            'cantidad_reservada'   => 0,
            'cantidad_en_transito' => 0,
            'costo_promedio'       => 10.0,
        ]);

        return compact('proyecto', 'almacen', 'vivienda', 'beneficiario', 'item', 'pip');
    }

    private function registrarSalida(array $ctx, float $cantidad): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($this->admin)
            ->postJson('/api/movimientos-almacen/salidas-sociales', [
                'almacen_id'                   => $ctx['almacen']->id,
                'beneficiario_id'              => $ctx['beneficiario']->id,
                'presupuesto_item_proyecto_id' => $ctx['pip']->id,
                // Sin modalidad_entrega — debe detectarse automáticamente
                'materiales' => [
                    ['material_id' => $this->material->id, 'cantidad' => $cantidad],
                ],
                'evidencias' => [
                    ['tipo' => 'foto', 'base64' => 'data:image/jpeg;base64,/9j/4AAQ='],
                ],
            ]);
    }

    // ── test_entrega_del_95_porciento_o_mas_marca_item_terminado ─────────────────

    public function test_entrega_del_95_porciento_o_mas_marca_item_terminado(): void
    {
        // teórico_total = 10 × 1.0 = 10 bolsas, entregado_antes = 0
        // teórico_restante = 10
        // Entregar 9.5 bolsas (exactamente 95%) → modalidad = 'total'
        $ctx = $this->crearContexto(cantPlan: 10.0, coefReceta: 1.0);

        $res = $this->registrarSalida($ctx, 9.5);

        $res->assertStatus(201);

        // Verificar que la modalidad en el movimiento fue detectada como 'total'
        $this->assertDatabaseHas('movimientos_almacen', [
            'id'               => $res->json('id'),
            'modalidad_entrega'=> 'total',
        ]);

        // Verificar que el ítem queda como terminado con 100% de avance
        $pip = $ctx['pip']->fresh();
        $this->assertEquals('terminado', $pip->estado_ejecucion,
            'Con ≥ 95% del teórico restante, el ítem debe marcarse como terminado');
        $this->assertEquals(100, (int) $pip->porcentaje_avance,
            'El porcentaje debe ser 100%');
    }

    public function test_entrega_exacta_del_100_porciento_marca_item_terminado(): void
    {
        // Caso límite: entrega exacta del 100% del teórico restante
        $ctx = $this->crearContexto(cantPlan: 10.0, coefReceta: 1.0);

        $res = $this->registrarSalida($ctx, 10.0);

        $res->assertStatus(201);
        $this->assertDatabaseHas('movimientos_almacen', [
            'id' => $res->json('id'), 'modalidad_entrega' => 'total',
        ]);

        $pip = $ctx['pip']->fresh();
        $this->assertEquals('terminado', $pip->estado_ejecucion);
        $this->assertEquals(100, (int) $pip->porcentaje_avance);
    }

    // ── test_entrega_menor_al_95_porciento_registra_avance_parcial ───────────────

    public function test_entrega_menor_al_95_porciento_registra_avance_parcial(): void
    {
        // teórico_total = 10 × 1.0 = 10 bolsas
        // Entregar 5 bolsas (50%) → modalidad = 'parcial'
        $ctx = $this->crearContexto(cantPlan: 10.0, coefReceta: 1.0);

        $res = $this->registrarSalida($ctx, 5.0);

        $res->assertStatus(201);

        $this->assertDatabaseHas('movimientos_almacen', [
            'id'               => $res->json('id'),
            'modalidad_entrega'=> 'parcial',
        ]);

        // Ítem no debe estar terminado
        $pip = $ctx['pip']->fresh();
        $this->assertNotEquals('terminado', $pip->estado_ejecucion,
            'Con < 95%, el ítem no debe marcarse como terminado');

        // Avance debe reflejar proporcionalmente lo entregado (ya_entregado / teorico_total)
        // 5 / 10 × 100 = 50%, capped a 99%
        $avance = (float) $pip->porcentaje_avance;
        $this->assertEqualsWithDelta(50.0, $avance, 1.0,
            'El avance parcial debe ser proporcional a lo entregado vs teórico total');
    }

    public function test_entrega_del_94_porciento_es_parcial(): void
    {
        // 9.4 / 10 = 94% < 95% → parcial
        $ctx = $this->crearContexto(cantPlan: 10.0, coefReceta: 1.0);

        $res = $this->registrarSalida($ctx, 9.4);

        $res->assertStatus(201);
        $this->assertDatabaseHas('movimientos_almacen', [
            'id' => $res->json('id'), 'modalidad_entrega' => 'parcial',
        ]);

        $pip = $ctx['pip']->fresh();
        $this->assertNotEquals('terminado', $pip->estado_ejecucion);
    }

    // ── test_stepper_tiene_4_pasos_no_5 ─────────────────────────────────────────
    // Este test verifica que el backend acepta el request SIN modalidad_entrega,
    // lo que implica que el frontend no la envía (stepper de 4 pasos).

    public function test_stepper_tiene_4_pasos_no_5(): void
    {
        $ctx = $this->crearContexto();

        // Enviar sin modalidad_entrega (como haría el frontend de 4 pasos)
        $res = $this->actingAs($this->admin)
            ->postJson('/api/movimientos-almacen/salidas-sociales', [
                'almacen_id'                   => $ctx['almacen']->id,
                'beneficiario_id'              => $ctx['beneficiario']->id,
                'presupuesto_item_proyecto_id' => $ctx['pip']->id,
                // Sin 'modalidad_entrega' — el backend debe aceptarlo
                'materiales' => [
                    ['material_id' => $this->material->id, 'cantidad' => 5],
                ],
                'evidencias' => [
                    ['tipo' => 'foto', 'base64' => 'data:image/jpeg;base64,/9j/4AAQ='],
                ],
            ]);

        $res->assertStatus(201,
            'El backend debe aceptar el request sin modalidad_entrega (campo ahora opcional)');

        // La modalidad debe estar en la BD (auto-detectada por el servicio)
        $movId = $res->json('id');
        $mov   = MovimientoAlmacen::find($movId);
        $this->assertNotNull($mov->modalidad_entrega,
            'La modalidad debe estar seteada automáticamente aunque el frontend no la envíe');
        $this->assertContains($mov->modalidad_entrega, ['total', 'parcial'],
            'La modalidad auto-detectada debe ser "total" o "parcial"');
    }
}
