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
 * Cubre los 8 bugs lógicos detectados en el rediseño financiero del módulo Proyectos.
 */
class CalculosFinancierosTest extends TestCase
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
            'nombre'           => 'Test',
            'apellido_paterno' => 'Financiero',
            'ci'               => 'CI-' . uniqid(),
            'email'            => 'fin-' . uniqid() . '@test.com',
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

    private function cliente(): Cliente
    {
        return Cliente::create([
            'nombre_completo'   => 'Cliente Test ' . uniqid(),
            'tipo'              => 'persona_natural',
            'documento_numero'  => 'DOC-' . uniqid(),
            'telefono_principal' => '70000000',
            'estado'            => 'activo',
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

    private function configPrivado(): ConfiguracionPorcentajesPresupuesto
    {
        return ConfiguracionPorcentajesPresupuesto::firstOrCreate(
            ['tipo_proyecto' => 'privado'],
            [
                'porcentaje_mano_obra'         => 28.00,
                'porcentaje_gastos_generales'  => 10.00,
                'porcentaje_utilidad_esperada' => 18.00,
                'umbral_rentabilidad_minima'   => 5.00,
            ]
        );
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    /**
     * Bug 1: presupuesto_materiales debe calcularse server-side como residual.
     * El frontend nunca envía este campo; el backend lo calcula.
     */
    public function test_bug1_presupuesto_materiales_se_calcula_como_residual(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $monto = 1_000_000.00;

        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto Bug 1',
            'categoria'                => 'social',
            'monto_contractual'        => $monto,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'prioridad'                => 'media',
        ])->assertCreated();

        $proyecto = Proyecto::latest()->first();

        // MO = 30%, GG = 12%, Util = 15% → Materiales = 43%
        $this->assertEquals(300_000.00, round((float) $proyecto->presupuesto_mano_obra, 2));
        $this->assertEquals(120_000.00, round((float) $proyecto->presupuesto_gastos_generales, 2));
        $this->assertEquals(150_000.00, round((float) $proyecto->presupuesto_utilidad_esperada, 2));
        $this->assertEquals(430_000.00, round((float) $proyecto->presupuesto_materiales, 2));
    }

    /**
     * Bug 2: Los porcentajes del snapshot deben provenir del config set cuando
     * el usuario no los envía explícitamente.
     */
    public function test_bug2_snapshot_porcentajes_se_copia_del_config_set(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto Bug 2',
            'categoria'                => 'social',
            'monto_contractual'        => 500_000.00,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'prioridad'                => 'media',
        ])->assertCreated();

        $proyecto = Proyecto::latest()->first();

        $this->assertEquals(30.00, (float) $proyecto->porcentaje_mano_obra);
        $this->assertEquals(12.00, (float) $proyecto->porcentaje_gastos_generales);
        $this->assertEquals(15.00, (float) $proyecto->porcentaje_utilidad_esperada);
        $this->assertNotNull($proyecto->presupuesto_materiales);
        $this->assertGreaterThan(0, (float) $proyecto->presupuesto_materiales);
    }

    /**
     * Bug 3: salud_financiera se guarda en BD y su valor es correcto.
     * Con utilidad = 15% y umbral = 5%, debe quedar 'saludable' (≥ umbral + 5%).
     */
    public function test_bug3_salud_financiera_se_persiste_correctamente(): void
    {
        $this->configSocial(); // umbral = 5%, utilidad = 15%
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto Bug 3 Saludable',
            'categoria'                => 'social',
            'monto_contractual'        => 1_000_000.00,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'prioridad'                => 'media',
        ])->assertCreated();

        $proyecto = Proyecto::latest()->first();
        $this->assertEquals('saludable', $proyecto->salud_financiera);
    }

    /**
     * Bug 3 (variante): utilidad enviada por debajo del umbral → estado 'critico'.
     */
    public function test_bug3_salud_financiera_critico_cuando_utilidad_bajo_umbral(): void
    {
        ConfiguracionPorcentajesPresupuesto::firstOrCreate(
            ['tipo_proyecto' => 'social'],
            [
                'porcentaje_mano_obra'         => 30.00,
                'porcentaje_gastos_generales'  => 12.00,
                'porcentaje_utilidad_esperada' => 15.00,
                'umbral_rentabilidad_minima'   => 5.00,
            ]
        );

        $user    = $this->usuario();
        $entidad = $this->entidad();

        // Overriding utilidad to 3% (below 5% threshold) requires justification
        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                          => 'Proyecto Rentabilidad Baja',
            'categoria'                       => 'social',
            'monto_contractual'               => 1_000_000.00,
            'porcentaje_mano_obra'            => 30,
            'porcentaje_gastos_generales'     => 12,
            'porcentaje_utilidad_esperada'    => 3,
            'justificacion_rentabilidad_baja' => 'Proyecto de beneficio social prioritario',
            'entidad_estatal_id'              => $entidad->id,
            'fecha_inicio_planificada'        => '2026-06-01',
            'fecha_fin_planificada'           => '2027-06-01',
            'prioridad'                       => 'media',
        ])->assertCreated();

        $proyecto = Proyecto::latest()->first();
        $this->assertEquals('critico', $proyecto->salud_financiera);
        $this->assertEquals(3.00, (float) $proyecto->porcentaje_utilidad_esperada);
    }

    /**
     * Bug 3 (validación): rentabilidad baja sin justificación debe rechazarse.
     */
    public function test_bug3_baja_rentabilidad_sin_justificacion_retorna_422(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                       => 'Proyecto Sin Justificacion',
            'categoria'                    => 'social',
            'monto_contractual'            => 1_000_000.00,
            'porcentaje_mano_obra'         => 30,
            'porcentaje_gastos_generales'  => 12,
            'porcentaje_utilidad_esperada' => 2, // 2% < 5% umbral → requiere justificación
            'entidad_estatal_id'           => $entidad->id,
            'fecha_inicio_planificada'     => '2026-06-01',
            'fecha_fin_planificada'        => '2027-06-01',
            'prioridad'                    => 'media',
        ])->assertUnprocessable()
          ->assertJsonValidationErrors(['justificacion_rentabilidad_baja']);
    }

    /**
     * Bug 6: Proyectos sociales sin hitos enviados deben recibir 4 productos SICOOES por defecto.
     */
    public function test_bug6_social_sin_hitos_crea_4_productos_por_defecto(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto Sin Hitos',
            'categoria'                => 'social',
            'monto_contractual'        => 800_000.00,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'prioridad'                => 'media',
            // hitos_cobro NOT sent
        ])->assertCreated();

        $proyecto = Proyecto::latest()->first();
        $hitos    = HitoCobro::where('proyecto_id', $proyecto->id)->orderBy('orden')->get();

        $this->assertCount(4, $hitos);
        $this->assertEquals('Producto 1', $hitos[0]->nombre);
        $this->assertEquals('Producto 2', $hitos[1]->nombre);
        $this->assertEquals('Producto 3', $hitos[2]->nombre);
        $this->assertEquals('Producto 4', $hitos[3]->nombre);
        $this->assertEquals('producto_sicooes', $hitos[0]->tipo);
        $this->assertEquals(25.00, (float) $hitos[0]->porcentaje_contrato);
    }

    /**
     * Bug 6 (variante): Proyectos privados sin hitos NO deben recibir hitos por defecto.
     */
    public function test_bug6_privado_sin_hitos_no_crea_hitos_por_defecto(): void
    {
        $this->configPrivado();
        $user    = $this->usuario();
        $cliente = $this->cliente();

        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Privado Sin Hitos',
            'categoria'                => 'privado',
            'monto_contractual'        => 500_000.00,
            'cliente_id'               => $cliente->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'prioridad'                => 'baja',
        ])->assertCreated();

        $proyecto = Proyecto::latest()->first();
        $hitos    = HitoCobro::where('proyecto_id', $proyecto->id)->count();

        $this->assertEquals(0, $hitos);
    }

    /**
     * Bug 8: cantidad_beneficiarios controla el número exacto de viviendas creadas en la cascada.
     */
    public function test_bug8_cantidad_beneficiarios_determina_viviendas_creadas(): void
    {
        $this->configSocial();
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto 5 Beneficiarios',
            'categoria'                => 'social',
            'monto_contractual'        => 2_000_000.00,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'prioridad'                => 'alta',
            'cantidad_beneficiarios'   => 5,
        ])->assertCreated();

        $proyecto = Proyecto::latest()->first();

        $this->assertDatabaseCount('viviendas', 5);
        $this->assertEquals(5, \App\Models\Vivienda::where('proyecto_id', $proyecto->id)->count());
    }
}
