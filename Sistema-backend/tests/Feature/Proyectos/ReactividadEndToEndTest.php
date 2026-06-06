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
 * End-to-end scenarios for financial reactivity.
 * Each test simulates a real workflow from project creation to data update.
 */
class ReactividadEndToEndTest extends TestCase
{
    use RefreshDatabase;

    private function usuario(): User
    {
        $rol = Rol::firstOrCreate(
            ['nombre' => 'gerente'],
            ['nombre_visible' => 'Gerente', 'es_sistema' => true, 'estado' => 'activo']
        );
        return User::create([
            'nombre'           => 'E2E',
            'apellido_paterno' => 'Test',
            'ci'               => 'CI-' . uniqid(),
            'email'            => 'e2e-' . uniqid() . '@test.com',
            'password'         => bcrypt('pass'),
            'rol_id'           => $rol->id,
            'estado'           => 'activo',
            'es_admin_central' => true,
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

    /**
     * E2E: Create project → edit porcentajes → verify all downstream fields updated.
     */
    public function test_e2e_crear_proyecto_editar_porcentajes_verificar_todo(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = EntidadEstatal::create(['nombre' => 'Entidad E2E', 'nivel' => 'municipal', 'estado' => 'activa']);

        // Step 1: Create project
        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto E2E Completo',
            'categoria'                => 'social',
            'monto_contractual'        => 2_000_000.0,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-12-31',
            'prioridad'                => 'alta',
        ])->assertCreated();

        $proyecto = Proyecto::latest()->first();

        // Step 2: Verify initial state
        $this->assertEquals(30.0, (float) $proyecto->porcentaje_mano_obra);
        $this->assertEquals(600_000.0, round((float) $proyecto->presupuesto_mano_obra, 2));
        $this->assertEquals('saludable', $proyecto->salud_financiera);

        // Step 3: Edit porcentajes
        $this->actingAs($user)->patchJson("/api/proyectos/{$proyecto->id}/porcentajes-financieros", [
            'porcentaje_mano_obra'         => 20,
            'porcentaje_gastos_generales'  => 8,
            'porcentaje_utilidad_esperada' => 10,
        ])->assertOk();

        $proyecto->refresh();

        // Step 4: Verify new state
        $this->assertEquals(20.0,     (float) $proyecto->porcentaje_mano_obra);
        $this->assertEquals(400_000.0, round((float) $proyecto->presupuesto_mano_obra, 2));
        $this->assertEquals(160_000.0, round((float) $proyecto->presupuesto_gastos_generales, 2));
        $this->assertEquals(200_000.0, round((float) $proyecto->presupuesto_utilidad_esperada, 2));
        // materiales = 2_000_000 - 400_000 - 160_000 - 200_000 = 1_240_000
        $this->assertEquals(1_240_000.0, round((float) $proyecto->presupuesto_materiales, 2));
        // util = 200_000 / 2_000_000 * 100 = 10% → saludable (>= 5+5=10% threshold)
        $this->assertEquals('saludable', $proyecto->salud_financiera);

        // Step 5: HitoCobro amounts updated
        $hitos = HitoCobro::where('proyecto_id', $proyecto->id)->get();
        foreach ($hitos as $hito) {
            $expected = 2_000_000 * ((float) $hito->porcentaje_contrato / 100);
            $this->assertEquals(round($expected, 2), round((float) $hito->monto_calculado, 2));
        }
    }

    /**
     * E2E: Create project → add items → assign to products → verify matrix.
     */
    public function test_e2e_crear_proyecto_asignar_items_verificar_matriz(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = EntidadEstatal::create(['nombre' => 'Entidad Items E2E', 'nivel' => 'municipal', 'estado' => 'activa']);

        // Create project
        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto Items E2E',
            'categoria'                => 'social',
            'monto_contractual'        => 500_000.0,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'prioridad'                => 'media',
        ])->assertCreated();

        $proyecto = Proyecto::latest()->first();
        $hitos    = HitoCobro::where('proyecto_id', $proyecto->id)->orderBy('orden')->get();
        $this->assertCount(4, $hitos);

        // Create items manually
        $cat = CategoriaConstructiva::create(['nombre' => 'Acabados-' . substr(uniqid(), -4), 'color' => '#34d399']);
        $item = ItemConstructivo::create([
            'nombre'                    => 'Pintura de paredes',
            'codigo'                    => 'PT' . substr(uniqid(), -8),
            'unidad_base'               => 'm2',
            'categoria_constructiva_id' => $cat->id,
            'estado'                    => true,
        ]);

        $pip = PresupuestoItemProyecto::create([
            'proyecto_id'          => $proyecto->id,
            'item_constructivo_id' => $item->id,
            'cantidad_planificada' => 100.0,
            'orden'                => 1,
        ]);

        // Assign to Producto 1
        $this->actingAs($user)->patchJson("/api/proyectos/{$proyecto->id}/items/{$pip->id}/producto-contractual", [
            'hito_cobro_id' => $hitos->first()->id,
        ])->assertOk();

        // Verify via GET matrix
        $response = $this->actingAs($user)->getJson("/api/proyectos/{$proyecto->id}/matriz-items-productos");
        $response->assertOk();

        $this->assertEquals(1, $response->json('data.totales.items_asignados'));
        $this->assertEquals(0, $response->json('data.totales.items_sin_asignar'));
    }

    /**
     * E2E: Switch from % to monto fijo mode and back.
     */
    public function test_e2e_toggle_monto_fijo_y_back_a_porcentaje(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = EntidadEstatal::create(['nombre' => 'Entidad Toggle', 'nivel' => 'municipal', 'estado' => 'activa']);

        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto Toggle MO',
            'categoria'                => 'social',
            'monto_contractual'        => 1_000_000.0,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'prioridad'                => 'media',
        ])->assertCreated();

        $proyecto = Proyecto::latest()->first();
        $this->assertEquals(300_000.0, round((float) $proyecto->presupuesto_mano_obra, 2));

        // Switch to monto fijo
        $this->actingAs($user)->patchJson("/api/proyectos/{$proyecto->id}/porcentajes-financieros", [
            'usa_monto_fijo_mo'             => true,
            'presupuesto_mano_obra'         => 250_000,
            'porcentaje_gastos_generales'   => 12,
            'porcentaje_utilidad_esperada'  => 15,
        ])->assertOk();

        $proyecto->refresh();
        $this->assertEquals(250_000.0, round((float) $proyecto->presupuesto_mano_obra, 2));
        $this->assertTrue((bool) $proyecto->usa_monto_fijo_mo);

        // Switch back to porcentaje
        $this->actingAs($user)->patchJson("/api/proyectos/{$proyecto->id}/porcentajes-financieros", [
            'usa_monto_fijo_mo'            => false,
            'porcentaje_mano_obra'         => 35,
            'porcentaje_gastos_generales'  => 12,
            'porcentaje_utilidad_esperada' => 15,
        ])->assertOk();

        $proyecto->refresh();
        $this->assertEquals(350_000.0, round((float) $proyecto->presupuesto_mano_obra, 2));
        $this->assertFalse((bool) $proyecto->usa_monto_fijo_mo);
    }
}
