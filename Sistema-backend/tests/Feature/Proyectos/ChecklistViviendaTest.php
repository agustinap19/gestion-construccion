<?php

namespace Tests\Feature\Proyectos;

use App\Models\CategoriaConstructiva;
use App\Models\ItemConstructivo;
use App\Models\PresupuestoItemProyecto;
use App\Models\Proyecto;
use App\Models\Rol;
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

    // ── Test 3: el checklist es solo lectura (PATCH directo → 404/405) ─────────

    public function test_checklist_es_solo_lectura_patch_directo_no_existe(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0]['pip'];
        $user = $this->crearUsuarioConRol('gerente');

        // El avance solo se puede modificar via reportes fotográficos
        $res = $this->actingAs($user)
            ->patchJson("/api/viviendas/{$ctx['vivienda']->id}/checklist/{$pip->id}/avance", [
                'porcentaje_avance' => 100,
            ]);

        $this->assertContains($res->status(), [404, 405], 'El PATCH directo al avance debe estar deshabilitado');
        // El item no debe haber cambiado
        $this->assertEquals(0.0, (float) $pip->fresh()->porcentaje_avance);
    }

    // ── Test 4: checklist retorna campo puede_marcar_avance por rol ──────────

    public function test_checklist_retorna_puede_marcar_avance_segun_rol(): void
    {
        $ctx = $this->crearContexto();

        // Gerente → puede marcar
        $gerente = $this->crearUsuarioConRol('gerente');
        $res = $this->actingAs($gerente)
            ->getJson("/api/viviendas/{$ctx['vivienda']->id}/checklist");
        $res->assertStatus(200);
        $this->assertTrue($res->json('items.0.puede_marcar_avance'), 'El gerente debe poder marcar avance');

        // Usuario sin rol → no puede marcar
        $sinRol = User::factory()->create(['debe_cambiar_password' => false]);
        $res2 = $this->actingAs($sinRol)
            ->getJson("/api/viviendas/{$ctx['vivienda']->id}/checklist");
        $res2->assertStatus(200);
        $this->assertFalse($res2->json('items.0.puede_marcar_avance'), 'Un usuario sin rol no debe poder marcar avance');
    }

    // ── Test 5: checklist retorna cantidad de reportes por item ─────────────

    public function test_historial_de_reportes_disponible_por_vivienda(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0]['pip'];
        $user = $this->crearUsuarioConRol('gerente');
        $vid  = $ctx['vivienda']->id;

        // No hay reportes aún
        $res = $this->actingAs($user)
            ->getJson("/api/viviendas/{$vid}/reportes-avance?item_id={$pip->id}");
        $res->assertStatus(200);
        $this->assertCount(0, $res->json('data'));
    }

    // ── Test 6-10: eliminados — cubiertos por ReporteAvanceTest ─────────────
    // Los tests de marcado de avance y cascada están en ReporteAvanceTest.php
    // que usa el nuevo endpoint POST /viviendas/{id}/reportes-avance

}
