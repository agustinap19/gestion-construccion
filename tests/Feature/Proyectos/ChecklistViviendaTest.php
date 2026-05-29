<?php

namespace Tests\Feature\Proyectos;

use App\Models\CategoriaMaterial;
use App\Models\CategoriaConstructiva;
use App\Models\DetalleMovimientoAlmacen;
use App\Models\HistorialCambioItem;
use App\Models\ItemConstructivo;
use App\Models\Material;
use App\Models\MovimientoAlmacen;
use App\Models\OverrideItemProyecto;
use App\Models\Permiso;
use App\Models\PresupuestoItemProyecto;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\UnidadMedida;
use App\Models\User;
use App\Models\Vivienda;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChecklistViviendaTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function crearUsuarioConRol(string $rolNombre): User
    {
        $rol  = Rol::create(['nombre' => $rolNombre . '_' . uniqid(), 'nombre_visible' => $rolNombre]);
        $user = User::factory()->create(['debe_cambiar_password' => false]);
        $user->update(['rol_id' => $rol->id]);
        // Guardamos el nombre real para comparar con hasRole
        $rol->update(['nombre' => $rolNombre]);
        return $user->fresh();
    }

    private function crearContexto(int $cantItems = 1): array
    {
        $proyecto = Proyecto::create([
            'codigo'                   => 'PRJ-' . uniqid(),
            'nombre'                   => 'Proyecto Checklist Test',
            'categoria'                => 'social',
            'estado'                   => 'en_ejecucion',
            'prioridad'                => 'media',
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ]);

        $vivienda = Vivienda::create([
            'codigo'      => 'VIV-' . uniqid(),
            'proyecto_id' => $proyecto->id,
            'estado'      => 'planificada',
        ]);

        $cat = CategoriaConstructiva::firstOrCreate(
            ['nombre' => 'CatChk'],
            ['color'  => '#a855f7']
        );

        $pips = [];
        for ($i = 1; $i <= $cantItems; $i++) {
            $item = ItemConstructivo::create([
                'codigo'                    => 'ITM-CHK' . uniqid(),
                'nombre'                    => "Item Real $i",
                'unidad_base'               => 'm2',
                'categoria_constructiva_id' => $cat->id,
                'estado'                    => true,
            ]);

            $pip = PresupuestoItemProyecto::create([
                'proyecto_id'          => $proyecto->id,
                'vivienda_id'          => $vivienda->id,
                'item_constructivo_id' => $item->id,
                'cantidad_planificada' => 10.0,
                'ponderacion_avance'   => 10.0,
                'orden'                => $i,
                'estado_ejecucion'     => 'pendiente',
                'porcentaje_avance'    => 0,
            ]);

            $pips[] = ['pip' => $pip, 'item' => $item];
        }

        return compact('proyecto', 'vivienda', 'pips');
    }

    // ── Test 1: items reales, no categorías genéricas ─────────────────────────

    public function test_endpoint_retorna_items_reales_de_la_vivienda_no_categorias_genericas(): void
    {
        $ctx  = $this->crearContexto(cantItems: 9);
        $user = $this->crearUsuarioConRol('gerente');

        $res = $this->actingAs($user)
            ->getJson("/api/viviendas/{$ctx['vivienda']->id}/checklist");

        $res->assertStatus(200);
        $items = $res->json('items');
        $this->assertCount(9, $items);

        // Verifica que los nombres son los reales (no las categorías genéricas hardcodeadas)
        $nombres = collect($items)->pluck('nombre')->all();
        $this->assertContains('Item Real 1', $nombres);
        $this->assertContains('Item Real 9', $nombres);
        $this->assertNotContains('Replanteo y nivelación del terreno', $nombres);
        $this->assertNotContains('Excavación y cimentación', $nombres);
    }

    // ── Test 2: avance ponderado, no promedio simple ──────────────────────────

    public function test_avance_total_es_suma_ponderada_no_promedio_simple(): void
    {
        $proyecto = Proyecto::create([
            'codigo'                   => 'PRJ-PON-' . uniqid(),
            'nombre'                   => 'Proyecto Ponderación',
            'categoria'                => 'social',
            'estado'                   => 'en_ejecucion',
            'prioridad'                => 'media',
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ]);
        $vivienda = Vivienda::create([
            'codigo'      => 'VIV-PON-' . uniqid(),
            'proyecto_id' => $proyecto->id,
            'estado'      => 'planificada',
        ]);
        $cat = CategoriaConstructiva::firstOrCreate(['nombre' => 'CatPon'], ['color' => '#fff']);

        // 3 items con ponderaciones 10%, 30%, 60% — avances 100%, 50%, 0%
        // Avance ponderado = (100×10 + 50×30 + 0×60) / 100 = 25%
        // Promedio simple  = (100 + 50 + 0) / 3 ≈ 50%
        $configs = [
            ['pond' => 10.0, 'avance' => 100.0],
            ['pond' => 30.0, 'avance' => 50.0],
            ['pond' => 60.0, 'avance' => 0.0],
        ];
        foreach ($configs as $i => $cfg) {
            $item = ItemConstructivo::create([
                'codigo'                    => 'ITM-P' . uniqid(),
                'nombre'                    => "Item Pond $i",
                'unidad_base'               => 'm2',
                'categoria_constructiva_id' => $cat->id,
                'estado'                    => true,
            ]);
            PresupuestoItemProyecto::create([
                'proyecto_id'          => $proyecto->id,
                'vivienda_id'          => $vivienda->id,
                'item_constructivo_id' => $item->id,
                'cantidad_planificada' => 10.0,
                'ponderacion_avance'   => $cfg['pond'],
                'orden'                => $i + 1,
                'estado_ejecucion'     => $cfg['avance'] >= 100 ? 'terminado' : ($cfg['avance'] > 0 ? 'en_proceso' : 'pendiente'),
                'porcentaje_avance'    => $cfg['avance'],
            ]);
        }

        $user = $this->crearUsuarioConRol('gerente');
        $res  = $this->actingAs($user)
            ->getJson("/api/viviendas/{$vivienda->id}/checklist");

        $res->assertStatus(200);
        $avanceTotal = $res->json('vivienda.avance_total');
        $this->assertEquals(25.0, $avanceTotal, 'Debe ser 25% (suma ponderada), no 50% (promedio simple)');
    }

    // ── Test 3: marcar item al 100% → estado terminado ────────────────────────

    public function test_marcar_item_al_100_cambia_estado_a_terminado(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0]['pip'];
        $user = $this->crearUsuarioConRol('gerente');

        $res = $this->actingAs($user)
            ->patchJson("/api/viviendas/{$ctx['vivienda']->id}/checklist/{$pip->id}/avance", [
                'porcentaje_avance' => 100,
            ]);

        $res->assertStatus(200);
        $this->assertEquals('terminado', $pip->fresh()->estado_ejecucion);
        $this->assertEquals(100.0, (float) $pip->fresh()->porcentaje_avance);
    }

    // ── Test 4: marcar entre 1 y 99 → estado en_proceso ──────────────────────

    public function test_marcar_item_entre_1_y_99_cambia_estado_a_en_proceso(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0]['pip'];
        $user = $this->crearUsuarioConRol('gerente');

        $this->actingAs($user)
            ->patchJson("/api/viviendas/{$ctx['vivienda']->id}/checklist/{$pip->id}/avance", [
                'porcentaje_avance' => 50,
            ])
            ->assertStatus(200);

        $this->assertEquals('en_proceso', $pip->fresh()->estado_ejecucion);
    }

    // ── Test 5: marcar a 0 → estado pendiente ────────────────────────────────

    public function test_marcar_item_a_0_cambia_estado_a_pendiente(): void
    {
        $ctx = $this->crearContexto();
        $pip = $ctx['pips'][0]['pip'];
        $pip->update(['porcentaje_avance' => 50, 'estado_ejecucion' => 'en_proceso']);
        $user = $this->crearUsuarioConRol('gerente');

        $this->actingAs($user)
            ->patchJson("/api/viviendas/{$ctx['vivienda']->id}/checklist/{$pip->id}/avance", [
                'porcentaje_avance' => 0,
            ])
            ->assertStatus(200);

        $this->assertEquals('pendiente', $pip->fresh()->estado_ejecucion);
    }

    // ── Test 6: recalcula avance de la vivienda ───────────────────────────────

    public function test_marcar_avance_recalcula_avance_vivienda(): void
    {
        // 1 item con ponderación 20%, marcado al 100% → avance vivienda = 100%
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0]['pip'];
        $pip->update(['ponderacion_avance' => 20.0]);
        $user = $this->crearUsuarioConRol('gerente');

        $res = $this->actingAs($user)
            ->patchJson("/api/viviendas/{$ctx['vivienda']->id}/checklist/{$pip->id}/avance", [
                'porcentaje_avance' => 100,
            ]);

        $res->assertStatus(200);
        // Con 1 solo item al 100%, avance vivienda debe ser 100%
        $avanceViviendaRes = $res->json('avance_total');
        $avanceViviendaBd  = (float) $ctx['vivienda']->fresh()->porcentaje_avance;
        $this->assertEquals(100.0, $avanceViviendaRes);
        $this->assertEquals(100.0, $avanceViviendaBd);
    }

    // ── Test 7: recalcula avance del proyecto ─────────────────────────────────

    public function test_marcar_avance_recalcula_avance_proyecto(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0]['pip'];
        $user = $this->crearUsuarioConRol('gerente');

        $this->actingAs($user)
            ->patchJson("/api/viviendas/{$ctx['vivienda']->id}/checklist/{$pip->id}/avance", [
                'porcentaje_avance' => 100,
            ])
            ->assertStatus(200);

        $avanceProyecto = (float) $ctx['proyecto']->fresh()->avance_fisico;
        $this->assertGreaterThan(0, $avanceProyecto, 'El avance del proyecto debe ser mayor que 0 tras marcar un item');
    }

    // ── Test 8: advertencia con material insuficiente ─────────────────────────

    public function test_advertencia_si_avance_100_con_material_insuficiente(): void
    {
        $ctx = $this->crearContexto();
        $pip = $ctx['pips'][0]['pip'];
        $user = $this->crearUsuarioConRol('gerente');

        // Crear material real
        $catMat = CategoriaMaterial::firstOrCreate(['nombre' => 'CatAdv'], ['color' => '#fff']);
        $um     = UnidadMedida::firstOrCreate(['simbolo' => 'kg'], ['nombre' => 'Kilogramo', 'activa' => true]);
        $mat    = Material::create([
            'codigo'           => 'MAT-ADV-' . uniqid(),
            'nombre'           => 'Material Advertencia',
            'tipo'             => 'maestro',
            'estado'           => true,
            'categoria_id'     => $catMat->id,
            'unidad_medida_id' => $um->id,
        ]);

        // Override de receta: 1 kg por m2, planificado = 10 m2 → esperado = 10 kg
        OverrideItemProyecto::create([
            'proyecto_id'              => $ctx['proyecto']->id,
            'item_constructivo_id'     => $pip->item_constructivo_id,
            'material_id'              => $mat->id,
            'cantidad_por_unidad_base' => 1.0,
            'nivel'                    => 'tipologia',
            'justificacion'            => 'Override para test de advertencia',
        ]);

        // Movimiento de salida social con solo 5 kg entregados (50% < 80%)
        $mov = MovimientoAlmacen::create([
            'codigo'                       => 'MOV-ADV-' . uniqid(),
            'tipo'                         => 'salida_social',
            'estado'                       => 'completado',
            'proyecto_id'                  => $ctx['proyecto']->id,
            'presupuesto_item_proyecto_id' => $pip->id,
        ]);
        DetalleMovimientoAlmacen::create([
            'movimiento_almacen_id' => $mov->id,
            'material_id'           => $mat->id,
            'cantidad'              => 5.0,
            'precio_unitario'       => 10.0,
        ]);

        $res = $this->actingAs($user)
            ->patchJson("/api/viviendas/{$ctx['vivienda']->id}/checklist/{$pip->id}/avance", [
                'porcentaje_avance' => 100,
            ]);

        $res->assertStatus(200);
        $res->assertJsonPath('item.estado_ejecucion', 'terminado');
        $this->assertNotNull($res->json('advertencia'), 'Debe incluir advertencia por material insuficiente');
        $this->assertStringContainsString('50', $res->json('advertencia'));
    }

    // ── Test 9: usuario sin permiso no puede marcar avance ────────────────────

    public function test_usuario_sin_permiso_no_puede_marcar_avance(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0]['pip'];

        // Un usuario sin ningún rol
        $user = User::factory()->create(['debe_cambiar_password' => false]);

        $this->actingAs($user)
            ->patchJson("/api/viviendas/{$ctx['vivienda']->id}/checklist/{$pip->id}/avance", [
                'porcentaje_avance' => 50,
            ])
            ->assertStatus(403);

        // El PIP no debe haber cambiado
        $this->assertEquals(0.0, (float) $pip->fresh()->porcentaje_avance);
    }

    // ── Test 10: auditoría registra cambio de avance ──────────────────────────

    public function test_auditoria_registra_cambio_de_avance(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0]['pip'];
        $user = $this->crearUsuarioConRol('gerente');

        $this->actingAs($user)
            ->patchJson("/api/viviendas/{$ctx['vivienda']->id}/checklist/{$pip->id}/avance", [
                'porcentaje_avance' => 75,
                'observacion'       => 'Avance registrado en test',
            ])
            ->assertStatus(200);

        $historial = HistorialCambioItem::where('pip_id', $pip->id)
            ->where('tipo_cambio', 'avance')
            ->first();

        $this->assertNotNull($historial, 'Debe existir registro en auditoría');
        $this->assertEquals($user->id, $historial->usuario_id);
        $this->assertEquals(0.0, (float) $historial->valores_antes['porcentaje_avance'], 'Valor anterior debe ser 0');
        $this->assertEquals(75.0, (float) $historial->valores_despues['porcentaje_avance'], 'Valor nuevo debe ser 75');
        $this->assertEquals('Avance registrado en test', $historial->descripcion);
    }
}
