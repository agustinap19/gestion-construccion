<?php

namespace Tests\Feature\Competencias;

use App\Models\Competencia;
use App\Models\Personal;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CompetenciasTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────

    private function crearRol(array $attrs = []): Rol
    {
        return Rol::create(array_merge([
            'nombre'         => 'rol_' . uniqid(),
            'nombre_visible' => 'Rol Test',
            'es_sistema'     => false,
            'estado'         => 'activo',
        ], $attrs));
    }

    private function crearUsuario(Rol $rol): User
    {
        return User::create([
            'nombre'                => 'Test',
            'apellido_paterno'      => 'Usuario',
            'ci'                    => (string) rand(1000000, 9999999),
            'email'                 => 'usr_' . uniqid() . '@test.com',
            'password'              => Hash::make('Pass123!'),
            'rol_id'                => $rol->id,
            'estado'                => 'activo',
            'debe_cambiar_password' => false,
            'intentos_fallidos'     => 0,
        ]);
    }

    private function crearPersonal(array $attrs = []): Personal
    {
        return Personal::create(array_merge([
            'codigo_empleado'   => 'EMP' . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT),
            'nombre'            => 'Carlos',
            'apellido_paterno'  => 'Quispe',
            'ci'                => (string) rand(1000000, 9999999),
            'tipo'              => 'tecnico',
            'estado_laboral'    => 'activo',
            'fecha_contratacion'=> '2023-01-10',
            'tipo_contrato'     => 'indefinido',
            'salario_base'      => 3000,
            'frecuencia_pago'   => 'mensual',
        ], $attrs));
    }

    private function crearCompetencia(array $attrs = []): Competencia
    {
        return Competencia::create(array_merge([
            'nombre'              => 'Comp_' . uniqid(),
            'tipo'                => 'tecnico',
            'requiere_renovacion' => false,
            'vigencia_meses'      => null,
        ], $attrs));
    }

    // ── Tests Catálogo ────────────────────────────────────────────

    public function test_listar_competencias_retorna_paginado(): void
    {
        $actor = $this->crearUsuario($this->crearRol());
        $this->crearCompetencia();
        $this->crearCompetencia();

        $res = $this->actingAs($actor)->getJson('/api/competencias');
        $res->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure(['data' => ['data', 'total']]);
    }

    public function test_crear_competencia_basica(): void
    {
        $actor = $this->crearUsuario($this->crearRol());

        $res = $this->actingAs($actor)->postJson('/api/competencias', [
            'nombre'              => 'Soldadura TIG',
            'tipo'                => 'tecnico',
            'requiere_renovacion' => false,
        ]);

        $res->assertStatus(201)->assertJsonPath('status', 'success');
        $this->assertDatabaseHas('competencias', ['nombre' => 'Soldadura TIG']);
    }

    public function test_nombre_duplicado_falla(): void
    {
        $actor = $this->crearUsuario($this->crearRol());
        $this->crearCompetencia(['nombre' => 'Comp Duplicada']);

        $res = $this->actingAs($actor)->postJson('/api/competencias', [
            'nombre' => 'Comp Duplicada',
            'tipo'   => 'tecnico',
        ]);
        $res->assertStatus(422);
    }

    public function test_tipo_invalido_falla(): void
    {
        $actor = $this->crearUsuario($this->crearRol());

        $res = $this->actingAs($actor)->postJson('/api/competencias', [
            'nombre' => 'Nueva Comp',
            'tipo'   => 'invalido',
        ]);
        $res->assertStatus(422);
    }

    public function test_requiere_renovacion_sin_vigencia_meses_falla(): void
    {
        $actor = $this->crearUsuario($this->crearRol());

        $res = $this->actingAs($actor)->postJson('/api/competencias', [
            'nombre'              => 'Comp Con Renovacion',
            'tipo'                => 'seguridad',
            'requiere_renovacion' => true,
            'vigencia_meses'      => null,
        ]);
        $res->assertStatus(422);
    }

    public function test_crear_competencia_con_renovacion(): void
    {
        $actor = $this->crearUsuario($this->crearRol());

        $res = $this->actingAs($actor)->postJson('/api/competencias', [
            'nombre'              => 'Trabajo en Altura',
            'tipo'                => 'seguridad',
            'requiere_renovacion' => true,
            'vigencia_meses'      => 12,
        ]);
        $res->assertStatus(201);
        $this->assertDatabaseHas('competencias', ['nombre' => 'Trabajo en Altura', 'vigencia_meses' => 12]);
    }

    public function test_actualizar_competencia(): void
    {
        $actor = $this->crearUsuario($this->crearRol());
        $comp = $this->crearCompetencia(['nombre' => 'Original']);

        $res = $this->actingAs($actor)->putJson("/api/competencias/{$comp->id}", [
            'nombre' => 'Actualizada',
            'tipo'   => 'laboral',
        ]);
        $res->assertStatus(200);
        $this->assertDatabaseHas('competencias', ['id' => $comp->id, 'nombre' => 'Actualizada', 'tipo' => 'laboral']);
    }

    public function test_eliminar_competencia_sin_asignaciones(): void
    {
        $actor = $this->crearUsuario($this->crearRol());
        $comp = $this->crearCompetencia();

        $res = $this->actingAs($actor)->deleteJson("/api/competencias/{$comp->id}");
        $res->assertStatus(200);
        $this->assertDatabaseMissing('competencias', ['id' => $comp->id]);
    }

    public function test_eliminar_competencia_con_asignaciones_falla(): void
    {
        $actor = $this->crearUsuario($this->crearRol());
        $comp = $this->crearCompetencia();
        $personal = $this->crearPersonal();

        DB::table('personal_competencia')->insert([
            'personal_id'    => $personal->id,
            'competencia_id' => $comp->id,
            'fecha_emision'  => '2024-01-01',
            'estado'         => 'vigente',
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        $res = $this->actingAs($actor)->deleteJson("/api/competencias/{$comp->id}");
        $res->assertStatus(422);
        $this->assertDatabaseHas('competencias', ['id' => $comp->id]);
    }

    // ── Tests Asignación Personal ─────────────────────────────────

    public function test_asignar_competencia_a_personal(): void
    {
        $actor = $this->crearUsuario($this->crearRol());
        $personal = $this->crearPersonal();
        $comp = $this->crearCompetencia(['tipo' => 'tecnico']);

        $res = $this->actingAs($actor)->postJson("/api/personal/{$personal->id}/competencias", [
            'competencia_id' => $comp->id,
            'fecha_emision'  => '2024-03-01',
        ]);
        $res->assertStatus(201);
        $this->assertDatabaseHas('personal_competencia', [
            'personal_id'    => $personal->id,
            'competencia_id' => $comp->id,
        ]);
    }

    public function test_competencia_requiere_renovacion_sin_fecha_vencimiento_falla(): void
    {
        $actor = $this->crearUsuario($this->crearRol());
        $personal = $this->crearPersonal();
        $comp = $this->crearCompetencia(['requiere_renovacion' => true, 'vigencia_meses' => 12]);

        $res = $this->actingAs($actor)->postJson("/api/personal/{$personal->id}/competencias", [
            'competencia_id'    => $comp->id,
            'fecha_emision'     => '2024-03-01',
            'fecha_vencimiento' => null,
        ]);
        // El servicio lanza excepción si requiere_renovacion y no hay fecha_vencimiento
        $res->assertStatus(422);
    }

    public function test_asignar_competencia_marca_estado_vencida_si_fecha_pasada(): void
    {
        $actor = $this->crearUsuario($this->crearRol());
        $personal = $this->crearPersonal();
        $comp = $this->crearCompetencia(['requiere_renovacion' => true, 'vigencia_meses' => 12]);

        $res = $this->actingAs($actor)->postJson("/api/personal/{$personal->id}/competencias", [
            'competencia_id'    => $comp->id,
            'fecha_emision'     => '2020-01-01',
            'fecha_vencimiento' => '2021-01-01',
        ]);
        $res->assertStatus(201);
        $this->assertDatabaseHas('personal_competencia', [
            'personal_id'    => $personal->id,
            'competencia_id' => $comp->id,
            'estado'         => 'vencida',
        ]);
    }

    public function test_no_autenticado_no_puede_ver_competencias(): void
    {
        $this->getJson('/api/competencias')->assertStatus(401);
    }
}
