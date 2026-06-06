<?php

namespace Tests\Feature\Proyectos;

use App\Models\OverrideItemProyecto;
use App\Services\Almacenes\RecetaResolverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifica que RecetaResolverService respeta la jerarquía:
 *   vivienda > tipología > global
 * y que el endpoint receta-con-stock devuelve la fuente correcta.
 */
class SnapshotConsistenciaTest extends TestCase
{
    use RefreshDatabase, EditorItemsTestTrait;

    private RecetaResolverService $resolver;

    protected function setUp(): void
    {
        parent::setUp();
        $this->resolver = app(RecetaResolverService::class);
    }

    // ── test 1: usa override de vivienda cuando existe ────────────────────────

    public function test_modal_entrega_usa_override_vivienda_si_existe(): void
    {
        $ctx = $this->crearContextoCompleto(cantPlan: 10.0, coef: 1.5);

        // Override de vivienda: coef 3.0 para vivienda 1
        OverrideItemProyecto::create([
            'proyecto_id'              => $ctx['proyecto']->id,
            'item_constructivo_id'     => $ctx['item']->id,
            'material_id'              => $ctx['material']->id,
            'cantidad_por_unidad_base' => 3.0,
            'nivel'                    => 'vivienda',
            'vivienda_id'              => $ctx['vivienda']->id,
            'justificacion'            => 'Override vivienda test',
        ]);

        $receta = $this->resolver->resolver(
            $ctx['item']->id,
            $ctx['proyecto']->id,
            $ctx['vivienda']->id
        );

        $this->assertCount(1, $receta);
        $r = $receta->first();
        $this->assertEquals($ctx['material']->id, $r['material_id']);
        $this->assertEquals(3.0, $r['cantidad_por_unidad_base'], 'Debe usar el override de vivienda (3.0)');
        $this->assertEquals('vivienda', $r['fuente']);
    }

    // ── test 2: usa tipología si no hay override de vivienda ──────────────────

    public function test_modal_entrega_usa_override_tipologia_si_no_hay_vivienda(): void
    {
        $ctx = $this->crearContextoCompleto(cantPlan: 10.0, coef: 1.5);

        // Override de tipología: coef 2.5
        OverrideItemProyecto::create([
            'proyecto_id'              => $ctx['proyecto']->id,
            'item_constructivo_id'     => $ctx['item']->id,
            'material_id'              => $ctx['material']->id,
            'cantidad_por_unidad_base' => 2.5,
            'nivel'                    => 'tipologia',
            'vivienda_id'              => null,
            'justificacion'            => 'Override tipología test',
        ]);

        // Sin override de vivienda para vivienda 1 → debe usar tipología
        $receta = $this->resolver->resolver(
            $ctx['item']->id,
            $ctx['proyecto']->id,
            $ctx['vivienda']->id
        );

        $this->assertCount(1, $receta);
        $r = $receta->first();
        $this->assertEquals(2.5, $r['cantidad_por_unidad_base'], 'Debe usar el override de tipología (2.5)');
        $this->assertEquals('tipologia', $r['fuente']);
    }

    // ── test 3: usa snapshot (tipología) — el observer crea uno al crear el PIP ─
    // Nota: con el fix definitivo, al crear cualquier PIP se crea automáticamente
    // un snapshot tipología. Por eso la fuente es 'tipologia', no 'global'.
    // 'global' solo se alcanza si no existen ni PIPs ni overrides para el proyecto
    // (caso imposible en uso normal del sistema).

    public function test_modal_entrega_usa_snapshot_automatico_si_no_hay_overrides_manuales(): void
    {
        $ctx = $this->crearContextoCompleto(cantPlan: 10.0, coef: 1.5);

        // crearContextoCompleto crea PIPs → el observer los snapshoteó automáticamente
        // El resolver debe retornar el snapshot (tipología), NO el global
        $receta = $this->resolver->resolver(
            $ctx['item']->id,
            $ctx['proyecto']->id,
            $ctx['vivienda']->id
        );

        $this->assertCount(1, $receta);
        $r = $receta->first();
        $this->assertEquals(1.5, $r['cantidad_por_unidad_base'],
            'El snapshot debe tener el mismo coeficiente que la receta global al momento de crear el PIP (1.5)');
        $this->assertEquals('tipologia', $r['fuente'],
            'La fuente debe ser tipologia (snapshot auto-creado al crear el PIP), no global');
    }

    // ── test 3b: global SOLO cuando no hay PIP/snapshot ──────────────────────

