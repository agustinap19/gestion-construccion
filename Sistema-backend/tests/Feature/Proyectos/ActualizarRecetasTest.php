<?php

namespace Tests\Feature\Proyectos;

use App\Models\HistorialCambioItem;
use App\Models\OverrideItemProyecto;
use App\Models\PresupuestoItemProyecto;
use App\Services\Almacenes\RecetaResolverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActualizarRecetasTest extends TestCase
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

    // ── test 1: actualizar recetas limpia overrides de tipología ─────────────

    public function test_actualizar_recetas_limpia_overrides_tipologia(): void
    {
        $ctx     = $this->crearContextoCompleto();
        $gerente = $this->gerente();
        $pId     = $ctx['proyecto']->id;

        // Crear override de tipología
        OverrideItemProyecto::create([
            'proyecto_id'              => $pId,
            'item_constructivo_id'     => $ctx['item']->id,
            'material_id'              => $ctx['material']->id,
            'cantidad_por_unidad_base' => 9.9,
            'nivel'                    => 'tipologia',
            'vivienda_id'              => null,
            'justificacion'            => 'Override tipología a limpiar',
        ]);

        $res = $this->actingAs($gerente)
            ->postJson("/api/proyectos/{$pId}/items-config/actualizar-recetas");

        $res->assertStatus(200);

        // Override de tipología debe haber sido eliminado
        $this->assertDatabaseMissing('overrides_items_proyecto', [
            'proyecto_id' => $pId,
            'nivel'       => 'tipologia',
        ]);

        // Verificar que ahora usa la receta global
        $resolver = app(RecetaResolverService::class);
        $receta   = $resolver->resolver($ctx['item']->id, $pId, $ctx['vivienda']->id);
        $this->assertEquals('global', $receta->first()['fuente'],
            'Tras actualizar recetas, debe usarse la receta global');
    }

    // ── test 2: actualizar recetas NO toca overrides de vivienda ─────────────

    public function test_actualizar_recetas_no_toca_overrides_vivienda_individual(): void
    {
        $ctx     = $this->crearContextoCompleto();
        $gerente = $this->gerente();
        $pId     = $ctx['proyecto']->id;

        // Override de tipología (debe eliminarse)
        OverrideItemProyecto::create([
            'proyecto_id'              => $pId,
            'item_constructivo_id'     => $ctx['item']->id,
            'material_id'              => $ctx['material']->id,
            'cantidad_por_unidad_base' => 7.7,
            'nivel'                    => 'tipologia',
            'vivienda_id'              => null,
            'justificacion'            => 'tipología',
        ]);

        // Override de vivienda (NO debe eliminarse)
        OverrideItemProyecto::create([
            'proyecto_id'              => $pId,
            'item_constructivo_id'     => $ctx['item']->id,
            'material_id'              => $ctx['material']->id,
            'cantidad_por_unidad_base' => 5.5,
            'nivel'                    => 'vivienda',
            'vivienda_id'              => $ctx['vivienda']->id,
            'justificacion'            => 'vivienda individual',
        ]);

        $this->actingAs($gerente)
            ->postJson("/api/proyectos/{$pId}/items-config/actualizar-recetas")
            ->assertStatus(200);

        // Override de vivienda debe seguir existiendo
        $this->assertDatabaseHas('overrides_items_proyecto', [
            'proyecto_id' => $pId,
            'nivel'       => 'vivienda',
            'vivienda_id' => $ctx['vivienda']->id,
        ]);

        // Verificar jerarquía: vivienda 1 sigue con 5.5
        $resolver = app(RecetaResolverService::class);
        $receta   = $resolver->resolver($ctx['item']->id, $pId, $ctx['vivienda']->id);
        $this->assertEquals(5.5, $receta->first()['cantidad_por_unidad_base'],
            'El override de vivienda individual debe conservarse');
        $this->assertEquals('vivienda', $receta->first()['fuente']);
    }

    // ── test 3: preview muestra impacto correcto ──────────────────────────────

    public function test_preview_muestra_impacto_correcto_antes_de_confirmar(): void
    {
        $ctx     = $this->crearContextoCompleto(cantPlan: 10.0, coef: 2.0);
        $gerente = $this->gerente();

        $res = $this->actingAs($gerente)
            ->postJson("/api/proyectos/{$ctx['proyecto']->id}/items-config/preview-impacto", [
                'item_constructivo_id' => $ctx['item']->id,
                'cantidad_nueva'       => 15.0,
                'vivienda_id'          => $ctx['vivienda']->id,
            ]);

        $res->assertStatus(200);
        $data = $res->json('data');
        $this->assertNotEmpty($data);

        $r = $data[0];
        $this->assertEquals($ctx['material']->id, $r['material_id']);
        $this->assertEquals(2.0, $r['coeficiente']);
        // 15 × 2.0 = 30
        $this->assertEquals(30.0, $r['cantidad_nueva_total'],
            'El preview debe calcular 15 × 2.0 = 30');
    }

    // ── test 4: solo gerente puede ejecutar actualizar-recetas ───────────────

    public function test_solo_gerente_puede_confirmar_actualizar_recetas(): void
    {
        $ctx  = $this->crearContextoCompleto();
        $pId  = $ctx['proyecto']->id;

        // Admin proyecto (sin bloquear permiso)
        $adminProyecto = $this->crearUsuarioConPermisos([
            'presupuesto_materiales.ver',
            'presupuesto_materiales.gestionar',
            'overrides_receta.aprobar',
        ]);

        $this->actingAs($adminProyecto)
            ->postJson("/api/proyectos/{$pId}/items-config/actualizar-recetas")
            ->assertStatus(403);

        // Gerente con presupuesto_materiales.bloquear → puede
        $gerente = $this->crearUsuarioConPermisos([
            'presupuesto_materiales.ver',
            'presupuesto_materiales.gestionar',
            'presupuesto_materiales.bloquear',
        ]);

        $this->actingAs($gerente)
            ->postJson("/api/proyectos/{$pId}/items-config/actualizar-recetas")
            ->assertStatus(200);

        // Queda en auditoría
        $this->assertDatabaseHas('historial_cambios_items_proyecto', [
            'proyecto_id' => $pId,
            'tipo_cambio' => 'actualizar_recetas',
            'usuario_id'  => $gerente->id,
        ]);
    }
}
