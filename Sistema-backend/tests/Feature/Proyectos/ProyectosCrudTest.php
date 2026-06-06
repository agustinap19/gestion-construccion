<?php

namespace Tests\Feature\Proyectos;

use App\Models\EntidadEstatal;
use App\Models\Permiso;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProyectosCrudTest extends TestCase
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

    private function crearUsuario(Rol $rol, array $attrs = []): User
    {
        return User::create(array_merge([
            'nombre'            => 'Test',
            'apellido_paterno'  => 'User',
            'ci'                => 'CI-' . uniqid(),
            'email'             => 'test-' . uniqid() . '@example.com',
            'password'          => bcrypt('password'),
            'rol_id'            => $rol->id,
            'estado'            => 'activo',
            'es_admin_central'  => true,
        ], $attrs));
    }

    private function crearEntidad(): EntidadEstatal
    {
        return EntidadEstatal::create([
            'nombre' => 'Entidad Test ' . uniqid(),
            'nivel'  => 'municipal',
            'estado' => 'activa',
        ]);
    }

    private function payloadBase(array $extras = []): array
    {
        return array_merge([
            'nombre'                   => 'Proyecto Test ' . uniqid(),
            'categoria'                => 'social',
            'presupuesto_referencial'  => 500000.00,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
            'prioridad'                => 'media',
        ], $extras);
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_listar_proyectos_requiere_autenticacion(): void
    {
        $this->getJson('/api/proyectos')->assertUnauthorized();
    }

    public function test_listar_proyectos_retorna_paginador(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);

        Proyecto::create(array_merge($this->payloadBase(), [
            'codigo'         => 'PRJ-2026-0001',
            'estado'         => 'formulacion',
            'creado_por_id'  => $user->id,
        ]));

        $this->actingAs($user)
            ->getJson('/api/proyectos')
            ->assertOk()
            ->assertJsonStructure(['data', 'current_page', 'total']);
    }

    public function test_crear_proyecto_social(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);
        $entidad = $this->crearEntidad();

        $payload = $this->payloadBase(['entidad_estatal_id' => $entidad->id]);

        $this->actingAs($user)
            ->postJson('/api/proyectos', $payload)
            ->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.categoria', 'social');

        $this->assertDatabaseHas('proyectos', [
            'nombre'   => $payload['nombre'],
            'categoria' => 'social',
            'estado'   => 'formulacion',
        ]);
    }

    public function test_crear_proyecto_requiere_nombre(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);

        $this->actingAs($user)
            ->postJson('/api/proyectos', $this->payloadBase(['nombre' => '']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nombre']);
    }

    public function test_crear_proyecto_sin_contraparte_social_retorna_error(): void
    {
        // Rediseño: presupuesto_referencial es opcional; el error de contraparte tiene prioridad.
        $rol  = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);

        $this->actingAs($user)
            ->postJson('/api/proyectos', $this->payloadBase())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['entidad_estatal_id']);
    }

    public function test_crear_proyecto_categoria_requerida(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);

        $payload = $this->payloadBase();
        unset($payload['categoria']);

        $this->actingAs($user)
            ->postJson('/api/proyectos', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['categoria']);
    }

    public function test_ver_detalle_proyecto(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);

        $proyecto = Proyecto::create(array_merge($this->payloadBase(), [
            'codigo'        => 'PRJ-2026-0002',
            'estado'        => 'formulacion',
            'creado_por_id' => $user->id,
        ]));

        $this->actingAs($user)
            ->getJson("/api/proyectos/{$proyecto->id}")
            ->assertOk()
            ->assertJsonPath('data.proyecto.id', $proyecto->id)
            ->assertJsonStructure(['data' => ['proyecto', 'estadisticas', 'transiciones_permitidas']]);
    }

    public function test_actualizar_proyecto(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);

        $proyecto = Proyecto::create(array_merge($this->payloadBase(), [
            'codigo'        => 'PRJ-2026-0003',
            'estado'        => 'formulacion',
            'creado_por_id' => $user->id,
        ]));

        $this->actingAs($user)
            ->putJson("/api/proyectos/{$proyecto->id}", ['nombre' => 'Nombre Actualizado'])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Nombre Actualizado');
    }

    public function test_cambiar_estado_formulacion_a_licitacion(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);

        $proyecto = Proyecto::create(array_merge($this->payloadBase(), [
            'codigo'        => 'PRJ-2026-0004',
            'estado'        => 'formulacion',
            'creado_por_id' => $user->id,
        ]));

        $this->actingAs($user)
            ->patchJson("/api/proyectos/{$proyecto->id}/estado", ['estado' => 'licitacion'])
            ->assertOk()
            ->assertJsonPath('data.estado', 'licitacion');
    }

    public function test_cambiar_estado_invalido_falla(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);

        $proyecto = Proyecto::create(array_merge($this->payloadBase(), [
            'codigo'        => 'PRJ-2026-0005',
            'estado'        => 'formulacion',
            'creado_por_id' => $user->id,
        ]));

        // formulacion → en_ejecucion is not allowed
        $this->actingAs($user)
            ->patchJson("/api/proyectos/{$proyecto->id}/estado", ['estado' => 'en_ejecucion'])
            ->assertStatus(422);
    }

    public function test_archivar_proyecto(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);

        $proyecto = Proyecto::create(array_merge($this->payloadBase(), [
            'codigo'        => 'PRJ-2026-0006',
            'estado'        => 'formulacion',
            'creado_por_id' => $user->id,
        ]));

        $this->actingAs($user)
            ->deleteJson("/api/proyectos/{$proyecto->id}", ['razon' => 'Proyecto duplicado en el sistema'])
            ->assertOk();

        $this->assertSoftDeleted('proyectos', ['id' => $proyecto->id]);
    }

    public function test_estadisticas_generales(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);

        $this->actingAs($user)
            ->getJson('/api/proyectos/estadisticas')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total', 'por_estado', 'por_categoria', 'avance_promedio']]);
    }

    public function test_filtrar_por_categoria(): void
    {
        $rol = $this->crearRolGerente();
        $user = $this->crearUsuario($rol);

        Proyecto::create(array_merge($this->payloadBase(['categoria' => 'social']), [
            'codigo'        => 'PRJ-2026-0007',
            'estado'        => 'formulacion',
            'creado_por_id' => $user->id,
        ]));
        Proyecto::create(array_merge($this->payloadBase(['categoria' => 'privado']), [
            'codigo'        => 'PRJ-2026-0008',
            'estado'        => 'formulacion',
            'creado_por_id' => $user->id,
        ]));

        $res = $this->actingAs($user)
            ->getJson('/api/proyectos?categoria=social')
            ->assertOk();

        $data = $res->json('data');
        $this->assertGreaterThanOrEqual(1, count($data));
        foreach ($data as $p) {
            $this->assertEquals('social', $p['categoria']);
        }
    }

    public function test_codigo_generado_automaticamente(): void
    {
        $rol     = $this->crearRolGerente();
        $user    = $this->crearUsuario($rol);
        $entidad = $this->crearEntidad();

        $res = $this->actingAs($user)
            ->postJson('/api/proyectos', $this->payloadBase(['entidad_estatal_id' => $entidad->id]))
            ->assertCreated();

        $codigo = $res->json('data.codigo');
        $this->assertMatchesRegularExpression('/^PRJ-\d{4}-\d{4}$/', $codigo);
    }
}
