<?php

namespace Tests\Feature\Proyectos\Rediseno;

use App\Models\Almacen;
use App\Models\Cliente;
use App\Models\ConfiguracionPorcentajesPresupuesto;
use App\Models\EntidadEstatal;
use App\Models\FaseProyecto;
use App\Models\HitoCobro;
use App\Models\Permiso;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\User;
use App\Models\Vivienda;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreacionProyectoRediseno extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function crearGerente(): User
    {
        $rol = Rol::firstOrCreate(
            ['nombre' => 'gerente'],
            ['nombre_visible' => 'Gerente', 'es_sistema' => true, 'estado' => 'activo']
        );
        foreach (['proyectos.crear', 'proyectos.ver', 'configuracion.porcentajes_presupuestales'] as $codigo) {
            $p = Permiso::firstOrCreate(['codigo' => $codigo], [
                'nombre' => $codigo, 'nombre_visible' => $codigo,
                'modulo' => explode('.', $codigo)[0], 'accion' => 'ver', 'descripcion' => $codigo,
            ]);
            $rol->permisos()->syncWithoutDetaching([$p->id]);
        }
        return User::create([
            'nombre' => 'Gerente', 'apellido_paterno' => 'Test',
            'ci' => 'CI-' . uniqid(), 'email' => 'gerente-' . uniqid() . '@test.com',
            'password' => bcrypt('secret'), 'rol_id' => $rol->id,
            'estado' => 'activo', 'es_admin_central' => true,
        ]);
    }

    private function entidad(): EntidadEstatal
    {
        return EntidadEstatal::create([
            'nombre' => 'Entidad ' . uniqid(), 'nivel' => 'municipal', 'estado' => 'activa',
        ]);
    }

    private function cliente(): Cliente
    {
        return Cliente::create([
            'nombre_completo'   => 'Cliente Test',
            'tipo'              => 'persona_natural',
            'documento_tipo'    => 'ci',
            'documento_numero'  => 'CI-' . uniqid(),
            'telefono_principal' => '76543210',
        ]);
    }

    private function seedConfig(): void
    {
        ConfiguracionPorcentajesPresupuesto::updateOrCreate(['tipo_proyecto' => 'social'], [
            'porcentaje_mano_obra' => 30.00, 'porcentaje_gastos_generales' => 12.00,
            'porcentaje_utilidad_esperada' => 15.00, 'umbral_rentabilidad_minima' => 5.00,
        ]);
        ConfiguracionPorcentajesPresupuesto::updateOrCreate(['tipo_proyecto' => 'privado'], [
            'porcentaje_mano_obra' => 28.00, 'porcentaje_gastos_generales' => 10.00,
            'porcentaje_utilidad_esperada' => 18.00, 'umbral_rentabilidad_minima' => 5.00,
        ]);
    }

    // ── Tests de creación social ──────────────────────────────────────────────

    public function test_crear_proyecto_social_genera_cascada_completa(): void
    {
        $this->seedConfig();
        $user    = $this->crearGerente();
        $entidad = $this->entidad();

        $payload = [
            'nombre'                   => 'Social TIPO 1 - 10 benef',
            'categoria'                => 'social',
            'monto_contractual'        => 150000,
            'cantidad_beneficiarios'   => 10,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'hitos_cobro'              => [
                ['nombre' => 'Producto 1', 'porcentaje' => 25.00, 'fecha_planificada' => '2026-09-01'],
                ['nombre' => 'Producto 2', 'porcentaje' => 25.00, 'fecha_planificada' => '2026-12-01'],
                ['nombre' => 'Producto 3', 'porcentaje' => 25.00, 'fecha_planificada' => '2027-03-01'],
                ['nombre' => 'Producto 4', 'porcentaje' => 25.00, 'fecha_planificada' => '2027-06-01'],
            ],
        ];

        $response = $this->actingAs($user)->postJson('/api/proyectos', $payload);
        $response->assertStatus(201);

        $proyectoId = $response->json('data.id');
        $this->assertNotNull($proyectoId);

        // Viviendas creadas (10)
        $this->assertCount(10, Vivienda::where('proyecto_id', $proyectoId)->get());

        // Almacén creado
        $this->assertCount(1, Almacen::where('proyecto_id', $proyectoId)->get());

        // 4 hitos de cobro tipo producto_sicooes
        $hitos = HitoCobro::where('proyecto_id', $proyectoId)->get();
        $this->assertCount(4, $hitos);
        $this->assertEquals('producto_sicooes', $hitos->first()->tipo);

        // Snapshot porcentajes
        $proyecto = Proyecto::find($proyectoId);
        $this->assertEquals('30.00', $proyecto->porcentaje_mano_obra);
        $this->assertTrue((bool) $proyecto->aplica_retencion_7_porciento);
    }

    public function test_crear_proyecto_privado_con_fases_y_hitos_negociados(): void
    {
        $this->seedConfig();
        $user    = $this->crearGerente();
        $cliente = $this->cliente();

        $payload = [
            'nombre'                   => 'Privado 3 Fases 5 Hitos',
            'categoria'                => 'privado',
            'monto_contractual'        => 500000,
            'cliente_id'               => $cliente->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-12-31',
            'cantidad_fases'           => 3,
            'fases_config'             => [
                ['nombre' => 'Fase Cimentación',  'porcentaje' => 30.00],
                ['nombre' => 'Fase Estructura',   'porcentaje' => 40.00],
                ['nombre' => 'Fase Acabados',     'porcentaje' => 30.00],
            ],
            'hitos_cobro'              => [
                ['nombre' => 'Anticipo',     'porcentaje' => 20.00, 'fecha_planificada' => '2026-06-15'],
                ['nombre' => 'Avance 25%',   'porcentaje' => 20.00, 'fecha_planificada' => '2026-09-01'],
                ['nombre' => 'Avance 50%',   'porcentaje' => 20.00, 'fecha_planificada' => '2027-01-01'],
                ['nombre' => 'Avance 75%',   'porcentaje' => 20.00, 'fecha_planificada' => '2027-06-01'],
                ['nombre' => 'Entrega final','porcentaje' => 20.00, 'fecha_planificada' => '2027-12-01'],
            ],
        ];

        $response = $this->actingAs($user)->postJson('/api/proyectos', $payload);
        $response->assertStatus(201);

        $proyectoId = $response->json('data.id');

        // 3 fases creadas
        $this->assertCount(3, FaseProyecto::where('proyecto_id', $proyectoId)->get());

        // 5 hitos negociados
        $hitos = HitoCobro::where('proyecto_id', $proyectoId)->get();
        $this->assertCount(5, $hitos);
        $this->assertEquals('hito_negociado', $hitos->first()->tipo);

        // Suma de porcentajes = 100
        $sumaHitos = $hitos->sum('porcentaje_contrato');
        $this->assertEqualsWithDelta(100.00, $sumaHitos, 0.01);

        // Almacén creado
        $this->assertCount(1, Almacen::where('proyecto_id', $proyectoId)->get());
    }

    public function test_suma_hitos_diferente_a_100_rechazada(): void
    {
        $this->seedConfig();
        $user    = $this->crearGerente();
        $entidad = $this->entidad();

        $response = $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Proyecto Suma Errónea',
            'categoria'                => 'social',
            'monto_contractual'        => 100000,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'hitos_cobro'              => [
                ['nombre' => 'Prod 1', 'porcentaje' => 30.00, 'fecha_planificada' => '2026-09-01'],
                ['nombre' => 'Prod 2', 'porcentaje' => 30.00, 'fecha_planificada' => '2027-06-01'],
                // Suma = 60%, no 100%
            ],
        ]);

        $response->assertStatus(422);
    }

    public function test_cascada_atomica_rollback_si_falla(): void
    {
        $this->seedConfig();
        $user    = $this->crearGerente();
        $entidad = $this->entidad();

        // Enviar hitos con suma ≠ 100 para forzar fallo de validación
        $proyectosAntes = Proyecto::count();

        $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Fallo Cascada',
            'categoria'                => 'social',
            'monto_contractual'        => 100000,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'hitos_cobro'              => [
                ['nombre' => 'Solo esto', 'porcentaje' => 50.00, 'fecha_planificada' => '2026-09-01'],
            ],
        ])->assertStatus(422);

        // No debe haberse creado ningún proyecto
        $this->assertEquals($proyectosAntes, Proyecto::count());
    }

    public function test_hitos_privado_nombre_libre(): void
    {
        $this->seedConfig();
        $user    = $this->crearGerente();
        $cliente = $this->cliente();

        $response = $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Privado Nombre Libre',
            'categoria'                => 'privado',
            'monto_contractual'        => 200000,
            'cliente_id'               => $cliente->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'hitos_cobro'              => [
                ['nombre' => 'Anticipo 30%', 'porcentaje' => 30.00, 'fecha_planificada' => '2026-06-15'],
                ['nombre' => 'Entrega final', 'porcentaje' => 70.00, 'fecha_planificada' => '2027-06-01'],
            ],
        ]);

        $response->assertStatus(201);
        $proyectoId = $response->json('data.id');
        $hitos = HitoCobro::where('proyecto_id', $proyectoId)->orderBy('orden')->get();
        $this->assertEquals('Anticipo 30%', $hitos->first()->nombre);
        $this->assertEquals('Entrega final', $hitos->last()->nombre);
    }

    public function test_monto_hitos_calculados_desde_contractual(): void
    {
        $this->seedConfig();
        $user    = $this->crearGerente();
        $entidad = $this->entidad();

        $response = $this->actingAs($user)->postJson('/api/proyectos', [
            'nombre'                   => 'Monto Hitos',
            'categoria'                => 'social',
            'monto_contractual'        => 100000,
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'hitos_cobro'              => [
                ['nombre' => 'P1', 'porcentaje' => 40.00, 'fecha_planificada' => '2026-09-01'],
                ['nombre' => 'P2', 'porcentaje' => 60.00, 'fecha_planificada' => '2027-06-01'],
            ],
        ]);

        $response->assertStatus(201);
        $proyectoId = $response->json('data.id');
        $hitos = HitoCobro::where('proyecto_id', $proyectoId)->orderBy('orden')->get();
        $this->assertEquals(40000.0, (float) $hitos->first()->monto_calculado);
        $this->assertEquals(60000.0, (float) $hitos->last()->monto_calculado);
    }

    public function test_dashboard_tarjeta_salud_financiera_carga(): void
    {
        $this->seedConfig();
        $user    = $this->crearGerente();
        $entidad = $this->entidad();

        $proyecto = Proyecto::create([
            'codigo'                       => 'PRJ-2026-TST1',
            'nombre'                       => 'Dashboard Test',
            'categoria'                    => 'social',
            'estado'                       => 'en_ejecucion',
            'creado_por_id'                => $user->id,
            'entidad_estatal_id'           => $entidad->id,
            'monto_contractual'            => 200000,
            'presupuesto_materiales'       => 80000,
            'porcentaje_mano_obra'         => 30.00,
            'presupuesto_mano_obra'        => 60000,
            'porcentaje_gastos_generales'  => 12.00,
            'presupuesto_gastos_generales' => 24000,
            'porcentaje_utilidad_esperada' => 15.00,
            'presupuesto_utilidad_esperada'=> 30000,
        ]);

        $response = $this->actingAs($user)->getJson("/api/proyectos/{$proyecto->id}/dashboard");
        $response->assertOk();
        $response->assertJsonPath('data.proyecto.id', $proyecto->id);
    }
}
