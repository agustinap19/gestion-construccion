<?php

namespace Tests\Feature\Proyectos;

use App\Models\ConfiguracionPorcentajesPresupuesto;
use App\Models\EntidadEstatal;
use App\Models\HitoCobro;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class ProductosCobroTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function gerente(): User
    {
        $rol = Rol::firstOrCreate(
            ['nombre' => 'gerente'],
            ['nombre_visible' => 'Gerente', 'es_sistema' => true, 'estado' => 'activo']
        );
        return User::create([
            'nombre'           => 'Test',
            'apellido_paterno' => 'Gerente',
            'ci'               => 'CI-' . uniqid(),
            'email'            => 'gerente-cobro-' . uniqid() . '@test.com',
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

    private function config(): void
    {
        ConfiguracionPorcentajesPresupuesto::firstOrCreate(
            ['tipo_proyecto' => 'social'],
            [
                'porcentaje_mano_obra'         => 30.00,
                'porcentaje_gastos_generales'  => 10.00,
                'porcentaje_utilidad_esperada' => 10.00,
                'umbral_rentabilidad_minima'   => 5.00,
            ]
        );
    }

    private function crearProyectoConHitos(float $monto, array $hitos): Proyecto
    {
        $this->config();
        $user    = $this->gerente();
        $entidad = $this->entidad();

        $hitosCobro = [];
        foreach ($hitos as $i => $h) {
            $hitosCobro[] = [
                'nombre'            => $h['nombre'] ?? "Producto " . ($i + 1),
                'porcentaje'        => $h['porcentaje'],
                'fecha_planificada' => $h['fecha'] ?? '2027-06-01',
            ];
        }

        $res = $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto Cobro Test ' . uniqid(),
            'categoria'                => 'social',
            'monto_contractual'        => $monto,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'prioridad'                => 'media',
            'hitos_cobro'              => $hitosCobro,
        ]);

        $res->assertCreated();
        return Proyecto::latest()->first();
    }

    // ── Test 1: monto_calculado = porcentaje × contrato / 100 ────────────────

    public function test_monto_calculado_es_porcentaje_del_contrato(): void
    {
        $proyecto = $this->crearProyectoConHitos(5_000_000, [
            ['nombre' => 'Producto 1', 'porcentaje' => 25, 'fecha' => '2027-06-01'],
            ['nombre' => 'Producto 2', 'porcentaje' => 25, 'fecha' => '2027-06-01'],
            ['nombre' => 'Producto 3', 'porcentaje' => 25, 'fecha' => '2027-06-01'],
            ['nombre' => 'Producto 4', 'porcentaje' => 25, 'fecha' => '2027-06-01'],
        ]);

        $hitos = HitoCobro::where('proyecto_id', $proyecto->id)->orderBy('orden')->get();
        $this->assertCount(4, $hitos);

        foreach ($hitos as $hito) {
            $esperado = 5_000_000 * (float) $hito->porcentaje_contrato / 100;
            $this->assertEquals(
                $esperado,
                (float) $hito->monto_calculado,
                "Hito {$hito->nombre}: esperado Bs. " . number_format($esperado, 2) . " pero es Bs. " . number_format($hito->monto_calculado, 2)
            );
        }

        // Cada producto con 25% → Bs. 1.250.000
        $this->assertEquals(1_250_000.0, (float) $hitos->first()->monto_calculado);
    }

    // ── Test 2: suma de productos = monto contractual ─────────────────────────

    public function test_suma_de_productos_igual_al_contrato(): void
    {
        $proyecto = $this->crearProyectoConHitos(5_000_000, [
            ['porcentaje' => 25, 'fecha' => '2027-06-01'],
            ['porcentaje' => 25, 'fecha' => '2027-06-01'],
            ['porcentaje' => 25, 'fecha' => '2027-06-01'],
            ['porcentaje' => 25, 'fecha' => '2027-06-01'],
        ]);

        $sumaMontos = (float) HitoCobro::where('proyecto_id', $proyecto->id)->sum('monto_calculado');
        $this->assertEquals(
            5_000_000.0,
            $sumaMontos,
            "La suma de productos debe ser igual al monto contractual"
        );
    }

    // ── Test 3: comando recalcular corrige montos incorrectos ─────────────────

    public function test_comando_recalcular_corrige_montos_existentes(): void
    {
        $this->config();
        // Crear proyecto directamente con montos incorrectos en BD
        $proyecto = Proyecto::create([
            'codigo'                   => 'PRJ-TEST-' . uniqid(),
            'nombre'                   => 'Proyecto Montos Malos',
            'categoria'                => 'social',
            'estado'                   => 'formulacion',
            'prioridad'                => 'media',
            'monto_contractual'        => 5_000_000,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ]);

        // Hito con monto_calculado incorrecto (como si se hubiera calculado sobre 400,000)
        HitoCobro::create([
            'proyecto_id'         => $proyecto->id,
            'orden'               => 1,
            'nombre'              => 'Producto 1',
            'porcentaje_contrato' => 25.00,
            'monto_calculado'     => 100_000.00, // INCORRECTO: debería ser 1.250.000
            'fecha_planificada'   => '2027-06-01',
            'tipo'                => 'producto_sicooes',
            'estado'              => 'planificado',
        ]);

        // Verificar que está mal antes del comando
        $hitoBad = HitoCobro::where('proyecto_id', $proyecto->id)->first();
        $this->assertEquals(100_000.0, (float) $hitoBad->monto_calculado, 'El monto debe estar mal antes del recálculo');

        // Ejecutar el comando
        $exitCode = Artisan::call('cobros:recalcular', ['--proyecto' => $proyecto->id]);
        $this->assertEquals(0, $exitCode, 'El comando debe terminar con éxito');

        // Verificar que está corregido
        $hitoFixed = $hitoBad->fresh();
        $this->assertEquals(
            1_250_000.0,
            (float) $hitoFixed->monto_calculado,
            'El monto debe ser correcto después del recálculo: 5.000.000 × 25% = 1.250.000'
        );
    }

    // ── Test 4: validación rechaza porcentajes que no suman 100% ─────────────

    public function test_validacion_rechaza_porcentajes_que_no_suman_100(): void
    {
        $this->config();
        $user    = $this->gerente();
        $entidad = $this->entidad();

        // Intentar crear proyecto con hitos que suman 90%
        $res = $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto Porcentajes Malos',
            'categoria'                => 'social',
            'monto_contractual'        => 5_000_000,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'prioridad'                => 'media',
            'hitos_cobro'              => [
                ['nombre' => 'P1', 'porcentaje' => 25, 'fecha_planificada' => '2027-06-01'],
                ['nombre' => 'P2', 'porcentaje' => 25, 'fecha_planificada' => '2027-06-01'],
                ['nombre' => 'P3', 'porcentaje' => 40, 'fecha_planificada' => '2027-06-01'],
                // Total = 90%, falta 10%
            ],
        ]);

        $res->assertStatus(422);
        $errors = $res->json('errors') ?? [];
        $message = $res->json('message') ?? '';
        // La validación debe rechazar por porcentajes que no suman 100
        $this->assertTrue(
            isset($errors['hitos_cobro']) || str_contains(strtolower($message), '100'),
            'Debe rechazar porque los porcentajes no suman 100%'
        );
    }

    // ── Test 5: dashboard retorna montos correctos ────────────────────────────

    public function test_vista_flujo_cobro_muestra_montos_correctos(): void
    {
        $proyecto = $this->crearProyectoConHitos(5_000_000, [
            ['porcentaje' => 25, 'fecha' => '2027-06-01'],
            ['porcentaje' => 25, 'fecha' => '2027-06-01'],
            ['porcentaje' => 25, 'fecha' => '2027-06-01'],
            ['porcentaje' => 25, 'fecha' => '2027-06-01'],
        ]);

        $user = $this->gerente();
        $res  = $this->actingAs($user)
            ->getJson("/api/proyectos/{$proyecto->id}/dashboard");

        $res->assertStatus(200);

        // El dashboard retorna { status, data: { hitos_cobro, ... } }
        $hitosCobro = $res->json('data.hitos_cobro') ?? $res->json('hitos_cobro') ?? [];
        $this->assertNotEmpty($hitosCobro, 'El dashboard debe incluir hitos_cobro');

        $sumaMontos = collect($hitosCobro)->sum('monto_calculado');
        $this->assertEquals(
            5_000_000.0,
            (float) $sumaMontos,
            'La suma de montos en el dashboard debe igualar el monto contractual'
        );

        // Cada producto debe ser 1.250.000
        foreach ($hitosCobro as $h) {
            $this->assertEquals(
                1_250_000.0,
                (float) $h['monto_calculado'],
                "Cada producto con 25% debe ser Bs. 1.250.000"
            );
        }
    }

    // ── Test extra: actualizar monto_contractual recalcula hitos ─────────────

    public function test_actualizar_monto_contractual_recalcula_hitos_automaticamente(): void
    {
        // Crear proyecto con monto original de 1.000.000
        $proyecto = $this->crearProyectoConHitos(1_000_000, [
            ['porcentaje' => 50, 'fecha' => '2027-06-01'],
            ['porcentaje' => 50, 'fecha' => '2027-06-01'],
        ]);

        $hitos = HitoCobro::where('proyecto_id', $proyecto->id)->get();
        // Verificar montos iniciales correctos
        foreach ($hitos as $h) {
            $this->assertEquals(500_000.0, (float) $h->monto_calculado);
        }

        // Actualizar monto_contractual a 2.000.000
        $user = $this->gerente();
        $this->actingAs($user)->putJson("/api/proyectos/{$proyecto->id}", [
            'nombre'                   => $proyecto->nombre,
            'categoria'                => 'social',
            'monto_contractual'        => 2_000_000,
            'entidad_estatal_id'       => $proyecto->entidad_estatal_id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'prioridad'                => 'media',
        ])->assertOk();

        // Los hitos deben haberse recalculado automáticamente
        foreach ($hitos as $h) {
            $this->assertEquals(
                1_000_000.0,
                (float) $h->fresh()->monto_calculado,
                "Después de actualizar el contrato a 2M, cada 50% debe ser 1.000.000"
            );
        }
    }
}
