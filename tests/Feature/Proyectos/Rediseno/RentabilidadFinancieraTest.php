<?php

namespace Tests\Feature\Proyectos\Rediseno;

use App\Models\ConfiguracionPorcentajesPresupuesto;
use App\Models\EntidadEstatal;
use App\Models\HitoCobro;
use App\Models\Permiso;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\User;
use App\Models\Cliente;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RentabilidadFinancieraTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function crearRolGerente(): Rol
    {
        $rol = Rol::firstOrCreate(
            ['nombre' => 'gerente'],
            ['nombre_visible' => 'Gerente', 'es_sistema' => true, 'estado' => 'activo']
        );
        $permisos = [
            'proyectos.crear', 'proyectos.ver', 'proyectos.editar',
            'proyectos.aprobar_rentabilidad_baja',
            'configuracion.porcentajes_presupuestales',
        ];
        foreach ($permisos as $codigo) {
            $p = Permiso::firstOrCreate(['codigo' => $codigo], [
                'nombre' => $codigo, 'nombre_visible' => $codigo,
                'modulo' => explode('.', $codigo)[0], 'accion' => 'ver', 'descripcion' => $codigo,
            ]);
            $rol->permisos()->syncWithoutDetaching([$p->id]);
        }
        return $rol;
    }

    private function crearUsuario(Rol $rol): User
    {
        return User::create([
            'nombre'           => 'Gerente',
            'apellido_paterno' => 'Test',
            'ci'               => 'CI-' . uniqid(),
            'email'            => 'gerente-' . uniqid() . '@test.com',
            'password'         => bcrypt('secret'),
            'rol_id'           => $rol->id,
            'estado'           => 'activo',
            'es_admin_central' => true,
        ]);
    }

    private function crearEntidad(): EntidadEstatal
    {
        return EntidadEstatal::create([
            'nombre' => 'Entidad Test ' . uniqid(),
            'nivel'  => 'municipal',
            'estado' => 'activa',
        ]);
    }

    private function crearCliente(): Cliente
    {
        return Cliente::create([
            'nombre_completo' => 'Cliente Test ' . uniqid(),
            'tipo'            => 'particular',
        ]);
    }

    private function seedConfig(): void
    {
        ConfiguracionPorcentajesPresupuesto::updateOrCreate(['tipo_proyecto' => 'social'], [
            'porcentaje_mano_obra'         => 30.00,
            'porcentaje_gastos_generales'  => 12.00,
            'porcentaje_utilidad_esperada' => 15.00,
            'umbral_rentabilidad_minima'   => 5.00,
        ]);
        ConfiguracionPorcentajesPresupuesto::updateOrCreate(['tipo_proyecto' => 'privado'], [
            'porcentaje_mano_obra'         => 28.00,
            'porcentaje_gastos_generales'  => 10.00,
            'porcentaje_utilidad_esperada' => 18.00,
            'umbral_rentabilidad_minima'   => 5.00,
        ]);
    }

    // ── Tests de rentabilidad ─────────────────────────────────────────────────

    public function test_rentabilidad_calculada_correctamente(): void
    {
        // Contrato 100k, mat 50k, MO 20k, GG 10k → rentabilidad real = 20k (20%)
        $proyecto = new Proyecto([
            'categoria'                    => 'social',
            'monto_contractual'            => 100000,
            'presupuesto_materiales'       => 50000,
            'presupuesto_mano_obra'        => 20000,
            'presupuesto_gastos_generales' => 10000,
        ]);

        $this->assertEquals(20000.0, $proyecto->rentabilidad_estimada);
        $this->assertEquals(20.0,    $proyecto->porcentaje_utilidad_real);
        $this->assertEquals('saludable', $proyecto->salud_financiera);
    }

    public function test_rentabilidad_negativa_marcada_critica(): void
    {
        $proyecto = new Proyecto([
            'categoria'                    => 'social',
            'monto_contractual'            => 100000,
            'presupuesto_materiales'       => 80000,
            'presupuesto_mano_obra'        => 30000,
            'presupuesto_gastos_generales' => 15000,
        ]);

        $this->assertLessThan(0, $proyecto->rentabilidad_estimada);
        $this->assertEquals('critico', $proyecto->salud_financiera);
    }

    public function test_crear_proyecto_sin_justificacion_cuando_rentabilidad_baja_falla(): void
    {
        $this->seedConfig();
        $rol     = $this->crearRolGerente();
        $user    = $this->crearUsuario($rol);
        $entidad = $this->crearEntidad();

        // Presupuesto de materiales mayor al contractual → rentabilidad negativa
        $payload = [
            'nombre'                   => 'Proyecto Pérdida',
            'categoria'                => 'social',
            'monto_contractual'        => 100000,
            'presupuesto_materiales'   => 120000, // gasta más de lo que cobra
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ];

        $response = $this->actingAs($user)->postJson('/api/proyectos', $payload);

        $response->assertStatus(422);
        $this->assertStringContainsString('justificacion_rentabilidad_baja', json_encode($response->json('errors') ?? $response->json('message') ?? ''));
    }

    public function test_crear_proyecto_con_justificacion_cuando_rentabilidad_baja_guarda(): void
    {
        $this->seedConfig();
        $rol     = $this->crearRolGerente();
        $user    = $this->crearUsuario($rol);
        $entidad = $this->crearEntidad();

        $payload = [
            'nombre'                          => 'Proyecto Justificado ' . uniqid(),
            'categoria'                       => 'social',
            'monto_contractual'               => 100000,
            'presupuesto_materiales'          => 120000,
            'entidad_estatal_id'              => $entidad->id,
            'fecha_inicio_planificada'        => '2026-06-01',
            'fecha_fin_planificada'           => '2027-06-01',
            'justificacion_rentabilidad_baja' => 'Proyecto social de alto impacto comunitario aprobado por directorio.',
        ];

        $response = $this->actingAs($user)->postJson('/api/proyectos', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('proyectos', [
            'nombre' => $payload['nombre'],
            'justificacion_rentabilidad_baja' => $payload['justificacion_rentabilidad_baja'],
        ]);
    }

    public function test_porcentajes_snapshot_copiados_del_set_al_crear(): void
    {
        $this->seedConfig();
        $rol     = $this->crearRolGerente();
        $user    = $this->crearUsuario($rol);
        $entidad = $this->crearEntidad();

        $response = $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto Snapshot ' . uniqid(),
            'categoria'                => 'social',
            'monto_contractual'        => 200000,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ]);

        $response->assertStatus(201);
        $proyecto = Proyecto::find($response->json('data.id'));
        $this->assertNotNull($proyecto);
        $this->assertEquals('30.00', $proyecto->porcentaje_mano_obra);
        $this->assertEquals('12.00', $proyecto->porcentaje_gastos_generales);
        $this->assertEquals('15.00', $proyecto->porcentaje_utilidad_esperada);
        // Comprueba que los montos están calculados
        $this->assertEquals(60000.0, (float) $proyecto->presupuesto_mano_obra);  // 200k × 30%
        $this->assertEquals(24000.0, (float) $proyecto->presupuesto_gastos_generales);
    }

    public function test_cambio_porcentaje_mo_actualiza_calculo(): void
    {
        $this->seedConfig();
        $rol     = $this->crearRolGerente();
        $user    = $this->crearUsuario($rol);
        $entidad = $this->crearEntidad();

        // Crear proyecto con MO al 25% en lugar del default 30%
        $response = $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto MO Custom ' . uniqid(),
            'categoria'                => 'social',
            'monto_contractual'        => 100000,
            'porcentaje_mano_obra'     => 25.00,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ]);

        $response->assertStatus(201);
        $proyecto = Proyecto::find($response->json('data.id'));
        $this->assertEquals('25.00', $proyecto->porcentaje_mano_obra);
        $this->assertEquals(25000.0, (float) $proyecto->presupuesto_mano_obra);
    }

    public function test_toggle_monto_fijo_mo_reemplaza_porcentaje(): void
    {
        $this->seedConfig();
        $rol     = $this->crearRolGerente();
        $user    = $this->crearUsuario($rol);
        $entidad = $this->crearEntidad();

        $response = $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto MO Fijo ' . uniqid(),
            'categoria'                => 'social',
            'monto_contractual'        => 200000,
            'usa_monto_fijo_mo'        => true,
            'presupuesto_mano_obra'    => 45000,  // monto fijo manual
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ]);

        $response->assertStatus(201);
        $proyecto = Proyecto::find($response->json('data.id'));
        $this->assertTrue((bool) $proyecto->usa_monto_fijo_mo);
        $this->assertEquals(45000.0, (float) $proyecto->presupuesto_mano_obra);
        // No debe ser 200k × 30% = 60k
        $this->assertNotEquals(60000.0, (float) $proyecto->presupuesto_mano_obra);
    }

    public function test_cambio_del_set_no_afecta_proyectos_existentes(): void
    {
        $this->seedConfig();
        $rol     = $this->crearRolGerente();
        $user    = $this->crearUsuario($rol);
        $entidad = $this->crearEntidad();

        // Crear proyecto con set social actual (MO=30%)
        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto Pre-Cambio ' . uniqid(),
            'categoria'                => 'social',
            'monto_contractual'        => 100000,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ]);

        // Cambiar el set a MO=20%
        $this->actingAs($user)->putJson('/api/configuracion/porcentajes-presupuesto/social', [
            'porcentaje_mano_obra'         => 20.00,
            'porcentaje_gastos_generales'  => 12.00,
            'porcentaje_utilidad_esperada' => 15.00,
            'umbral_rentabilidad_minima'   => 5.00,
        ])->assertOk();

        // El proyecto existente debe seguir con MO=30% (snapshot)
        $proyectoExistente = Proyecto::latest()->first();
        $this->assertEquals('30.00', $proyectoExistente->porcentaje_mano_obra);

        // Un proyecto nuevo debe tener MO=20%
        $response = $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto Post-Cambio ' . uniqid(),
            'categoria'                => 'social',
            'monto_contractual'        => 100000,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ]);
        $response->assertStatus(201);
        $proyectoNuevo = Proyecto::find($response->json('data.id'));
        $this->assertEquals('20.00', $proyectoNuevo->porcentaje_mano_obra);
    }

    public function test_configuracion_porcentajes_gerente_puede_editar(): void
    {
        $this->seedConfig();
        $rol  = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);

        $response = $this->actingAs($user)->putJson('/api/configuracion/porcentajes-presupuesto/social', [
            'porcentaje_mano_obra'         => 32.00,
            'porcentaje_gastos_generales'  => 10.00,
            'porcentaje_utilidad_esperada' => 13.00,
            'umbral_rentabilidad_minima'   => 5.00,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('configuracion_porcentajes_presupuesto', [
            'tipo_proyecto'       => 'social',
            'porcentaje_mano_obra' => 32.00,
        ]);
    }

    public function test_configuracion_porcentajes_suma_mayor_100_rechazada(): void
    {
        $this->seedConfig();
        $rol  = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);

        $response = $this->actingAs($user)->putJson('/api/configuracion/porcentajes-presupuesto/social', [
            'porcentaje_mano_obra'         => 50.00,
            'porcentaje_gastos_generales'  => 30.00,
            'porcentaje_utilidad_esperada' => 30.00, // suma = 110%
            'umbral_rentabilidad_minima'   => 5.00,
        ]);

        $response->assertStatus(422);
    }
}
