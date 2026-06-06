<?php

namespace Tests\Feature\Proyectos\Dashboard;

use App\Models\Almacen;
use App\Models\Beneficiario;
use App\Models\EntidadEstatal;
use App\Models\FaseProyecto;
use App\Models\Hito;
use App\Models\ItemChecklist;
use App\Models\Permiso;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\User;
use App\Models\Vivienda;
use App\Models\Cliente;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProyectoDashboardTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function rolGerente(): Rol
    {
        return Rol::firstOrCreate(
            ['nombre' => 'gerente'],
            ['nombre_visible' => 'Gerente', 'es_sistema' => true, 'estado' => 'activo']
        );
    }

    private function usuario(bool $esAdmin = true, ?Rol $rol = null): User
    {
        $rol ??= $this->rolGerente();
        return User::create([
            'nombre'           => 'Test',
            'apellido_paterno' => 'Dashboard',
            'ci'               => 'CI-' . uniqid(),
            'email'            => 'dash-' . uniqid() . '@test.com',
            'password'         => bcrypt('password'),
            'rol_id'           => $rol->id,
            'estado'           => 'activo',
            'es_admin_central' => $esAdmin,
        ]);
    }

    private function entidad(): EntidadEstatal
    {
        return EntidadEstatal::create([
            'nombre' => 'Entidad Test ' . uniqid(),
            'nivel'  => 'municipal',
            'estado' => 'activa',
        ]);
    }

    private function cliente(): Cliente
    {
        return Cliente::create([
            'nombre_completo'    => 'Cliente Test',
            'tipo'               => 'persona_natural',
            'documento_tipo'     => 'ci',
            'documento_numero'   => 'CI-' . uniqid(),
            'telefono_principal' => '71234567',
            'estado'             => 'activo',
        ]);
    }

    private function proyectoSocial(User $user, EntidadEstatal $entidad, array $extra = []): Proyecto
    {
        return Proyecto::create(array_merge([
            'codigo'                   => 'PRJ-' . uniqid(),
            'nombre'                   => 'Proyecto Social Test',
            'categoria'                => 'social',
            'estado'                   => 'en_ejecucion',
            'prioridad'                => 'alta',
            'presupuesto_referencial'  => 500000,
            'fecha_inicio_planificada' => '2026-01-01',
            'fecha_fin_planificada'    => '2026-12-31',
            'entidad_estatal_id'       => $entidad->id,
            'cantidad_beneficiarios'   => 20,
            'creado_por_id'            => $user->id,
        ], $extra));
    }

    private function proyectoPrivado(User $user, Cliente $cliente, array $extra = []): Proyecto
    {
        return Proyecto::create(array_merge([
            'codigo'                   => 'PRJ-' . uniqid(),
            'nombre'                   => 'Proyecto Privado Test',
            'categoria'                => 'privado',
            'estado'                   => 'en_ejecucion',
            'prioridad'                => 'media',
            'presupuesto_referencial'  => 300000,
            'fecha_inicio_planificada' => '2026-01-01',
            'fecha_fin_planificada'    => '2026-12-31',
            'cliente_id'               => $cliente->id,
            'creado_por_id'            => $user->id,
        ], $extra));
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_dashboard_endpoint_requiere_autenticacion(): void
    {
        $user     = $this->usuario();
        $entidad  = $this->entidad();
        $proyecto = $this->proyectoSocial($user, $entidad);

        $this->getJson("/api/proyectos/{$proyecto->id}/dashboard")->assertUnauthorized();
    }

    public function test_dashboard_endpoint_retorna_estructura_correcta(): void
    {
        $user     = $this->usuario();
        $entidad  = $this->entidad();
        $proyecto = $this->proyectoSocial($user, $entidad);

        $res = $this->actingAs($user)
            ->getJson("/api/proyectos/{$proyecto->id}/dashboard")
            ->assertOk()
            ->assertJsonPath('status', 'success');

        $data = $res->json('data');
        $this->assertArrayHasKey('proyecto', $data);
        $this->assertArrayHasKey('avance', $data);
        $this->assertArrayHasKey('gantt', $data);
        $this->assertArrayHasKey('almacen', $data);
        $this->assertArrayHasKey('beneficiarios_resumen', $data);
        $this->assertArrayHasKey('hitos_proximos', $data);
        $this->assertArrayHasKey('transiciones_permitidas', $data);
    }

    public function test_avance_global_calcula_correctamente_desde_fases(): void
    {
        $user     = $this->usuario();
        $cliente  = $this->cliente();
        $proyecto = $this->proyectoPrivado($user, $cliente);

        FaseProyecto::create(['proyecto_id' => $proyecto->id, 'nombre' => 'Fase A', 'orden' => 1, 'estado' => 'completada', 'avance_porcentaje' => 100]);
        FaseProyecto::create(['proyecto_id' => $proyecto->id, 'nombre' => 'Fase B', 'orden' => 2, 'estado' => 'en_progreso', 'avance_porcentaje' => 50]);
        FaseProyecto::create(['proyecto_id' => $proyecto->id, 'nombre' => 'Fase C', 'orden' => 3, 'estado' => 'pendiente',  'avance_porcentaje' => 0]);

        $res = $this->actingAs($user)
            ->getJson("/api/proyectos/{$proyecto->id}/dashboard")
            ->assertOk();

        // avg(100, 50, 0) = 50
        $this->assertEquals(50.0, $res->json('data.avance.global'));
        $this->assertEquals(3, $res->json('data.avance.total_unidades'));
        $this->assertEquals(1, $res->json('data.avance.unidades_completadas'));
    }

    public function test_avance_global_calcula_correctamente_desde_viviendas(): void
    {
        $user     = $this->usuario();
        $entidad  = $this->entidad();
        $proyecto = $this->proyectoSocial($user, $entidad);

        // Solo viviendas con beneficiario aparecen en seguimiento
        $vivs = [
            ['estado' => 'entregada',   'porcentaje_avance' => 100],
            ['estado' => 'obra_gruesa', 'porcentaje_avance' => 50],
            ['estado' => 'planificada', 'porcentaje_avance' => 0],
            ['estado' => 'cimentacion', 'porcentaje_avance' => 25],
        ];
        foreach ($vivs as $i => $attrs) {
            $ben = Beneficiario::create([
                'proyecto_id'         => $proyecto->id,
                'codigo_beneficiario' => 'BEN-VIV-' . ($i + 1),
                'nombre'              => 'B' . ($i + 1),
                'apellido_paterno'    => 'Test',
                'ci'                  => 'CI-V-' . ($i + 1) . '-' . uniqid(),
                'telefono_principal'  => '71234567',
                'estado_seleccion'    => 'aceptado',
            ]);
            Vivienda::create(array_merge(
                ['codigo' => 'VIV-' . str_pad($i + 1, 3, '0', STR_PAD_LEFT), 'proyecto_id' => $proyecto->id, 'beneficiario_id' => $ben->id],
                $attrs
            ));
        }

        $res = $this->actingAs($user)
            ->getJson("/api/proyectos/{$proyecto->id}/dashboard")
            ->assertOk();

        // avg(100, 50, 0, 25) = 43.75
        $this->assertEquals(43.75, $res->json('data.avance.global'));
        $this->assertEquals(4, $res->json('data.avance.total_unidades'));
        $this->assertEquals(1, $res->json('data.avance.unidades_completadas'));
    }

    public function test_beneficiarios_resumen_presente_en_proyecto_social(): void
    {
        $user     = $this->usuario();
        $entidad  = $this->entidad();
        $proyecto = $this->proyectoSocial($user, $entidad, ['cantidad_beneficiarios' => 10]);

        // Crear 3 beneficiarios
        for ($i = 1; $i <= 3; $i++) {
            Beneficiario::create([
                'proyecto_id'         => $proyecto->id,
                'codigo_beneficiario' => 'BEN-' . $i . '-' . uniqid(),
                'nombre'              => "Benef {$i}",
                'apellido_paterno'    => 'Test',
                'ci'                  => "CI-BEN-{$i}-" . uniqid(),
                'telefono_principal'  => '71234567',
                'estado_seleccion'    => 'aceptado',
            ]);
        }

        $res = $this->actingAs($user)
            ->getJson("/api/proyectos/{$proyecto->id}/dashboard")
            ->assertOk();

        $benef = $res->json('data.beneficiarios_resumen');
        $this->assertNotNull($benef);
        $this->assertEquals(3, $benef['total_registrados']);
        $this->assertEquals(10, $benef['cupo_total']);
        $this->assertEquals(7, $benef['cupos_restantes']);
        $this->assertCount(3, $benef['ultimos']);
    }

    public function test_proyecto_privado_no_tiene_beneficiarios_resumen(): void
    {
        $user     = $this->usuario();
        $cliente  = $this->cliente();
        $proyecto = $this->proyectoPrivado($user, $cliente);

        $res = $this->actingAs($user)
            ->getJson("/api/proyectos/{$proyecto->id}/dashboard")
            ->assertOk();

        $this->assertNull($res->json('data.beneficiarios_resumen'));
    }

    public function test_gantt_privado_retorna_fases_con_posiciones(): void
    {
        $user     = $this->usuario();
        $cliente  = $this->cliente();
        $proyecto = $this->proyectoPrivado($user, $cliente);

        FaseProyecto::create(['proyecto_id' => $proyecto->id, 'nombre' => 'Fase 1', 'orden' => 1, 'estado' => 'en_progreso', 'avance_porcentaje' => 40,
            'fecha_inicio_planificada' => '2026-01-01', 'fecha_fin_planificada' => '2026-06-30']);
        FaseProyecto::create(['proyecto_id' => $proyecto->id, 'nombre' => 'Fase 2', 'orden' => 2, 'estado' => 'pendiente',  'avance_porcentaje' => 0,
            'fecha_inicio_planificada' => '2026-07-01', 'fecha_fin_planificada' => '2026-12-31']);

        $res = $this->actingAs($user)
            ->getJson("/api/proyectos/{$proyecto->id}/dashboard")
            ->assertOk();

        $gantt = $res->json('data.gantt');
        $this->assertCount(2, $gantt['items']);
        $this->assertEquals('fase', $gantt['items'][0]['tipo']);
        $this->assertArrayHasKey('left', $gantt['items'][0]);
        $this->assertArrayHasKey('width', $gantt['items'][0]);
        $this->assertNotNull($gantt['pos_hoy']);
    }

    public function test_almacen_presente_cuando_existe(): void
    {
        $user     = $this->usuario();
        $entidad  = $this->entidad();
        $proyecto = $this->proyectoSocial($user, $entidad);

        Almacen::create([
            'codigo'     => 'ALM-TEST-001',
            'nombre'     => 'Almacén del Proyecto',
            'proyecto_id' => $proyecto->id,
            'estado'     => 'activo',
        ]);

        $res = $this->actingAs($user)
            ->getJson("/api/proyectos/{$proyecto->id}/dashboard")
            ->assertOk();

        $almacen = $res->json('data.almacen');
        $this->assertTrue($almacen['existe']);
        $this->assertEquals('ALM-TEST-001', $almacen['codigo']);
    }

    public function test_almacen_ausente_cuando_no_existe(): void
    {
        $user     = $this->usuario();
        $cliente  = $this->cliente();
        $proyecto = $this->proyectoPrivado($user, $cliente);

        $res = $this->actingAs($user)
            ->getJson("/api/proyectos/{$proyecto->id}/dashboard")
            ->assertOk();

        $this->assertFalse($res->json('data.almacen.existe'));
    }

    public function test_checklist_items_incluidos_en_avance_por_unidad(): void
    {
        $user     = $this->usuario();
        $entidad  = $this->entidad();
        $proyecto = $this->proyectoSocial($user, $entidad);

        $ben = Beneficiario::create([
            'proyecto_id'         => $proyecto->id,
            'codigo_beneficiario' => 'BEN-CK-001',
            'nombre'              => 'Check',
            'apellido_paterno'    => 'Test',
            'ci'                  => 'CI-CK-' . uniqid(),
            'telefono_principal'  => '71234567',
            'estado_seleccion'    => 'aceptado',
        ]);
        $vivienda = Vivienda::create(['codigo' => 'VIV-001', 'proyecto_id' => $proyecto->id, 'beneficiario_id' => $ben->id, 'estado' => 'obra_gruesa', 'porcentaje_avance' => 50]);

        ItemChecklist::create(['vivienda_id' => $vivienda->id, 'nombre' => 'Cimientos revisados', 'orden' => 1, 'ponderacion' => 50, 'estado' => 'completado']);
        ItemChecklist::create(['vivienda_id' => $vivienda->id, 'nombre' => 'Paredes levantadas', 'orden' => 2, 'ponderacion' => 50, 'estado' => 'pendiente']);

        $res = $this->actingAs($user)
            ->getJson("/api/proyectos/{$proyecto->id}/dashboard")
            ->assertOk();

        $unidad = $res->json('data.avance.avance_por_unidad.0');
        $this->assertEquals(2, $unidad['checklist_total']);
        $this->assertEquals(1, $unidad['checklist_completados']);
        $this->assertCount(2, $unidad['items_checklist']);
    }

    public function test_hitos_proximos_incluidos_y_ordenados(): void
    {
        $user     = $this->usuario();
        $entidad  = $this->entidad();
        $proyecto = $this->proyectoSocial($user, $entidad);

        Hito::create(['proyecto_id' => $proyecto->id, 'nombre' => 'Entrega final', 'fecha_planificada' => '2026-12-01', 'tipo' => 'entrega_final', 'es_critico' => true, 'estado' => 'pendiente']);
        Hito::create(['proyecto_id' => $proyecto->id, 'nombre' => 'Inicio obra',   'fecha_planificada' => '2026-06-01', 'tipo' => 'inspeccion',    'es_critico' => true, 'estado' => 'pendiente']);

        $res = $this->actingAs($user)
            ->getJson("/api/proyectos/{$proyecto->id}/dashboard")
            ->assertOk();

        $hitos = $res->json('data.hitos_proximos');
        $this->assertCount(2, $hitos);
        // Deben estar ordenados por fecha_planificada asc
        $this->assertEquals('2026-06-01', $hitos[0]['fecha_planificada']);
        $this->assertEquals('2026-12-01', $hitos[1]['fecha_planificada']);
    }

    public function test_usuario_sin_permiso_puede_ver_dashboard(): void
    {
        $rol     = $this->rolGerente();
        $user    = $this->usuario(false, $rol); // no es admin central
        $entidad = $this->entidad();
        $proyecto = $this->proyectoSocial($this->usuario(), $entidad);

        $this->actingAs($user)
            ->getJson("/api/proyectos/{$proyecto->id}/dashboard")
            ->assertOk();
    }

    public function test_editar_fase_actualiza_fechas(): void
    {
        $user     = $this->usuario();
        $cliente  = $this->cliente();
        $proyecto = $this->proyectoPrivado($user, $cliente);

        $fase = FaseProyecto::create([
            'proyecto_id'              => $proyecto->id,
            'nombre'                   => 'Fase Original',
            'orden'                    => 1,
            'estado'                   => 'pendiente',
            'avance_porcentaje'        => 0,
            'fecha_inicio_planificada' => '2026-01-01',
            'fecha_fin_planificada'    => '2026-06-30',
        ]);

        $this->actingAs($user)
            ->putJson("/api/fases/{$fase->id}", [
                'nombre'                   => 'Fase Actualizada',
                'fecha_inicio_planificada' => '2026-02-01',
                'fecha_fin_planificada'    => '2026-07-31',
            ])
            ->assertOk();

        $this->assertDatabaseHas('fases_proyecto', [
            'id'                       => $fase->id,
            'nombre'                   => 'Fase Actualizada',
            'fecha_inicio_planificada' => '2026-02-01',
            'fecha_fin_planificada'    => '2026-07-31',
        ]);
    }

    public function test_exportar_pdf_retorna_archivo(): void
    {
        $user     = $this->usuario();
        $entidad  = $this->entidad();
        $proyecto = $this->proyectoSocial($user, $entidad);

        $this->actingAs($user)
            ->get("/api/proyectos/{$proyecto->id}/exportar?tipo=pdf")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_exportar_excel_retorna_csv(): void
    {
        $user     = $this->usuario();
        $entidad  = $this->entidad();
        $proyecto = $this->proyectoSocial($user, $entidad);

        $res = $this->actingAs($user)
            ->get("/api/proyectos/{$proyecto->id}/exportar?tipo=excel")
            ->assertOk();

        $this->assertStringContainsString('text/csv', $res->headers->get('content-type'));
    }

    public function test_conteo_viviendas_y_fases_preciso(): void
    {
        $user     = $this->usuario();
        $entidad  = $this->entidad();
        $proyecto = $this->proyectoSocial($user, $entidad, ['cantidad_beneficiarios' => 5]);

        for ($i = 1; $i <= 5; $i++) {
            $ben = Beneficiario::create([
                'proyecto_id'         => $proyecto->id,
                'codigo_beneficiario' => "BEN-CT-{$i}",
                'nombre'              => "Ben{$i}",
                'apellido_paterno'    => 'Test',
                'ci'                  => "CI-CT-{$i}-" . uniqid(),
                'telefono_principal'  => '71234567',
                'estado_seleccion'    => 'aceptado',
            ]);
            Vivienda::create(['codigo' => "VIV-{$i}", 'proyecto_id' => $proyecto->id, 'beneficiario_id' => $ben->id, 'estado' => 'planificada', 'porcentaje_avance' => 0]);
        }

        $res = $this->actingAs($user)
            ->getJson("/api/proyectos/{$proyecto->id}/dashboard")
            ->assertOk();

        $this->assertEquals(5, $res->json('data.avance.total_unidades'));
        $this->assertEquals(5, $res->json('data.beneficiarios_resumen.cupo_total'));
    }
}