    public function test_resolver_usa_global_cuando_no_hay_pip_ni_snapshot(): void
    {
        $ctx = $this->crearContextoCompleto(cantPlan: 10.0, coef: 1.5);

        // Usar un proyecto distinto que NO tiene PIP ni override → fallback global
        $otroProyecto = \App\Models\Proyecto::create([
            'codigo' => 'SIN-PIP-' . uniqid(), 'nombre' => 'Sin PIP',
            'categoria' => 'social', 'estado' => 'en_ejecucion', 'prioridad' => 'media',
            'fecha_inicio_planificada' => '2026-06-01', 'fecha_fin_planificada' => '2027-06-01',
        ]);

        $receta = $this->resolver->resolver(
            $ctx['item']->id,
            $otroProyecto->id,
            null // sin vivienda, sin PIP creado para este proyecto
        );

        $this->assertCount(1, $receta);
        $r = $receta->first();
        $this->assertEquals('global', $r['fuente'],
            'Sin PIP creado para este proyecto → debe caer al global');
    }

    // ── test 4: endpoint retorna fuente correcta ──────────────────────────────

    public function test_fuente_correcta_se_retorna_en_endpoint(): void
    {
        $ctx  = $this->crearContextoCompleto();
        $user = $this->crearUsuarioConPermisos(['presupuesto_materiales.ver', 'almacenes.ver']);

        // Crear override de tipología
        OverrideItemProyecto::create([
            'proyecto_id'              => $ctx['proyecto']->id,
            'item_constructivo_id'     => $ctx['item']->id,
            'material_id'              => $ctx['material']->id,
            'cantidad_por_unidad_base' => 2.2,
            'nivel'                    => 'tipologia',
            'vivienda_id'              => null,
            'justificacion'            => 'Test fuente endpoint',
        ]);

        $res = $this->actingAs($user)
            ->getJson("/api/presupuesto-items-proyecto/{$ctx['pip1']->id}/receta-con-stock/{$ctx['almacen']->id}");

        $res->assertStatus(200);
        $data = $res->json('data');
        $this->assertNotEmpty($data);
        $r = $data[0];

        $this->assertArrayHasKey('fuente', $r, 'El endpoint debe retornar el campo fuente');
        $this->assertEquals('tipologia', $r['fuente'], 'La fuente debe ser tipologia (no global)');
        $this->assertEquals(2.2, $r['cantidad_por_unidad_base']);
    }

    // ── test bonus: jerarquía vivienda > tipología ────────────────────────────

    public function test_override_vivienda_tiene_precedencia_sobre_tipologia(): void
    {
        $ctx = $this->crearContextoCompleto();

        // Override tipología: 2.5
        OverrideItemProyecto::create([
            'proyecto_id'              => $ctx['proyecto']->id,
            'item_constructivo_id'     => $ctx['item']->id,
            'material_id'              => $ctx['material']->id,
            'cantidad_por_unidad_base' => 2.5,
            'nivel'                    => 'tipologia',
            'vivienda_id'              => null,
            'justificacion'            => 'tipologia',
        ]);

        // Override vivienda 1: 4.0
        OverrideItemProyecto::create([
            'proyecto_id'              => $ctx['proyecto']->id,
            'item_constructivo_id'     => $ctx['item']->id,
            'material_id'              => $ctx['material']->id,
            'cantidad_por_unidad_base' => 4.0,
            'nivel'                    => 'vivienda',
            'vivienda_id'              => $ctx['vivienda']->id,
            'justificacion'            => 'vivienda',
        ]);

        // Vivienda 1 → debe usar 4.0 (vivienda override)
        $receta1 = $this->resolver->resolver($ctx['item']->id, $ctx['proyecto']->id, $ctx['vivienda']->id);
        $this->assertEquals(4.0, $receta1->first()['cantidad_por_unidad_base'], 'Vivienda 1 debe usar override vivienda (4.0)');
        $this->assertEquals('vivienda', $receta1->first()['fuente']);

        // Vivienda 2 → debe usar 2.5 (tipología override, no tiene vivienda override)
        $receta2 = $this->resolver->resolver($ctx['item']->id, $ctx['proyecto']->id, $ctx['vivienda2']->id);
        $this->assertEquals(2.5, $receta2->first()['cantidad_por_unidad_base'], 'Vivienda 2 debe usar override tipología (2.5)');
        $this->assertEquals('tipologia', $receta2->first()['fuente']);
    }
}
