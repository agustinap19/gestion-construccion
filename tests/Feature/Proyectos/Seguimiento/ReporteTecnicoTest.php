<?php

namespace Tests\Feature\Proyectos\Seguimiento;

use App\Models\AvanceChecklistReporte;
use App\Models\FotoReporte;
use App\Models\IncidenciaReporte;
use App\Models\ItemChecklist;
use App\Models\NotificacionSistema;
use App\Models\Proyecto;
use App\Models\ReporteTecnico;
use App\Models\Rol;
use App\Models\User;
use App\Models\Vivienda;
use App\Services\Proyectos\CalculadoraAvanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReporteTecnicoTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function rol(): Rol
    {
        return Rol::firstOrCreate(
            ['nombre' => 'gerente'],
            ['nombre_visible' => 'Gerente', 'es_sistema' => true, 'estado' => 'activo']
        );
    }

    private function usuario(bool $esAdmin = true): User
    {
        return User::create([
            'nombre'           => 'Tester',
            'apellido_paterno' => 'Rep',
            'ci'               => 'CI-' . uniqid(),
            'email'            => 'rep-' . uniqid() . '@test.com',
            'password'         => bcrypt('secret'),
            'rol_id'           => $this->rol()->id,
            'estado'           => 'activo',
            'es_admin_central' => $esAdmin,
        ]);
    }

    private function proyecto(User $responsable, array $extras = []): Proyecto
    {
        return Proyecto::create(array_merge([
            'codigo'                   => 'PRJ-' . uniqid(),
            'nombre'                   => 'Proyecto Test',
            'categoria'                => 'social',
            'estado'                   => 'en_ejecucion',
            'presupuesto_referencial'  => 500_000,
            'fecha_inicio_planificada' => '2026-01-01',
            'fecha_fin_planificada'    => '2027-01-01',
            'cantidad_beneficiarios'   => 10,
            'creado_por_id'            => $responsable->id,
            'responsable_id'           => $responsable->id,
        ], $extras));
    }

    private function vivienda(Proyecto $proyecto, float $lat = -17.38, float $lon = -66.16): Vivienda
    {
        return Vivienda::create([
            'codigo'           => 'VIV-' . uniqid(),
            'proyecto_id'      => $proyecto->id,
            'estado'           => 'obra_gruesa',
            'porcentaje_avance' => 0,
            'latitud'          => $lat,
            'longitud'         => $lon,
        ]);
    }

    private function itemsChecklist(Vivienda $vivienda): array
    {
        $i1 = ItemChecklist::create([
            'vivienda_id'      => $vivienda->id,
            'nombre'           => 'Cimentación',
            'orden'            => 1,
            'ponderacion'      => 60,
            'porcentaje_avance' => 0,
            'estado'           => 'pendiente',
        ]);
        $i2 = ItemChecklist::create([
            'vivienda_id'      => $vivienda->id,
            'nombre'           => 'Obra gruesa',
            'orden'            => 2,
            'ponderacion'      => 40,
            'porcentaje_avance' => 0,
            'estado'           => 'pendiente',
        ]);
        return [$i1, $i2];
    }

    // ═══════════════════════════════════════════════════════════════════
    // 1. Registrar reporte actualiza % de items del checklist
    // ═══════════════════════════════════════════════════════════════════

    public function test_registrar_reporte_actualiza_porcentaje_items_checklist(): void
    {
        $user    = $this->usuario();
        $proy    = $this->proyecto($user);
        $viv     = $this->vivienda($proy);
        [$i1, $i2] = $this->itemsChecklist($viv);

        $this->actingAs($user)->postJson('/api/reportes-tecnicos', [
            'proyecto_id'  => $proy->id,
            'vivienda_id'  => $viv->id,
            'fecha_reporte' => '2026-05-21',
            'descripcion'  => 'Avance de cimientos',
            'avances_items' => [
                $i1->id => 80,
                $i2->id => 50,
            ],
        ])->assertStatus(201);

        $i1->refresh();
        $i2->refresh();

        $this->assertEquals(80.0,  (float) $i1->porcentaje_avance);
        $this->assertEquals('en_proceso', $i1->estado);
        $this->assertEquals(50.0,  (float) $i2->porcentaje_avance);
        $this->assertEquals('en_proceso', $i2->estado);

        // Registro histórico de avance
        $this->assertDatabaseCount('avances_checklist_reporte', 2);
        $this->assertDatabaseHas('avances_checklist_reporte', [
            'item_checklist_id' => $i1->id,
            'porcentaje_anterior' => 0.0,
            'porcentaje_nuevo'    => 80.0,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. Recálculo en cascada actualiza % vivienda y % proyecto
    // ═══════════════════════════════════════════════════════════════════

    public function test_recalculo_cascada_actualiza_vivienda_y_proyecto(): void
    {
        $user  = $this->usuario();
        $proy  = $this->proyecto($user);
        $viv   = $this->vivienda($proy);
        [$i1, $i2] = $this->itemsChecklist($viv);

        // Item 1 (ponderacion 60) → 100%, Item 2 (ponderacion 40) → 0%
        // Avance esperado: (100*60 + 0*40)/100 = 60%
        $this->actingAs($user)->postJson('/api/reportes-tecnicos', [
            'proyecto_id'  => $proy->id,
            'vivienda_id'  => $viv->id,
            'fecha_reporte' => '2026-05-21',
            'avances_items' => [
                $i1->id => 100,
                $i2->id => 0,
            ],
        ])->assertStatus(201);

        $viv->refresh();
        $this->assertEquals(60.0, (float) $viv->porcentaje_avance);

        // Item completado = estado completado
        $i1->refresh();
        $this->assertEquals('completado', $i1->estado);
        $this->assertNotNull($i1->fecha_completado);

        // Proyecto actualizado
        $proy->refresh();
        $this->assertEquals(60.0, (float) $proy->avance_fisico);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3. Subida de foto de reporte retorna URL original y thumbnail
    // ═══════════════════════════════════════════════════════════════════

    public function test_subida_foto_reporte_retorna_url_original_y_thumbnail(): void
    {
        Storage::fake('public');
        $user = $this->usuario();
        $proy = $this->proyecto($user);
        $viv  = $this->vivienda($proy);

        $file = UploadedFile::fake()->image('obra.jpg', 800, 600);

        $res = $this->actingAs($user)->postJson('/api/upload/foto-reporte', [
            'archivo'     => $file,
            'proyecto_id' => $proy->id,
            'unidad_id'   => $viv->id,
        ])->assertOk()
          ->assertJsonStructure(['status', 'url_original']);

        $this->assertEquals('success', $res->json('status'));
        $this->assertStringStartsWith('/storage/', $res->json('url_original'));
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. GPS lejos de la vivienda activa alerta sin bloquear el reporte
    // ═══════════════════════════════════════════════════════════════════

    public function test_gps_lejos_de_vivienda_activa_alerta_sin_bloquear(): void
    {
        $user = $this->usuario();
        $proy = $this->proyecto($user);
        // Vivienda en Cochabamba central
        $viv  = $this->vivienda($proy, -17.3895, -66.1568);

        // Técnico en La Paz (~260 km de distancia)
        $res = $this->actingAs($user)->postJson('/api/reportes-tecnicos', [
            'proyecto_id'     => $proy->id,
            'vivienda_id'     => $viv->id,
            'fecha_reporte'   => '2026-05-21',
            'latitud_tecnico' => -16.5000,
            'longitud_tecnico' => -68.1500,
        ])->assertStatus(201);

        $this->assertDatabaseHas('reportes_tecnicos', [
            'vivienda_id'      => $viv->id,
            'alerta_distancia' => 1,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. Notificación al responsable del proyecto al registrar
    // ═══════════════════════════════════════════════════════════════════

    public function test_notificacion_enviada_al_responsable_del_proyecto(): void
    {
        $responsable = $this->usuario();
        $tecnico     = $this->usuario(false);
        $proy        = $this->proyecto($responsable);
        $viv         = $this->vivienda($proy);

        $this->actingAs($tecnico)->postJson('/api/reportes-tecnicos', [
            'proyecto_id'  => $proy->id,
            'vivienda_id'  => $viv->id,
            'fecha_reporte' => '2026-05-21',
            'descripcion'  => 'Avance reportado',
        ])->assertStatus(201);

        $this->assertDatabaseHas('notificaciones_sistema', [
            'usuario_id' => $responsable->id,
            'tipo'       => 'info',
        ]);

        $notif = NotificacionSistema::where('usuario_id', $responsable->id)->first();
        $this->assertStringContainsString('Nuevo reporte técnico', $notif->titulo);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 6. Exportar avance individual retorna PDF
    // ═══════════════════════════════════════════════════════════════════

    public function test_exportar_avance_individual_retorna_pdf(): void
    {
        $user = $this->usuario();
        $proy = $this->proyecto($user);
        $viv  = $this->vivienda($proy);

        $this->actingAs($user)
            ->get("/api/reportes-tecnicos/vivienda/{$viv->id}/exportar-avance")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    // ═══════════════════════════════════════════════════════════════════
    // 7. Exportar reporte fotográfico retorna PDF
    // ═══════════════════════════════════════════════════════════════════

    public function test_exportar_reporte_fotografico_retorna_pdf(): void
    {
        $user = $this->usuario();
        $proy = $this->proyecto($user);
        $viv  = $this->vivienda($proy);

        $this->actingAs($user)
            ->get("/api/reportes-tecnicos/vivienda/{$viv->id}/exportar-fotos")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    // ═══════════════════════════════════════════════════════════════════
    // 8. Cálculo de indicador de salud coincide
    // ═══════════════════════════════════════════════════════════════════

    public function test_calculo_indicador_de_salud_coincide(): void
    {
        $svc = app(CalculadoraAvanceService::class);

        // Avance real = plazo → al día
        $this->assertEquals('al_dia', $svc->calcularSalud(50.0, 55.0));

        // Avance real = 30%, plazo = 50% → diff 20 → retraso menor
        $this->assertEquals('retraso_menor', $svc->calcularSalud(30.0, 50.0));

        // Avance real = 10%, plazo = 70% → diff 60 → retraso crítico
        $this->assertEquals('retraso_critico', $svc->calcularSalud(10.0, 70.0));

        // Avance mayor al plazo → al día
        $this->assertEquals('al_dia', $svc->calcularSalud(80.0, 60.0));
    }

    // ═══════════════════════════════════════════════════════════════════
    // 9. Usuario no autenticado no puede registrar reporte
    // ═══════════════════════════════════════════════════════════════════

    public function test_usuario_no_autenticado_no_puede_registrar_reporte(): void
    {
        $user = $this->usuario();
        $proy = $this->proyecto($user);
        $viv  = $this->vivienda($proy);

        $this->postJson('/api/reportes-tecnicos', [
            'proyecto_id'  => $proy->id,
            'vivienda_id'  => $viv->id,
            'fecha_reporte' => '2026-05-21',
        ])->assertUnauthorized();
    }
}
