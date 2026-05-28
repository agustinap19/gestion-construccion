<?php

namespace Tests\Feature\Proyectos;

use App\Models\Almacen;
use App\Models\Cliente;
use App\Models\EntidadEstatal;
use App\Models\FaseProyecto;
use App\Models\Hito;
use App\Models\ItemChecklist;
use App\Models\Permiso;
use App\Models\PlantillaChecklist;
use App\Models\HitoCobro;
use App\Models\ProductoContractual;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\User;
use App\Models\Vivienda;
use Database\Seeders\PlantillaChecklistSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProyectosCascadaTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function rolGerente(): Rol
    {
        return Rol::firstOrCreate(
            ['nombre' => 'gerente'],
            ['nombre_visible' => 'Gerente', 'es_sistema' => true, 'estado' => 'activo']
        );
    }

    private function usuario(Rol $rol = null, bool $esAdmin = true): User
    {
        $rol ??= $this->rolGerente();
        return User::create([
            'nombre'           => 'Tester',
            'apellido_paterno' => 'Cascada',
            'ci'               => 'CI-' . uniqid(),
            'email'            => 'cas-' . uniqid() . '@test.com',
            'password'         => bcrypt('password'),
            'rol_id'           => $rol->id,
            'estado'           => 'activo',
            'es_admin_central' => $esAdmin,
        ]);
    }

    private function entidad(): EntidadEstatal
    {
        return EntidadEstatal::create([
            'nombre' => 'Municipio Test ' . uniqid(),
            'nivel'  => 'municipal',
            'estado' => 'activa',
        ]);
    }

    private function cliente(): Cliente
    {
        return Cliente::create([
            'nombre_completo'  => 'Juan Perez',
            'tipo'             => 'persona_natural',
            'documento_tipo'   => 'ci',
            'documento_numero' => 'CI-' . uniqid(),
            'telefono_principal' => '71234567',
            'estado'           => 'activo',
        ]);
    }

    private function payloadSocial(array $extras = []): array
    {
        return array_merge([
            'categoria'                => 'social',
            'nombre'                   => 'Proyecto Social Test ' . uniqid(),
            'presupuesto_referencial'  => 1_000_000,
            'fecha_inicio_planificada' => '2026-07-01',
            'fecha_fin_planificada'    => '2027-06-30',
            'prioridad'                => 'media',
        ], $extras);
    }

    private function payloadPrivado(array $extras = []): array
    {
        return array_merge([
            'categoria'                => 'privado',
            'nombre'                   => 'Proyecto Privado Test ' . uniqid(),
            'presupuesto_referencial'  => 500_000,
            'fecha_inicio_planificada' => '2026-07-01',
            'fecha_fin_planificada'    => '2027-06-30',
            'tipo_obra'                => 'vivienda_unifamiliar',
            'prioridad'                => 'alta',
        ], $extras);
    }

    // ═══════════════════════════════════════════════════════════
    // Cascade: Proyecto Privado
    // ═══════════════════════════════════════════════════════════

    public function test_proyecto_privado_genera_fases_almacen_e_hitos(): void
    {
        $this->seed(PlantillaChecklistSeeder::class);
        $user    = $this->usuario();
        $cliente = $this->cliente();

        $payload = $this->payloadPrivado([
            'cliente_id'     => $cliente->id,
            'cantidad_fases' => 3,
        ]);

        $res = $this->actingAs($user)
            ->postJson('/api/proyectos', $payload)
            ->assertCreated()
            ->json('data');

        $proyId = $res['id'];

        // 3 fases creadas
        $this->assertDatabaseCount('fases_proyecto', 3);
        $this->assertEquals(3, FaseProyecto::where('proyecto_id', $proyId)->count());

        // Almacén creado
        $this->assertDatabaseCount('almacenes', 1);
        $almacen = Almacen::where('proyecto_id', $proyId)->first();
        $this->assertNotNull($almacen);
        $this->assertEquals('obra', $almacen->tipo);

        // 2 hitos de cronograma (inicio + fin)
        $hitos = Hito::where('proyecto_id', $proyId)->get();
        $this->assertGreaterThanOrEqual(2, $hitos->count());
        $this->assertTrue($hitos->where('tipo', 'otro')->first()->es_critico);
        $this->assertTrue($hitos->where('tipo', 'entrega_final')->first()->es_critico);
    }

    public function test_proyecto_privado_fases_tienen_checklist_items(): void
    {
        $this->seed(PlantillaChecklistSeeder::class);
        $user    = $this->usuario();
        $cliente = $this->cliente();

        $payload = $this->payloadPrivado([
            'cliente_id'     => $cliente->id,
            'cantidad_fases' => 2,
        ]);

        $this->actingAs($user)->postJson('/api/proyectos', $payload)->assertCreated();

        $fases = FaseProyecto::all();
        $this->assertCount(2, $fases);

        // Cada fase debe tener al menos 1 item de checklist (plantilla "casa_privada" tiene 7)
        foreach ($fases as $fase) {
            $items = ItemChecklist::where('fase_id', $fase->id)->count();
            $this->assertGreaterThan(0, $items);
        }
    }

    public function test_proyecto_privado_fases_tienen_fechas_proporcionales(): void
    {
        $this->seed(PlantillaChecklistSeeder::class);
        $user    = $this->usuario();
        $cliente = $this->cliente();

        $payload = $this->payloadPrivado([
            'cliente_id'                => $cliente->id,
            'cantidad_fases'            => 3,
            'fecha_inicio_planificada'  => '2026-01-01',
            'fecha_fin_planificada'     => '2026-12-31',
        ]);

        $this->actingAs($user)->postJson('/api/proyectos', $payload)->assertCreated();

        $fases = FaseProyecto::orderBy('orden')->get();
        $this->assertCount(3, $fases);

        // Última fase termina en la fecha fin del proyecto
        $this->assertEquals('2026-12-31', $fases->last()->fecha_fin_planificada?->format('Y-m-d'));
        // Primera fase empieza en la fecha inicio
        $this->assertEquals('2026-01-01', $fases->first()->fecha_inicio_planificada?->format('Y-m-d'));
    }

    public function test_proyecto_privado_fases_con_config_porcentajes(): void
    {
        $this->seed(PlantillaChecklistSeeder::class);
        $user    = $this->usuario();
        $cliente = $this->cliente();

        $payload = $this->payloadPrivado([
            'cliente_id'      => $cliente->id,
            'cantidad_fases'  => 3,
            'fases_config'    => [
                ['nombre' => 'Cimentación', 'porcentaje' => 40],
                ['nombre' => 'Estructura',  'porcentaje' => 35],
                ['nombre' => 'Acabados',    'porcentaje' => 25],
            ],
        ]);

        $this->actingAs($user)->postJson('/api/proyectos', $payload)->assertCreated();

        $fases = FaseProyecto::orderBy('orden')->get();
        $this->assertEquals('Cimentación', $fases[0]->nombre);
        $this->assertEquals('Estructura',  $fases[1]->nombre);
        $this->assertEquals('Acabados',    $fases[2]->nombre);
    }

    // ═══════════════════════════════════════════════════════════
    // Cascade: Proyecto Social
    // ═══════════════════════════════════════════════════════════

    public function test_proyecto_social_genera_viviendas_almacen_e_hitos(): void
    {
        $this->seed(PlantillaChecklistSeeder::class);
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $payload = $this->payloadSocial([
            'entidad_estatal_id'   => $entidad->id,
            'cantidad_beneficiarios' => 5,
        ]);

        $res = $this->actingAs($user)
            ->postJson('/api/proyectos', $payload)
            ->assertCreated()
            ->json('data');

        $proyId = $res['id'];

        // 5 viviendas
        $this->assertEquals(5, Vivienda::where('proyecto_id', $proyId)->count());

        // Almacén
        $this->assertDatabaseCount('almacenes', 1);

        // Hitos de cronograma (mínimo 2)
        $this->assertGreaterThanOrEqual(2, Hito::where('proyecto_id', $proyId)->count());
    }

    public function test_proyecto_social_viviendas_tienen_codigo_correcto(): void
    {
        $this->seed(PlantillaChecklistSeeder::class);
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $payload = $this->payloadSocial([
            'entidad_estatal_id'     => $entidad->id,
            'cantidad_beneficiarios' => 3,
        ]);

        $res = $this->actingAs($user)->postJson('/api/proyectos', $payload)->assertCreated()->json('data');

        $codigo = $res['codigo'];
        $vivs = Vivienda::where('proyecto_id', $res['id'])->orderBy('id')->get();
        $this->assertEquals("VIV-{$codigo}-001", $vivs[0]->codigo);
        $this->assertEquals("VIV-{$codigo}-002", $vivs[1]->codigo);
        $this->assertEquals("VIV-{$codigo}-003", $vivs[2]->codigo);
    }

    public function test_proyecto_social_viviendas_tienen_checklist_items(): void
    {
        $this->seed(PlantillaChecklistSeeder::class);
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $payload = $this->payloadSocial([
            'entidad_estatal_id'     => $entidad->id,
            'cantidad_beneficiarios' => 2,
        ]);

        $this->actingAs($user)->postJson('/api/proyectos', $payload)->assertCreated();

        $vivs = Vivienda::all();
        foreach ($vivs as $v) {
            $this->assertGreaterThan(0, ItemChecklist::where('vivienda_id', $v->id)->count());
        }
    }

    public function test_proyecto_social_con_productos_contractuales(): void
    {
        $this->seed(PlantillaChecklistSeeder::class);
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $payload = $this->payloadSocial([
            'entidad_estatal_id'          => $entidad->id,
            'cantidad_beneficiarios'      => 2,
            'productos_contractuales'     => [
                ['nombre' => 'Anticipo',     'porcentaje' => 30, 'fecha_planificada_cobro' => '2026-08-01'],
                ['nombre' => 'Intermedio',   'porcentaje' => 50, 'fecha_planificada_cobro' => '2026-12-01'],
                ['nombre' => 'Liquidación',  'porcentaje' => 20, 'fecha_planificada_cobro' => '2027-05-01'],
            ],
        ]);

        $res = $this->actingAs($user)->postJson('/api/proyectos', $payload)->assertCreated()->json('data');
        $proyId = $res['id'];

        // 3 hitos de cobro (tipo producto_sicooes)
        $hitosCobro = HitoCobro::where('proyecto_id', $proyId)->get();
        $this->assertEquals(3, $hitosCobro->count());
        $this->assertEquals('producto_sicooes', $hitosCobro->first()->tipo);

        // 3 hitos de pago además de los 2 de cronograma
        $hitosTotal = Hito::where('proyecto_id', $proyId)->count();
        $this->assertEquals(5, $hitosTotal); // 2 cronograma + 3 cobros

        // Montos calculados desde presupuesto_referencial (1_000_000)
        $anticipo = $hitosCobro->where('nombre', 'Anticipo')->first();
        $this->assertNotNull($anticipo);
        $this->assertEquals(300_000, (float) $anticipo->monto_calculado); // 30% de 1_000_000
    }

    // ═══════════════════════════════════════════════════════════
    // Validaciones de negocio (422)
    // ═══════════════════════════════════════════════════════════

    public function test_social_requiere_entidad_estatal(): void
    {
        $user = $this->usuario();
        $this->actingAs($user)
            ->postJson('/api/proyectos', $this->payloadSocial())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['entidad_estatal_id']);
    }

    public function test_privado_requiere_cliente(): void
    {
        $user = $this->usuario();
        $this->actingAs($user)
            ->postJson('/api/proyectos', $this->payloadPrivado())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cliente_id']);
    }

    public function test_fases_config_suma_distinta_de_100_retorna_422(): void
    {
        $this->seed(PlantillaChecklistSeeder::class);
        $user    = $this->usuario();
        $cliente = $this->cliente();

        $payload = $this->payloadPrivado([
            'cliente_id'     => $cliente->id,
            'cantidad_fases' => 2,
            'fases_config'   => [
                ['nombre' => 'Fase 1', 'porcentaje' => 60],
                ['nombre' => 'Fase 2', 'porcentaje' => 30], // suma = 90, no 100
            ],
        ]);

        $this->actingAs($user)
            ->postJson('/api/proyectos', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['fases_config']);
    }

    public function test_productos_suma_distinta_de_100_retorna_422(): void
    {
        $this->seed(PlantillaChecklistSeeder::class);
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $payload = $this->payloadSocial([
            'entidad_estatal_id'      => $entidad->id,
            'productos_contractuales' => [
                ['nombre' => 'P1', 'porcentaje' => 40, 'fecha_planificada_cobro' => '2026-09-01'],
                ['nombre' => 'P2', 'porcentaje' => 40, 'fecha_planificada_cobro' => '2027-02-01'],
            ], // suma = 80
        ]);

        $this->actingAs($user)
            ->postJson('/api/proyectos', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['productos_contractuales']);
    }

    public function test_producto_con_fecha_fuera_de_rango_retorna_422(): void
    {
        $this->seed(PlantillaChecklistSeeder::class);
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $payload = $this->payloadSocial([
            'entidad_estatal_id'      => $entidad->id,
            'productos_contractuales' => [
                ['nombre' => 'P1', 'porcentaje' => 100, 'fecha_planificada_cobro' => '2025-01-01'], // antes del inicio
            ],
        ]);

        $this->actingAs($user)
            ->postJson('/api/proyectos', $payload)
            ->assertUnprocessable();
    }

    public function test_fecha_fin_antes_de_inicio_retorna_422(): void
    {
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $payload = $this->payloadSocial([
            'entidad_estatal_id'       => $entidad->id,
            'fecha_inicio_planificada' => '2027-01-01',
            'fecha_fin_planificada'    => '2026-01-01',
        ]);

        $this->actingAs($user)
            ->postJson('/api/proyectos', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['fecha_fin_planificada']);
    }

    // ═══════════════════════════════════════════════════════════
    // Rollback en error de cascada
    // ═══════════════════════════════════════════════════════════

    public function test_fallo_en_cascada_hace_rollback_completo(): void
    {
        // NO sembrar plantillas — CascadaProyectoService no falla sin ellas
        // pero podemos forzar un fallo con una entidad_estatal_id inválida
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $payload = $this->payloadSocial([
            'entidad_estatal_id'     => $entidad->id,
            'cantidad_beneficiarios' => 10,
            // Forzar error de cascada con producto con fecha inválida
            'productos_contractuales' => [
                ['nombre' => 'Test', 'porcentaje' => 100, 'fecha_planificada_cobro' => '2020-01-01'],
            ],
        ]);

        $this->actingAs($user)
            ->postJson('/api/proyectos', $payload)
            ->assertUnprocessable();

        // Nada debe haber quedado en BD
        $this->assertDatabaseCount('proyectos', 0);
        $this->assertDatabaseCount('almacenes', 0);
        $this->assertDatabaseCount('viviendas', 0);
        $this->assertDatabaseCount('hitos', 0);
    }

    // ═══════════════════════════════════════════════════════════
    // Permisos (403)
    // ═══════════════════════════════════════════════════════════

    public function test_crear_proyecto_sin_permiso_retorna_403(): void
    {
        $rol = Rol::create([
            'nombre'         => 'sin_permisos',
            'nombre_visible' => 'Sin Permisos',
            'es_sistema'     => false,
            'estado'         => 'activo',
        ]);
        // es_admin_central = false + sin permisos = 403
        $user = $this->usuario($rol, false);

        $entidad = $this->entidad();
        $payload = $this->payloadSocial(['entidad_estatal_id' => $entidad->id]);

        $this->actingAs($user)
            ->postJson('/api/proyectos', $payload)
            ->assertForbidden();
    }

    // ═══════════════════════════════════════════════════════════
    // Filtros y búsqueda
    // ═══════════════════════════════════════════════════════════

    public function test_filtrar_proyectos_por_categoria(): void
    {
        $user = $this->usuario();

        Proyecto::create(array_merge($this->payloadSocial(), ['codigo' => 'PRJ-2026-0001', 'estado' => 'formulacion', 'creado_por_id' => $user->id]));
        Proyecto::create(array_merge($this->payloadPrivado(), ['codigo' => 'PRJ-2026-0002', 'estado' => 'formulacion', 'creado_por_id' => $user->id]));

        $res = $this->actingAs($user)
            ->getJson('/api/proyectos?categoria=social')
            ->assertOk()
            ->json();

        $this->assertEquals(1, $res['total']);
        $this->assertEquals('social', $res['data'][0]['categoria']);
    }

    public function test_busqueda_por_nombre_retorna_resultados_correctos(): void
    {
        $user = $this->usuario();

        Proyecto::create(array_merge($this->payloadSocial(['nombre' => 'Viviendas Norte']), ['codigo' => 'PRJ-2026-0001', 'estado' => 'formulacion', 'creado_por_id' => $user->id]));
        Proyecto::create(array_merge($this->payloadSocial(['nombre' => 'Oficinas Sur']), ['codigo' => 'PRJ-2026-0002', 'estado' => 'formulacion', 'creado_por_id' => $user->id]));

        $res = $this->actingAs($user)
            ->getJson('/api/proyectos?busqueda=Norte')
            ->assertOk()
            ->json();

        $this->assertEquals(1, $res['total']);
        $this->assertStringContainsString('Norte', $res['data'][0]['nombre']);
    }

    public function test_paginacion_funciona_correctamente(): void
    {
        $user = $this->usuario();

        for ($i = 1; $i <= 5; $i++) {
            Proyecto::create(array_merge($this->payloadSocial(), ['codigo' => "PRJ-2026-{$i}", 'estado' => 'formulacion', 'creado_por_id' => $user->id]));
        }

        $res = $this->actingAs($user)
            ->getJson('/api/proyectos?per_page=2&page=1')
            ->assertOk()
            ->json();

        $this->assertCount(2, $res['data']);
        $this->assertEquals(5, $res['total']);
        $this->assertEquals(3, $res['last_page']);
    }

    // ═══════════════════════════════════════════════════════════
    // Estadísticas
    // ═══════════════════════════════════════════════════════════

    public function test_estadisticas_retornan_estructura_esperada(): void
    {
        $user = $this->usuario();

        $this->actingAs($user)
            ->getJson('/api/proyectos/estadisticas')
            ->assertOk()
            ->assertJsonStructure([
                'status',
                'data' => ['total', 'por_estado', 'por_categoria', 'avance_promedio'],
            ]);
    }

    // ═══════════════════════════════════════════════════════════
    // Código PRJ auto-generado
    // ═══════════════════════════════════════════════════════════

    public function test_codigo_proyecto_se_genera_automaticamente(): void
    {
        $this->seed(PlantillaChecklistSeeder::class);
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $payload = $this->payloadSocial(['entidad_estatal_id' => $entidad->id]);

        $res = $this->actingAs($user)
            ->postJson('/api/proyectos', $payload)
            ->assertCreated()
            ->json('data');

        $anio = date('Y');
        $this->assertStringStartsWith("PRJ-{$anio}-", $res['codigo']);
    }

    public function test_proyectos_consecutivos_tienen_codigos_distintos(): void
    {
        $this->seed(PlantillaChecklistSeeder::class);
        $user    = $this->usuario();
        $entidad = $this->entidad();

        $r1 = $this->actingAs($user)->postJson('/api/proyectos', $this->payloadSocial(['entidad_estatal_id' => $entidad->id]))->assertCreated()->json('data.codigo');
        $r2 = $this->actingAs($user)->postJson('/api/proyectos', $this->payloadSocial(['entidad_estatal_id' => $entidad->id]))->assertCreated()->json('data.codigo');

        $this->assertNotEquals($r1, $r2);
    }
}
