<?php

namespace Tests\Feature\Proyectos;

use App\Models\CategoriaConstructiva;
use App\Models\ConfiguracionPorcentajesPresupuesto;
use App\Models\EntidadEstatal;
use App\Models\HitoCobro;
use App\Models\ItemConstructivo;
use App\Models\PresupuestoItemProyecto;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests for matriz-items-productos endpoints.
 */
class MatrizItemsProductosTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function usuario(): User
    {
        $rol = Rol::firstOrCreate(
            ['nombre' => 'gerente'],
            ['nombre_visible' => 'Gerente', 'es_sistema' => true, 'estado' => 'activo']
        );
        return User::create([
            'nombre'           => 'Matriz',
            'apellido_paterno' => 'Test',
            'ci'               => 'CI-' . uniqid(),
            'email'            => 'mat-' . uniqid() . '@test.com',
            'password'         => bcrypt('pass'),
            'rol_id'           => $rol->id,
            'estado'           => 'activo',
            'es_admin_central' => true,
        ]);
    }

    private function entidad(): EntidadEstatal
    {
        return EntidadEstatal::create([
            'nombre' => 'Entidad ' . uniqid(),
            'nivel'  => 'municipal',
            'estado' => 'activa',
        ]);
    }

    private function configSocial(): ConfiguracionPorcentajesPresupuesto
    {
        return ConfiguracionPorcentajesPresupuesto::firstOrCreate(
            ['tipo_proyecto' => 'social'],
            [
                'porcentaje_mano_obra'         => 30.00,
                'porcentaje_gastos_generales'  => 12.00,
                'porcentaje_utilidad_esperada' => 15.00,
                'umbral_rentabilidad_minima'   => 5.00,
            ]
        );
    }

    private function crearProyectoConItems(User $user, EntidadEstatal $entidad): array
    {
        // Create project
        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto Matriz ' . uniqid(),
            'categoria'                => 'social',
            'monto_contractual'        => 1_000_000.0,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'prioridad'                => 'media',
        ])->assertCreated();

        $proyecto = Proyecto::latest()->first();

        // Create a categoria constructiva
        $categoria = CategoriaConstructiva::create([
            'nombre' => 'Estructural-' . substr(uniqid(), -4),
            'color'  => '#60a5fa',
        ]);

        // Create item constructivo
        $item1 = ItemConstructivo::create([
            'nombre'                    => 'Muro de ladrillo',
            'codigo'                    => 'IT' . substr(uniqid(), -8),
            'unidad_base'               => 'm2',
            'categoria_constructiva_id' => $categoria->id,
            'estado'                    => true,
        ]);
        $item2 = ItemConstructivo::create([
            'nombre'                    => 'Columna hormigón',
            'codigo'                    => 'IT' . substr(uniqid(), -8),
            'unidad_base'               => 'ml',
            'categoria_constructiva_id' => $categoria->id,
            'estado'                    => true,
        ]);

        // Create PresupuestoItemProyecto records
        $pip1 = PresupuestoItemProyecto::create([
            'proyecto_id'          => $proyecto->id,
            'item_constructivo_id' => $item1->id,
            'cantidad_planificada' => 50.0,
            'orden'                => 1,
        ]);
        $pip2 = PresupuestoItemProyecto::create([
            'proyecto_id'          => $proyecto->id,
            'item_constructivo_id' => $item2->id,
            'cantidad_planificada' => 20.0,
            'orden'                => 2,
        ]);

        $hitos = HitoCobro::where('proyecto_id', $proyecto->id)->orderBy('orden')->get();

        return compact('proyecto', 'pip1', 'pip2', 'hitos');
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    /**
     * GET matriz returns correct structure with items and hitos.
     */
    public function test_get_matriz_retorna_estructura_correcta(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();
        ['proyecto' => $proyecto, 'pip1' => $pip1, 'pip2' => $pip2, 'hitos' => $hitos] = $this->crearProyectoConItems($user, $entidad);

        $response = $this->actingAs($user)->getJson("/api/proyectos/{$proyecto->id}/matriz-items-productos");

        $response->assertOk()
            ->assertJsonFragment(['status' => 'success'])
            ->assertJsonPath('data.totales.items_total', 2)
            ->assertJsonPath('data.totales.items_sin_asignar', 2);

        $this->assertCount(4, $response->json('data.hitos')); // 4 default social products
    }

    /**
     * PATCH assigns an item to a hito_cobro correctly.
     */
    public function test_patch_asignar_item_a_producto(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();
        ['proyecto' => $proyecto, 'pip1' => $pip1, 'hitos' => $hitos] = $this->crearProyectoConItems($user, $entidad);

        $hito = $hitos->first();

        $this->actingAs($user)->patchJson("/api/proyectos/{$proyecto->id}/items/{$pip1->id}/producto-contractual", [
            'hito_cobro_id' => $hito->id,
        ])->assertOk()->assertJsonFragment(['status' => 'success']);

        $pip1->refresh();
        $this->assertEquals($hito->id, $pip1->hito_cobro_id);
    }

    /**
     * PATCH unassigns item (hito_cobro_id = null).
     */
    public function test_patch_desasignar_item(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();
        ['proyecto' => $proyecto, 'pip1' => $pip1, 'hitos' => $hitos] = $this->crearProyectoConItems($user, $entidad);

        // First assign
        $pip1->hito_cobro_id = $hitos->first()->id;
        $pip1->save();

        // Then unassign
        $this->actingAs($user)->patchJson("/api/proyectos/{$proyecto->id}/items/{$pip1->id}/producto-contractual", [
            'hito_cobro_id' => null,
        ])->assertOk();

        $pip1->refresh();
        $this->assertNull($pip1->hito_cobro_id);
    }

    /**
     * PATCH cantidad updates cantidad_planificada.
     */
    public function test_patch_cantidad_actualiza_item(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();
        ['proyecto' => $proyecto, 'pip1' => $pip1] = $this->crearProyectoConItems($user, $entidad);

        $this->actingAs($user)->patchJson("/api/proyectos/{$proyecto->id}/items/{$pip1->id}/cantidad", [
            'cantidad_planificada' => 75.5,
        ])->assertOk()->assertJsonFragment(['status' => 'success']);

        $pip1->refresh();
        $this->assertEquals(75.5, (float) $pip1->cantidad_planificada);
    }

    /**
     * POST asignacion-automatica distributes all items across available products.
     */
    public function test_post_asignacion_automatica_distribuye_items(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();
        ['proyecto' => $proyecto, 'pip1' => $pip1, 'pip2' => $pip2, 'hitos' => $hitos] = $this->crearProyectoConItems($user, $entidad);

        $this->actingAs($user)->postJson("/api/proyectos/{$proyecto->id}/items/asignacion-automatica")
            ->assertOk()
            ->assertJsonFragment(['status' => 'success']);

        // Both items should now be assigned
        $pip1->refresh();
        $pip2->refresh();
        $this->assertNotNull($pip1->hito_cobro_id);
        $this->assertNotNull($pip2->hito_cobro_id);
    }

    /**
     * After auto-assignment, GET matriz shows 0 unassigned items.
     */
    public function test_get_matriz_despues_de_asignacion_automatica(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();
        ['proyecto' => $proyecto] = $this->crearProyectoConItems($user, $entidad);

        $this->actingAs($user)->postJson("/api/proyectos/{$proyecto->id}/items/asignacion-automatica")->assertOk();

        $response = $this->actingAs($user)->getJson("/api/proyectos/{$proyecto->id}/matriz-items-productos");
        $response->assertOk();
        $this->assertEquals(0, $response->json('data.totales.items_sin_asignar'));
        $this->assertEquals(2, $response->json('data.totales.items_asignados'));
    }
}
