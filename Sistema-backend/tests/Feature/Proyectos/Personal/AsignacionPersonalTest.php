<?php

namespace Tests\Feature\Proyectos\Personal;

use App\Models\AsignacionPersonal;
use App\Models\Personal;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AsignacionPersonalTest extends TestCase
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
            'apellido_paterno' => 'Test',
            'ci'               => 'CI-' . uniqid(),
            'email'            => 'u-' . uniqid() . '@test.com',
            'password'         => bcrypt('secret'),
            'rol_id'           => $this->rol()->id,
            'estado'           => 'activo',
            'es_admin_central' => true,
        ]);
    }

    private function proyecto(User $responsable): Proyecto
    {
        return Proyecto::create([
            'codigo'                   => 'PRJ-' . uniqid(),
            'nombre'                   => 'Proyecto B2 Test',
            'categoria'                => 'social',
            'estado'                   => 'en_ejecucion',
            'presupuesto_referencial'  => 200_000,
            'fecha_inicio_planificada' => '2026-01-01',
            'fecha_fin_planificada'    => '2027-01-01',
            'cantidad_beneficiarios'   => 5,
            'creado_por_id'            => $responsable->id,
            'responsable_id'           => $responsable->id,
        ]);
    }

    private function personal(string $estado = 'activo'): Personal
    {
        return Personal::create([
            'codigo_empleado'    => 'EMP-' . uniqid(),
            'nombre'             => 'Juan',
            'apellido_paterno'   => 'Pérez',
            'ci'                 => 'P-' . uniqid(),
            'tipo'               => 'tecnico',
            'fecha_contratacion' => '2025-01-01',
            'salario_base'       => 3000.00,
            'estado_laboral'     => $estado,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════
    // 1. Listar asignaciones por proyecto
    // ═══════════════════════════════════════════════════════════════

    public function test_listar_asignaciones_por_proyecto(): void
    {
        $user  = $this->usuario();
        $proy  = $this->proyecto($user);
        $per   = $this->personal();

        AsignacionPersonal::create([
            'proyecto_id'      => $proy->id,
            'personal_id'      => $per->id,
            'rol_en_proyecto'  => 'supervisor',
            'fecha_inicio'     => '2026-01-01',
            'estado'           => 'activa',
            'usuario_asignador_id' => $user->id,
        ]);

        $this->actingAs($user)
            ->getJson("/api/proyectos/{$proy->id}/personal")
            ->assertOk()
            ->assertJsonStructure(['status', 'data']);
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. Asignar personal activo al proyecto
    // ═══════════════════════════════════════════════════════════════

    public function test_asignar_personal_activo_al_proyecto(): void
    {
        $user = $this->usuario();
        $proy = $this->proyecto($user);
        $per  = $this->personal();

        $this->actingAs($user)->postJson("/api/proyectos/{$proy->id}/personal", [
            'personal_id'     => $per->id,
            'rol_en_proyecto' => 'supervisor',
            'fecha_inicio'    => '2026-01-01',
        ])->assertStatus(201);

        $this->assertDatabaseHas('asignaciones_personal', [
            'proyecto_id'     => $proy->id,
            'personal_id'     => $per->id,
            'rol_en_proyecto' => 'supervisor',
            'estado'          => 'activa',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. No permite asignar personal inactivo
    // ═══════════════════════════════════════════════════════════════

    public function test_no_permite_asignar_personal_inactivo(): void
    {
        $user = $this->usuario();
        $proy = $this->proyecto($user);
        $per  = $this->personal('desvinculado');

        $this->actingAs($user)->postJson("/api/proyectos/{$proy->id}/personal", [
            'personal_id'     => $per->id,
            'rol_en_proyecto' => 'albanil',
        ])->assertStatus(422);
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. No permite duplicados en el mismo proyecto
    // ═══════════════════════════════════════════════════════════════

    public function test_no_permite_duplicados_en_el_mismo_proyecto(): void
    {
        $user = $this->usuario();
        $proy = $this->proyecto($user);
        $per  = $this->personal();

        $this->actingAs($user)->postJson("/api/proyectos/{$proy->id}/personal", [
            'personal_id'     => $per->id,
            'rol_en_proyecto' => 'supervisor',
        ])->assertStatus(201);

        $this->actingAs($user)->postJson("/api/proyectos/{$proy->id}/personal", [
            'personal_id'     => $per->id,
            'rol_en_proyecto' => 'albanil',
        ])->assertStatus(422);
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. Solo un responsable principal por proyecto
    // ═══════════════════════════════════════════════════════════════

    public function test_solo_un_responsable_principal_por_proyecto(): void
    {
        $user = $this->usuario();
        $proy = $this->proyecto($user);
        $per1 = $this->personal();
        $per2 = $this->personal();

        $this->actingAs($user)->postJson("/api/proyectos/{$proy->id}/personal", [
            'personal_id'            => $per1->id,
            'rol_en_proyecto'        => 'director_obra',
            'es_responsable_principal' => true,
        ])->assertStatus(201);

        $this->actingAs($user)->postJson("/api/proyectos/{$proy->id}/personal", [
            'personal_id'            => $per2->id,
            'rol_en_proyecto'        => 'director_obra',
            'es_responsable_principal' => true,
        ])->assertStatus(422);
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. Finalizar asignación
    // ═══════════════════════════════════════════════════════════════

    public function test_finalizar_asignacion(): void
    {
        $user = $this->usuario();
        $proy = $this->proyecto($user);
        $per  = $this->personal();

        $asig = AsignacionPersonal::create([
            'proyecto_id'      => $proy->id,
            'personal_id'      => $per->id,
            'rol_en_proyecto'  => 'albanil',
            'fecha_inicio'     => '2026-01-01',
            'estado'           => 'activa',
            'usuario_asignador_id' => $user->id,
        ]);

        $this->actingAs($user)
            ->patchJson("/api/asignaciones-personal/{$asig->id}/finalizar")
            ->assertOk();

        $this->assertDatabaseHas('asignaciones_personal', [
            'id'     => $asig->id,
            'estado' => 'finalizada',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════
    // 7. Usuario no autenticado no puede asignar
    // ═══════════════════════════════════════════════════════════════

    public function test_usuario_no_autenticado_no_puede_asignar(): void
    {
        $user = $this->usuario();
        $proy = $this->proyecto($user);
        $per  = $this->personal();

        $this->postJson("/api/proyectos/{$proy->id}/personal", [
            'personal_id'     => $per->id,
            'rol_en_proyecto' => 'supervisor',
        ])->assertUnauthorized();
    }
}
