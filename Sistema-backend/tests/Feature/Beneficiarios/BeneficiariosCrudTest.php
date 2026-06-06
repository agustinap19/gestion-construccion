<?php

namespace Tests\Feature\Beneficiarios;

use App\Models\Beneficiario;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BeneficiariosCrudTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function crearRolGerente(): Rol
    {
        return Rol::firstOrCreate(
            ['nombre' => 'gerente'],
            ['nombre_visible' => 'Gerente', 'es_sistema' => true, 'estado' => 'activo']
        );
    }

    private function crearUsuario(Rol $rol): User
    {
        return User::create([
            'nombre'           => 'Test',
            'apellido_paterno' => 'User',
            'ci'               => 'CI-' . uniqid(),
            'email'            => 'test-' . uniqid() . '@example.com',
            'password'         => bcrypt('password'),
            'rol_id'           => $rol->id,
            'estado'           => 'activo',
        ]);
    }

    private function crearProyectoSocial(User $user): Proyecto
    {
        return Proyecto::create([
            'codigo'                   => 'PRJ-2026-' . str_pad(rand(100, 999), 4, '0', STR_PAD_LEFT),
            'nombre'                   => 'Proyecto Social Test',
            'categoria'                => 'social',
            'estado'                   => 'adjudicado',
            'presupuesto_referencial'  => 300000,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'creado_por_id'            => $user->id,
        ]);
    }

    private function payloadBenef(int $proyectoId, array $extras = []): array
    {
        return array_merge([
            'proyecto_id'      => $proyectoId,
            'nombre'           => 'María',
            'apellido_paterno' => 'Quispe',
            'ci'               => 'CI-' . uniqid(),
            'telefono_principal' => '71234567',
            'estado_seleccion' => 'candidato',
        ], $extras);
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_listar_beneficiarios_requiere_autenticacion(): void
    {
        $this->getJson('/api/beneficiarios')->assertUnauthorized();
    }

    public function test_crear_beneficiario(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);

        $payload = $this->payloadBenef($proyecto->id);

        $this->actingAs($user)
            ->postJson('/api/beneficiarios', $payload)
            ->assertCreated();

        $this->assertDatabaseHas('beneficiarios', [
            'nombre'      => 'María',
            'proyecto_id' => $proyecto->id,
        ]);
    }

    public function test_crear_beneficiario_requiere_nombre(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);

        $payload = $this->payloadBenef($proyecto->id, ['nombre' => '']);

        $this->actingAs($user)
            ->postJson('/api/beneficiarios', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nombre']);
    }

    public function test_crear_beneficiario_requiere_ci(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);

        $payload = $this->payloadBenef($proyecto->id, ['ci' => '']);

        $this->actingAs($user)
            ->postJson('/api/beneficiarios', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['ci']);
    }

    public function test_ci_unico_dentro_del_proyecto(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);

        $ci = '12345678';
        $payload = $this->payloadBenef($proyecto->id, ['ci' => $ci]);

        // Crear primer beneficiario
        $this->actingAs($user)->postJson('/api/beneficiarios', $payload)->assertCreated();

        // Intentar crear segundo con mismo CI en mismo proyecto
        $payload2 = $this->payloadBenef($proyecto->id, [
            'ci'               => $ci,
            'nombre'           => 'Pedro',
            'apellido_paterno' => 'Lopez',
            'telefono_principal' => '71234568',
        ]);

        $this->actingAs($user)
            ->postJson('/api/beneficiarios', $payload2)
            ->assertStatus(422);
    }

    public function test_mismo_ci_en_diferente_proyecto_permitido(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);
        $proyecto1 = $this->crearProyectoSocial($user);
        $proyecto2 = Proyecto::create([
            'codigo'                   => 'PRJ-2026-9999',
            'nombre'                   => 'Proyecto 2',
            'categoria'                => 'social',
            'estado'                   => 'adjudicado',
            'presupuesto_referencial'  => 200000,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'creado_por_id'            => $user->id,
        ]);

        $ci = 'SHARED-' . uniqid();

        $this->actingAs($user)
            ->postJson('/api/beneficiarios', $this->payloadBenef($proyecto1->id, ['ci' => $ci]))
            ->assertCreated();

        $this->actingAs($user)
            ->postJson('/api/beneficiarios', $this->payloadBenef($proyecto2->id, ['ci' => $ci]))
            ->assertCreated();
    }

    public function test_ver_detalle_beneficiario(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);

        $benef = Beneficiario::create(array_merge($this->payloadBenef($proyecto->id), [
            'codigo_beneficiario' => 'BNF-2026-0001-001',
        ]));

        $this->actingAs($user)
            ->getJson("/api/beneficiarios/{$benef->id}")
            ->assertOk()
            ->assertJsonPath('beneficiario.id', $benef->id);
    }

    public function test_actualizar_beneficiario(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);

        $benef = Beneficiario::create(array_merge($this->payloadBenef($proyecto->id), [
            'codigo_beneficiario' => 'BNF-2026-0001-002',
        ]));

        $this->actingAs($user)
            ->putJson("/api/beneficiarios/{$benef->id}", ['nombre' => 'Nombre Nuevo'])
            ->assertOk()
            ->assertJsonPath('nombre', 'Nombre Nuevo');
    }

    public function test_archivar_beneficiario(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);

        $benef = Beneficiario::create(array_merge($this->payloadBenef($proyecto->id), [
            'codigo_beneficiario' => 'BNF-2026-0001-003',
        ]));

        $this->actingAs($user)
            ->deleteJson("/api/beneficiarios/{$benef->id}", ['razon' => 'Registro duplicado'])
            ->assertOk();

        $this->assertSoftDeleted('beneficiarios', ['id' => $benef->id]);
    }

    public function test_estadisticas_por_proyecto(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);

        Beneficiario::create(array_merge($this->payloadBenef($proyecto->id), [
            'codigo_beneficiario' => 'BNF-2026-0001-004',
        ]));

        $this->actingAs($user)
            ->getJson("/api/beneficiarios/proyecto/{$proyecto->id}/estadisticas")
            ->assertOk()
            ->assertJsonStructure(['por_estado']);
    }

    public function test_filtrar_beneficiarios_por_proyecto(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);

        Beneficiario::create(array_merge($this->payloadBenef($proyecto->id), [
            'codigo_beneficiario' => 'BNF-2026-0001-005',
        ]));

        $res = $this->actingAs($user)
            ->getJson("/api/beneficiarios?proyecto_id={$proyecto->id}")
            ->assertOk();

        $data = $res->json('data');
        $this->assertGreaterThanOrEqual(1, count($data));
    }
}
