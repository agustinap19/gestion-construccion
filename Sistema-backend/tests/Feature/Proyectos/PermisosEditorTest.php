<?php

namespace Tests\Feature\Proyectos;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermisosEditorTest extends TestCase
{
    use RefreshDatabase, EditorItemsTestTrait;

    // ── test 1: admin proyecto puede ver el editor ────────────────────────────

    public function test_admin_proyecto_puede_ver_editor(): void
    {
        $ctx  = $this->crearContextoCompleto();
        $user = $this->crearUsuarioConPermisos(['presupuesto_materiales.ver']);

        $res = $this->actingAs($user)
            ->getJson("/api/proyectos/{$ctx['proyecto']->id}/items-config");

        $res->assertStatus(200);
        $this->assertNotEmpty($res->json('data'));
    }

    // ── test 2: admin proyecto NO puede cambiar recetas ───────────────────────

    public function test_admin_proyecto_no_puede_cambiar_recetas(): void
    {
        $ctx  = $this->crearContextoCompleto();
        $user = $this->crearUsuarioConPermisos(['presupuesto_materiales.ver', 'presupuesto_materiales.gestionar']);
        // Sin 'overrides_receta.aprobar'

        $res = $this->actingAs($user)
            ->putJson("/api/proyectos/{$ctx['proyecto']->id}/items-config/override-tipologia", [
                'item_constructivo_id' => $ctx['item']->id,
                'justificacion'        => 'Intento sin permiso',
                'materiales'           => [['material_id' => $ctx['material']->id, 'cantidad_por_unidad_base' => 9.9]],
            ]);

        $res->assertStatus(403);
    }

    // ── test 3: gerente puede cambiar recetas ─────────────────────────────────

    public function test_gerente_puede_cambiar_recetas(): void
    {
        $ctx     = $this->crearContextoCompleto();
        $gerente = $this->crearUsuarioConPermisos([
            'presupuesto_materiales.ver',
            'presupuesto_materiales.gestionar',
            'overrides_receta.aprobar',
        ]);

        $res = $this->actingAs($gerente)
            ->putJson("/api/proyectos/{$ctx['proyecto']->id}/items-config/override-tipologia", [
                'item_constructivo_id' => $ctx['item']->id,
                'justificacion'        => 'Cambio autorizado por gerente',
                'materiales'           => [['material_id' => $ctx['material']->id, 'cantidad_por_unidad_base' => 3.0]],
            ]);

        $res->assertStatus(200);

        $this->assertDatabaseHas('overrides_items_proyecto', [
            'proyecto_id'              => $ctx['proyecto']->id,
            'item_constructivo_id'     => $ctx['item']->id,
            'material_id'              => $ctx['material']->id,
            'nivel'                    => 'tipologia',
        ]);
    }

    // ── test 4: usuario sin permiso no puede acceder al editor ───────────────

    public function test_usuario_sin_permiso_no_puede_acceder_al_editor(): void
    {
        $ctx     = $this->crearContextoCompleto();
        $sinPerm = $this->crearUsuarioConPermisos([]); // sin ningún permiso

        $this->actingAs($sinPerm)
            ->getJson("/api/proyectos/{$ctx['proyecto']->id}/items-config")
            ->assertStatus(403);

        $this->actingAs($sinPerm)
            ->patchJson("/api/proyectos/{$ctx['proyecto']->id}/items-config/{$ctx['pip1']->id}/cantidad", [
                'cantidad_planificada' => 5.0,
            ])->assertStatus(403);

        $this->actingAs($sinPerm)
            ->deleteJson("/api/proyectos/{$ctx['proyecto']->id}/items-config/{$ctx['pip1']->id}")
            ->assertStatus(403);
    }
}
