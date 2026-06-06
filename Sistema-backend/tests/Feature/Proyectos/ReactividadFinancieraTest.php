<?php

namespace Tests\Feature\Proyectos;

use App\Models\Cliente;
use App\Models\ConfiguracionPorcentajesPresupuesto;
use App\Models\EntidadEstatal;
use App\Models\HitoCobro;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests for PATCH /api/proyectos/{id}/porcentajes-financieros
 * Covers the inline editable SaludFinancieraCard backend.
 */
class ReactividadFinancieraTest extends TestCase
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
            'nombre'           => 'Reactivo',
            'apellido_paterno' => 'Test',
            'ci'               => 'CI-' . uniqid(),
            'email'            => 'react-' . uniqid() . '@test.com',
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

    private function crearProyectoSocial(User $user, EntidadEstatal $entidad, float $monto = 1_000_000): Proyecto
    {
        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto Reactivo ' . uniqid(),
            'categoria'                => 'social',
            'monto_contractual'        => $monto,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'prioridad'                => 'media',
        ])->assertCreated();

        return Proyecto::latest()->first();
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    /**
     * Updating porcentajes recalculates all budget fields correctly.
     */
    public function test_patch_porcentajes_recalcula_presupuesto(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();
        $proyecto = $this->crearProyectoSocial($user, $entidad);

        // Change to 25% MO, 10% GG, 12% Util
        $this->actingAs($user)->patchJson("/api/proyectos/{$proyecto->id}/porcentajes-financieros", [
            'porcentaje_mano_obra'         => 25,
            'porcentaje_gastos_generales'  => 10,
            'porcentaje_utilidad_esperada' => 12,
        ])->assertOk()->assertJsonFragment(['status' => 'success']);

        $proyecto->refresh();
        $monto = 1_000_000.0;

        $this->assertEquals(250_000.0, round((float) $proyecto->presupuesto_mano_obra, 2));
        $this->assertEquals(100_000.0, round((float) $proyecto->presupuesto_gastos_generales, 2));
        $this->assertEquals(120_000.0, round((float) $proyecto->presupuesto_utilidad_esperada, 2));
        // materiales = 1_000_000 - 250_000 - 100_000 - 120_000 = 530_000
        $this->assertEquals(530_000.0, round((float) $proyecto->presupuesto_materiales, 2));
    }

    /**
     * Updating porcentajes also recalculates monto_calculado on HitoCobro records.
     */
    public function test_patch_porcentajes_recalcula_hitos_cobro(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();
        $proyecto = $this->crearProyectoSocial($user, $entidad, 800_000);

        // Project should have 4 default hitos (25% each)
        $hitosBefore = HitoCobro::where('proyecto_id', $proyecto->id)->get();
        $this->assertCount(4, $hitosBefore);
        $this->assertEquals(200_000.0, round((float) $hitosBefore->first()->monto_calculado, 2));

        // No change to percentages needed — just trigger recalc
        $this->actingAs($user)->patchJson("/api/proyectos/{$proyecto->id}/porcentajes-financieros", [
            'porcentaje_mano_obra'         => 30,
            'porcentaje_gastos_generales'  => 12,
            'porcentaje_utilidad_esperada' => 15,
        ])->assertOk();

        // After recalc, each hito still 25% of 800_000 = 200_000
        $hitosAfter = HitoCobro::where('proyecto_id', $proyecto->id)->get();
        foreach ($hitosAfter as $hito) {
            $this->assertEquals(200_000.0, round((float) $hito->monto_calculado, 2));
        }
    }

    /**
     * salud_financiera is updated after patch.
     */
    public function test_patch_porcentajes_actualiza_salud_financiera(): void
    {
        $this->configSocial(); // umbral = 5%
        $user    = $this->usuario();
        $entidad = $this->entidad();
        $proyecto = $this->crearProyectoSocial($user, $entidad);

        // Set util to 3% (below umbral=5%) — requires justification
        $this->actingAs($user)->patchJson("/api/proyectos/{$proyecto->id}/porcentajes-financieros", [
            'porcentaje_mano_obra'            => 30,
            'porcentaje_gastos_generales'     => 12,
            'porcentaje_utilidad_esperada'    => 3,
            'justificacion_rentabilidad_baja' => 'Proyecto prioritario de alto impacto social',
        ])->assertOk();

        $proyecto->refresh();
        $this->assertEquals('critico', $proyecto->salud_financiera);
    }

    /**
     * Without justification when below umbral → 422.
     */
    public function test_patch_porcentajes_baja_rentabilidad_sin_justificacion_retorna_422(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();
        $proyecto = $this->crearProyectoSocial($user, $entidad);

        $this->actingAs($user)->patchJson("/api/proyectos/{$proyecto->id}/porcentajes-financieros", [
            'porcentaje_mano_obra'         => 30,
            'porcentaje_gastos_generales'  => 12,
            'porcentaje_utilidad_esperada' => 2, // 2% < 5% umbral
        ])->assertUnprocessable()
          ->assertJsonValidationErrors(['justificacion_rentabilidad_baja']);
    }

    /**
     * Monto fijo mode: fixed amount overrides percentage calculation.
     */
    public function test_patch_monto_fijo_mo_usa_monto_absoluto(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();
        $proyecto = $this->crearProyectoSocial($user, $entidad, 1_000_000);

        $this->actingAs($user)->patchJson("/api/proyectos/{$proyecto->id}/porcentajes-financieros", [
            'usa_monto_fijo_mo'             => true,
            'presupuesto_mano_obra'         => 280_000,
            'porcentaje_gastos_generales'   => 12,
            'porcentaje_utilidad_esperada'  => 15,
        ])->assertOk();

        $proyecto->refresh();
        // MO should be exactly 280_000 (fixed), not 30% = 300_000
        $this->assertEquals(280_000.0, round((float) $proyecto->presupuesto_mano_obra, 2));
        $this->assertTrue((bool) $proyecto->usa_monto_fijo_mo);
    }
}
