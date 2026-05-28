<?php

namespace Tests\Feature\Reportes;

use App\Models\Beneficiario;
use App\Models\LogExportacion;
use App\Models\Personal;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ExportacionTest extends TestCase
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

    private function usuario(): User
    {
        return User::create([
            'nombre'           => 'Admin',
            'apellido_paterno' => 'Export',
            'ci'               => 'CI-' . uniqid(),
            'email'            => 'exp-' . uniqid() . '@test.com',
            'password'         => bcrypt('secret'),
            'rol_id'           => $this->rol()->id,
            'estado'           => 'activo',
            'es_admin_central' => true,
        ]);
    }

    private function proyecto(User $user): Proyecto
    {
        return Proyecto::create([
            'codigo'                   => 'EXP-' . uniqid(),
            'nombre'                   => 'Proyecto Export Test',
            'categoria'                => 'social',
            'estado'                   => 'en_ejecucion',
            'presupuesto_referencial'  => 150_000,
            'fecha_inicio_planificada' => '2026-01-01',
            'fecha_fin_planificada'    => '2027-01-01',
            'cantidad_beneficiarios'   => 10,
            'creado_por_id'            => $user->id,
            'responsable_id'           => $user->id,
        ]);
    }

    private function beneficiario(int $proyectoId, User $user): Beneficiario
    {
        return Beneficiario::create([
            'codigo_beneficiario'   => 'BEN-' . uniqid(),
            'proyecto_id'           => $proyectoId,
            'usuario_registrador_id' => $user->id,
            'nombre'                => 'María',
            'apellido_paterno'      => 'Quispe',
            'ci'                    => 'CI-' . uniqid(),
            'telefono_principal'    => '71234567',
            'genero'                => 'femenino',
            'estado_civil'          => 'casado',
            'estado_seleccion'      => 'candidato',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════
    // 1. Exportar lista de proyectos — PDF
    // ═══════════════════════════════════════════════════════════════

    public function test_exportar_proyectos_pdf_retorna_200_y_content_type_pdf(): void
    {
        $user = $this->usuario();
        $this->proyecto($user);

        $response = $this->actingAs($user)
            ->get('/api/exportar/proyectos?formato=pdf');

        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. Exportar lista de proyectos — Excel
    // ═══════════════════════════════════════════════════════════════

    public function test_exportar_proyectos_excel_retorna_200_y_content_type_excel(): void
    {
        $user = $this->usuario();
        $this->proyecto($user);

        $response = $this->actingAs($user)
            ->get('/api/exportar/proyectos?formato=excel');

        $response->assertStatus(200);
        $this->assertStringContainsString(
            'spreadsheetml',
            $response->headers->get('Content-Type')
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. Exportar avance de proyecto — PDF
    // ═══════════════════════════════════════════════════════════════

    public function test_exportar_avance_proyecto_pdf_retorna_200(): void
    {
        $user  = $this->usuario();
        $proy  = $this->proyecto($user);

        $response = $this->actingAs($user)
            ->get("/api/exportar/proyectos/{$proy->id}/avance?formato=pdf");

        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. Exportar beneficiarios de proyecto — PDF
    // ═══════════════════════════════════════════════════════════════

    public function test_exportar_beneficiarios_proyecto_pdf_retorna_200(): void
    {
        $user  = $this->usuario();
        $proy  = $this->proyecto($user);
        $this->beneficiario($proy->id, $user);

        $response = $this->actingAs($user)
            ->get("/api/exportar/proyectos/{$proy->id}/beneficiarios?formato=pdf");

        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. Ficha individual de beneficiario — PDF
    // ═══════════════════════════════════════════════════════════════

    public function test_ficha_beneficiario_retorna_pdf(): void
    {
        $user  = $this->usuario();
        $proy  = $this->proyecto($user);
        $benef = $this->beneficiario($proy->id, $user);

        $response = $this->actingAs($user)
            ->get("/api/exportar/beneficiarios/{$benef->id}/ficha");

        $response->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. No autenticado recibe 401
    // ═══════════════════════════════════════════════════════════════

    public function test_exportar_sin_autenticacion_retorna_401(): void
    {
        $this->getJson('/api/exportar/proyectos?formato=pdf')
            ->assertStatus(401);
    }

    // ═══════════════════════════════════════════════════════════════
    // 7. Cada exportación genera una entrada en logs_exportacion
    // ═══════════════════════════════════════════════════════════════

    public function test_exportar_crea_log_de_exportacion(): void
    {
        $user = $this->usuario();
        $this->proyecto($user);

        $this->assertDatabaseCount('logs_exportacion', 0);

        $this->actingAs($user)
            ->get('/api/exportar/proyectos?formato=pdf');

        $this->assertDatabaseCount('logs_exportacion', 1);
        $this->assertDatabaseHas('logs_exportacion', [
            'usuario_id' => $user->id,
            'recurso'    => 'proyectos',
            'formato'    => 'pdf',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════
    // 8. ZIP asíncrono se encola correctamente
    // ═══════════════════════════════════════════════════════════════

    public function test_actas_zip_encola_job_y_retorna_queued(): void
    {
        Queue::fake();

        $user = $this->usuario();
        $proy = $this->proyecto($user);

        $response = $this->actingAs($user)
            ->postJson("/api/exportar/proyectos/{$proy->id}/actas-zip");

        $response->assertStatus(200)
            ->assertJsonFragment(['status' => 'queued']);

        Queue::assertPushed(\App\Jobs\GenerarZipActasJob::class);
    }
}
