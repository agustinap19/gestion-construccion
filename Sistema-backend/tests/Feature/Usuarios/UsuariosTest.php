<?php

namespace Tests\Feature\Usuarios;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class UsuariosTest extends TestCase
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

    private function crearRolGerente(): Rol
    {
        return Rol::firstOrCreate(
            ['nombre' => 'gerente'],
            ['nombre_visible' => 'Gerente', 'es_sistema' => true, 'estado' => 'activo']
        );
    }

    private function crearPermisosCriticos(): array
    {
        $permisos = [];
        foreach (['roles.crear', 'roles.eliminar', 'usuarios.crear', 'usuarios.eliminar'] as $codigo) {
            [$modulo, $accion] = explode('.', $codigo);
            $permisos[] = Permiso::firstOrCreate(['codigo' => $codigo], [
                'nombre' => $codigo, 'nombre_visible' => $codigo, 'modulo' => $modulo, 'accion' => $accion,
            ]);
        }
        return $permisos;
    }

    private function crearUsuario(Rol $rol, array $attrs = []): User
    {
        return User::create(array_merge([
            'nombre'                => 'Test',
            'apellido_paterno'      => 'Usuario',
            'ci'                    => (string) rand(1000000, 9999999),
            'email'                 => 'usr_' . uniqid() . '@test.com',
            'password'              => Hash::make('Pass123!'),
            'rol_id'                => $rol->id,
            'estado'                => 'activo',
            'debe_cambiar_password' => false,
            'intentos_fallidos'     => 0,
        ], $attrs));
    }

    private function payloadMinimo(Rol $rol, array $extra = []): array
    {
        return array_merge([
            'nombre'          => 'Nuevo',
            'apellido_paterno'=> 'Prueba',
            'ci'              => (string) rand(1000000, 9999999),
            'email'           => 'nuevo_' . uniqid() . '@test.com',
            'rol_id'          => $rol->id,
            'estado'          => 'activo',
        ], $extra);
    }

    // ── Tests ─────────────────────────────────────────────────────

    public function test_crear_usuario_minimo(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($this->crearRolGerente());

        $res = $this->actingAs($actor)
            ->postJson('/api/usuarios', $this->payloadMinimo($rol));

        $res->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('users', ['email' => $res->json('data.email')]);
    }

    public function test_crear_usuario_establece_debe_cambiar_password(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($this->crearRolGerente());

        $res = $this->actingAs($actor)
            ->postJson('/api/usuarios', $this->payloadMinimo($rol));

        $res->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email'                 => $res->json('data.email'),
            'debe_cambiar_password' => true,
        ]);
    }

    public function test_email_duplicado_falla_validacion(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($this->crearRolGerente());
        $email = 'dup_' . uniqid() . '@test.com';

        $this->actingAs($actor)->postJson('/api/usuarios', $this->payloadMinimo($rol, ['email' => $email]))->assertStatus(201);

        $res2 = $this->actingAs($actor)->postJson('/api/usuarios', $this->payloadMinimo($rol, ['email' => $email]));
        $res2->assertStatus(422)->assertJsonStructure(['errors']);
    }

    public function test_ci_duplicado_falla_validacion(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($this->crearRolGerente());
        $ci = (string) rand(1000000, 9999999);

        $this->actingAs($actor)->postJson('/api/usuarios', $this->payloadMinimo($rol, ['ci' => $ci]))->assertStatus(201);

        $res2 = $this->actingAs($actor)->postJson('/api/usuarios', $this->payloadMinimo($rol, [
            'ci' => $ci, 'email' => 'otro_' . uniqid() . '@test.com',
        ]));
        $res2->assertStatus(422);
    }

    public function test_no_autenticado_obtiene_401(): void
    {
        $this->getJson('/api/usuarios')->assertStatus(401);
    }

    public function test_listar_usuarios_retorna_paginado(): void
    {
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($this->crearRolGerente());
        $this->crearUsuario($rol);
        $this->crearUsuario($rol);

        $res = $this->actingAs($actor)->getJson('/api/usuarios');
        $res->assertStatus(200)
            ->assertJsonStructure(['status', 'data' => ['data', 'current_page', 'total']]);
    }

    public function test_filtro_pendiente_devuelve_solo_con_password_temporal(): void
    {
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($this->crearRolGerente());
        // Uno pendiente
        $this->crearUsuario($rol, ['debe_cambiar_password' => true]);
        // Uno normal
        $this->crearUsuario($rol, ['debe_cambiar_password' => false]);

        $res = $this->actingAs($actor)->getJson('/api/usuarios?con_password_temporal=true');
        $res->assertStatus(200);
        $data = $res->json('data.data');
        foreach ($data as $u) {
            $this->assertTrue((bool) $u['debe_cambiar_password']);
        }
    }

    public function test_cambiar_estado_activo_a_inactivo(): void
    {
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($this->crearRolGerente());
        $objetivo = $this->crearUsuario($rol);

        $res = $this->actingAs($actor)
            ->patchJson("/api/usuarios/{$objetivo->id}/estado", ['estado' => 'inactivo']);

        $res->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $objetivo->id, 'estado' => 'inactivo']);
    }

    public function test_suspender_usuario_requiere_razon(): void
    {
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($this->crearRolGerente());
        $objetivo = $this->crearUsuario($rol);

        $res = $this->actingAs($actor)
            ->patchJson("/api/usuarios/{$objetivo->id}/estado", ['estado' => 'suspendido']);

        // Sin razón debería fallar (FormRequest lo valida)
        $res->assertStatus(422);
    }

    public function test_solo_gerente_puede_cambiar_a_rol_critico(): void
    {
        Mail::fake();
        $rolNormal = $this->crearRol();
        $actor = $this->crearUsuario($rolNormal); // NO es gerente

        $permisos = $this->crearPermisosCriticos();
        $rolCritico = $this->crearRol(['nombre' => 'rol_critico_' . uniqid()]);
        $rolCritico->permisos()->attach(array_column($permisos, 'id'));

        $objetivo = $this->crearUsuario($rolNormal);

        $res = $this->actingAs($actor)
            ->patchJson("/api/usuarios/{$objetivo->id}/rol", ['rol_id' => $rolCritico->id]);

        $res->assertStatus(422);
        $this->assertDatabaseHas('users', ['id' => $objetivo->id, 'rol_id' => $rolNormal->id]);
    }

    public function test_gerente_puede_cambiar_a_rol_critico(): void
    {
        Mail::fake();
        $permisos = $this->crearPermisosCriticos();
        $rolGerente = $this->crearRolGerente();

        $rolCritico = $this->crearRol(['nombre' => 'rol_critico_' . uniqid()]);
        $rolCritico->permisos()->attach(array_column($permisos, 'id'));

        $actor = $this->crearUsuario($rolGerente);
        $objetivo = $this->crearUsuario($this->crearRol());

        $res = $this->actingAs($actor)
            ->patchJson("/api/usuarios/{$objetivo->id}/rol", ['rol_id' => $rolCritico->id]);

        $res->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $objetivo->id, 'rol_id' => $rolCritico->id]);
    }

    public function test_eliminar_usuario(): void
    {
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($this->crearRolGerente());
        $objetivo = $this->crearUsuario($rol);

        $res = $this->actingAs($actor)
            ->deleteJson("/api/usuarios/{$objetivo->id}", ['razon' => 'Test eliminar']);

        $res->assertStatus(200);
        $this->assertSoftDeleted('users', ['id' => $objetivo->id]);
    }

    public function test_restaurar_usuario_eliminado(): void
    {
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($this->crearRolGerente());
        $objetivo = $this->crearUsuario($rol);
        $objetivo->delete();

        $res = $this->actingAs($actor)->postJson("/api/usuarios/{$objetivo->id}/restaurar");
        $res->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $objetivo->id, 'deleted_at' => null]);
    }

    public function test_ver_detalle_usuario(): void
    {
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($this->crearRolGerente());
        $objetivo = $this->crearUsuario($rol);

        $res = $this->actingAs($actor)->getJson("/api/usuarios/{$objetivo->id}");
        $res->assertStatus(200)
            ->assertJsonStructure(['status', 'data' => ['usuario', 'sesiones', 'dispositivos', 'estadisticas']]);
    }
}
