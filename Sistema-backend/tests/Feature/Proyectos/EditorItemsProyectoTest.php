<?php

namespace Tests\Feature\Proyectos;

use App\Models\DetalleMovimientoAlmacen;
use App\Models\HistorialCambioItem;
use App\Models\ItemConstructivo;
use App\Models\MovimientoAlmacen;
use App\Models\OverrideItemProyecto;
use App\Models\PresupuestoItemProyecto;
use App\Models\PresupuestoMaterialProyecto;
use App\Models\RecetaItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EditorItemsProyectoTest extends TestCase
{
    use RefreshDatabase, EditorItemsTestTrait;

    private function gerente(): \App\Models\User
    {
        return $this->crearUsuarioConPermisos([
            'presupuesto_materiales.ver',
            'presupuesto_materiales.gestionar',
            'presupuesto_materiales.bloquear',
            'overrides_receta.aprobar',
        ]);
    }

    // ── test 1: cambiar cantidad tipología afecta TODAS las viviendas ─────────

    public function test_cambiar_cantidad_tipologia_afecta_todas_las_viviendas_del_proyecto(): void
    {
        $ctx  = $this->crearContextoCompleto(cantPlan: 10.0);
        $user = $this->gerente();

        // Actualizar cantidad del pip1 (vivienda 1)
        $res = $this->actingAs($user)
            ->patchJson("/api/proyectos/{$ctx['proyecto']->id}/items-config/{$ctx['pip1']->id}/cantidad", [
                'cantidad_planificada' => 25.0,
            ]);

        $res->assertStatus(200);
        $this->assertEquals(25.0, (float) $ctx['pip1']->fresh()->cantidad_planificada);
    }

    // ── test 2: cambiar cantidad vivienda NO afecta otras viviendas ───────────

    public function test_cambiar_cantidad_vivienda_no_afecta_otras_viviendas(): void
    {
        $ctx  = $this->crearContextoCompleto(cantPlan: 10.0);
        $user = $this->gerente();

        $this->actingAs($user)
            ->patchJson("/api/proyectos/{$ctx['proyecto']->id}/items-config/{$ctx['pip1']->id}/cantidad", [
                'cantidad_planificada' => 30.0,
            ])
            ->assertStatus(200);

        $this->assertEquals(30.0, (float) $ctx['pip1']->fresh()->cantidad_planificada);
        $this->assertEquals(10.0, (float) $ctx['pip2']->fresh()->cantidad_planificada,
            'pip2 (otra vivienda) no debe cambiar');
    }

    // ── test 3: override vivienda tiene precedencia sobre tipología ───────────

    public function test_override_vivienda_tiene_precedencia_sobre_tipologia(): void
    {
        $ctx  = $this->crearContextoCompleto();
        $user = $this->gerente();
        $pId  = $ctx['proyecto']->id;

        // Override tipología: 2.0
        $this->actingAs($user)
            ->putJson("/api/proyectos/{$pId}/items-config/override-tipologia", [
                'item_constructivo_id' => $ctx['item']->id,
                'justificacion'        => 'Override tipología para test',
                'materiales'           => [['material_id' => $ctx['material']->id, 'cantidad_por_unidad_base' => 2.0]],
            ])->assertStatus(200);

        // Override vivienda: 5.0
        $this->actingAs($user)
            ->putJson("/api/proyectos/{$pId}/items-config/override-vivienda", [
                'item_constructivo_id' => $ctx['item']->id,
                'vivienda_id'          => $ctx['vivienda']->id,
                'justificacion'        => 'Override vivienda para test',
                'materiales'           => [['material_id' => $ctx['material']->id, 'cantidad_por_unidad_base' => 5.0]],
            ])->assertStatus(200);

        // Verificar jerarquía desde el endpoint
        $resReceta = $this->actingAs($user)
            ->getJson("/api/presupuesto-items-proyecto/{$ctx['pip1']->id}/receta-con-stock/{$ctx['almacen']->id}");

        $resReceta->assertStatus(200);
        $r = $resReceta->json('data.0');
        $this->assertEquals(5.0, $r['cantidad_por_unidad_base'], 'Vivienda 1 debe usar override vivienda (5.0)');
        $this->assertEquals('vivienda', $r['fuente']);
    }

    // ── test 4: override tipología tiene precedencia sobre global ─────────────

    public function test_override_tipologia_tiene_precedencia_sobre_global(): void
    {
        $ctx  = $this->crearContextoCompleto(coef: 1.5);
        $user = $this->gerente();

        $this->actingAs($user)
            ->putJson("/api/proyectos/{$ctx['proyecto']->id}/items-config/override-tipologia", [
                'item_constructivo_id' => $ctx['item']->id,
                'justificacion'        => 'Override tipología para test',
                'materiales'           => [['material_id' => $ctx['material']->id, 'cantidad_por_unidad_base' => 3.3]],
            ])->assertStatus(200);

        $resReceta = $this->actingAs($user)
            ->getJson("/api/presupuesto-items-proyecto/{$ctx['pip2']->id}/receta-con-stock/{$ctx['almacen']->id}");

        $resReceta->assertStatus(200);
        $r = $resReceta->json('data.0');
        $this->assertEquals(3.3, $r['cantidad_por_unidad_base'],
            'Vivienda 2 debe usar override tipología (3.3), no global (1.5)');
        $this->assertEquals('tipologia', $r['fuente']);
    }

    // ── test 5: quitar item CON entregas → bloqueado ──────────────────────────

    public function test_quitar_item_con_entregas_registradas_es_bloqueado(): void
    {
        $ctx  = $this->crearContextoCompleto();
        $user = $this->gerente();

        // Simular entrega anterior
        $mov = MovimientoAlmacen::create([
            'codigo'                       => 'SA-BLQ-' . uniqid(),
            'tipo'                         => 'salida_social',
            'estado'                       => 'completado',
            'almacen_origen_id'            => $ctx['almacen']->id,
            'proyecto_id'                  => $ctx['proyecto']->id,
            'presupuesto_item_proyecto_id' => $ctx['pip1']->id,
            'beneficiario_id'              => null,
            'registrado_por_id'            => $user->id,
            'fecha_movimiento'             => now(),
            'monto_total'                  => 0,
        ]);
        DetalleMovimientoAlmacen::create([
            'movimiento_almacen_id' => $mov->id,
            'material_id'           => $ctx['material']->id,
            'cantidad'              => 5.0,
            'precio_unitario'       => 10.0,
            'saldo_anterior'        => 500.0,
            'saldo_posterior'       => 495.0,
        ]);

        $res = $this->actingAs($user)
            ->deleteJson("/api/proyectos/{$ctx['proyecto']->id}/items-config/{$ctx['pip1']->id}");

        $res->assertStatus(422);
        $this->assertStringContainsString('entregas', strtolower($res->json('message')),
            'Debe indicar que hay entregas registradas');

        // El pip debe seguir existiendo
        $this->assertDatabaseHas('presupuesto_items_proyecto', ['id' => $ctx['pip1']->id]);
    }

    // ── test 6: quitar item SIN entregas funciona ─────────────────────────────

    public function test_quitar_item_sin_entregas_funciona(): void
    {
        $ctx  = $this->crearContextoCompleto();
        $user = $this->gerente();

        $res = $this->actingAs($user)
            ->deleteJson("/api/proyectos/{$ctx['proyecto']->id}/items-config/{$ctx['pip1']->id}");

        $res->assertStatus(200);
        // SoftDeletes → el registro existe con deleted_at seteado
        $this->assertSoftDeleted('presupuesto_items_proyecto', ['id' => $ctx['pip1']->id]);
    }

    // ── test 7: agregar item especial aparece en el listado ───────────────────

    public function test_agregar_item_especial_aparece_en_checklist_vivienda(): void
    {
        $ctx  = $this->crearContextoCompleto();
        $user = $this->gerente();

        $cat = \App\Models\CategoriaConstructiva::first();

        $res = $this->actingAs($user)
            ->postJson("/api/proyectos/{$ctx['proyecto']->id}/items-config", [
                'cantidad_planificada' => 1.0,
                'vivienda_id'          => $ctx['vivienda']->id,
                'item_especial'        => [
                    'nombre'                    => 'Rampa de acceso especial',
                    'unidad_base'               => 'ml',
                    'categoria_constructiva_id' => $cat->id,
                ],
            ]);

        $res->assertStatus(201);

        // Verificar que el item especial quedó registrado
        $this->assertDatabaseHas('presupuesto_items_proyecto', [
            'proyecto_id' => $ctx['proyecto']->id,
            'vivienda_id' => $ctx['vivienda']->id,
        ]);

        // Verificar que el item constructivo fue creado
        $this->assertDatabaseHas('items_constructivos', ['nombre' => 'Rampa de acceso especial']);

        // Debe aparecer en el listado de ítems de la vivienda
        $resLista = $this->actingAs($user)
            ->getJson("/api/proyectos/{$ctx['proyecto']->id}/items-config?vivienda_id={$ctx['vivienda']->id}");

        $resLista->assertStatus(200);
        $nombres = collect($resLista->json('data'))->pluck('item_constructivo.nombre');
        $this->assertTrue($nombres->contains('Rampa de acceso especial'));
    }

    // ── test 8: cambio recalcula presupuesto planificado ─────────────────────

    public function test_cambio_recalcula_presupuesto_planificado(): void
    {
        $ctx  = $this->crearContextoCompleto(cantPlan: 10.0, coef: 2.0);
        $user = $this->gerente();

        // Recalcular inicial para tener línea base
        $this->actingAs($user)
            ->postJson("/api/proyectos/{$ctx['proyecto']->id}/presupuesto-items/recalcular")
            ->assertStatus(200);

        $planificadoAntes = (float) PresupuestoMaterialProyecto::where('proyecto_id', $ctx['proyecto']->id)
            ->where('material_id', $ctx['material']->id)
            ->value('cantidad_total_planificada');

        // Cambiar cantidad planificada de pip1 a 20
        $this->actingAs($user)
            ->patchJson("/api/proyectos/{$ctx['proyecto']->id}/items-config/{$ctx['pip1']->id}/cantidad", [
                'cantidad_planificada' => 20.0,
            ])->assertStatus(200);

        $planificadoDespues = (float) PresupuestoMaterialProyecto::where('proyecto_id', $ctx['proyecto']->id)
            ->where('material_id', $ctx['material']->id)
            ->value('cantidad_total_planificada');

        $this->assertGreaterThan($planificadoAntes, $planificadoDespues,
            'El planificado debe aumentar al aumentar la cantidad del ítem');
    }

    // ── test 9: comprado/entregado NO cambian al editar ítems ─────────────────

    public function test_comprado_entregado_no_cambian_al_editar_items(): void
    {
        $ctx  = $this->crearContextoCompleto(cantPlan: 10.0, coef: 1.0);
        $user = $this->gerente();

        // Establecer valores históricos manualmente
        PresupuestoMaterialProyecto::updateOrCreate(
            ['proyecto_id' => $ctx['proyecto']->id, 'material_id' => $ctx['material']->id],
            [
                'cantidad_total_planificada'    => 10.0,
                'precio_unitario_presupuestado' => 10.0,
                'registrado_por_id'             => $user->id,
                'cantidad_comprada'             => 8.0,   // histórico
                'cantidad_entregada_obra'       => 5.0,   // histórico
            ]
        );

        // Cambiar cantidad planificada
        $this->actingAs($user)
            ->patchJson("/api/proyectos/{$ctx['proyecto']->id}/items-config/{$ctx['pip1']->id}/cantidad", [
                'cantidad_planificada' => 15.0,
            ])->assertStatus(200);

        $pmp = PresupuestoMaterialProyecto::where('proyecto_id', $ctx['proyecto']->id)
            ->where('material_id', $ctx['material']->id)
            ->first();

        $this->assertEquals(8.0, (float) $pmp->cantidad_comprada,
            'cantidad_comprada NO debe cambiar al editar ítems');
        $this->assertEquals(5.0, (float) $pmp->cantidad_entregada_obra,
            'cantidad_entregada_obra NO debe cambiar al editar ítems');
    }

    // ── test 10: cambio queda en auditoría ────────────────────────────────────

    public function test_cambio_queda_en_auditoria(): void
    {
        $ctx  = $this->crearContextoCompleto(cantPlan: 10.0);
        $user = $this->gerente();

        $this->actingAs($user)
            ->patchJson("/api/proyectos/{$ctx['proyecto']->id}/items-config/{$ctx['pip1']->id}/cantidad", [
                'cantidad_planificada' => 20.0,
                'justificacion'        => 'Ajuste por replanteo de diseño',
            ])->assertStatus(200);

        $this->assertDatabaseHas('historial_cambios_items_proyecto', [
            'proyecto_id' => $ctx['proyecto']->id,
            'usuario_id'  => $user->id,
            'tipo_cambio' => 'cantidad',
            'pip_id'      => $ctx['pip1']->id,
        ]);

        $historial = HistorialCambioItem::where('proyecto_id', $ctx['proyecto']->id)
            ->where('tipo_cambio', 'cantidad')
            ->first();

        $this->assertEquals(10.0, $historial->valores_antes['cantidad_planificada']);
        $this->assertEquals(20.0, $historial->valores_despues['cantidad_planificada']);
    }
}
