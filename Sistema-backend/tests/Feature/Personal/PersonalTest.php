<?php

namespace Tests\Feature\Personal;

use App\Models\Personal;
use App\Models\Permiso;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PersonalTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ────────────────────────────────────────────────

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
            [
                'nombre_visible' => 'Gerente General',
                'es_sistema'     => true,
                'estado'         => 'activo',
            ]
        );
    }

    private function crearPermisosCriticos(): array
    {
        $permisos = [];
        foreach (['roles.crear', 'roles.eliminar', 'usuarios.crear', 'usuarios.eliminar'] as $codigo) {
            [$modulo, $accion] = explode('.', $codigo);
            $permisos[] = Permiso::create([
                'codigo'         => $codigo,
                'nombre'         => $codigo,
                'nombre_visible' => $codigo,
                'modulo'         => $modulo,
                'accion'         => $accion,
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

    private function crearPersonal(array $attrs = []): Personal
    {
        return Personal::create(array_merge([
            'codigo_empleado'   => 'EMP' . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT),
            'nombre'            => 'Juan',
            'apellido_paterno'  => 'Perez',
            'ci'                => (string) rand(1000000, 9999999),
            'tipo'              => 'obrero',
            'fecha_contratacion'=> now()->toDateString(),
            'tipo_contrato'     => 'indefinido',
            'salario_base'      => 2000.00,
            'frecuencia_pago'   => 'mensual',
            'estado_laboral'    => 'activo',
        ], $attrs));
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'nombre'            => 'Maria',
            'apellido_paterno'  => 'Lopez',
            'ci'                => (string) rand(1000000, 9999999),
            'tipo'              => 'tecnico',
            'fecha_contratacion'=> now()->toDateString(),
            'tipo_contrato'     => 'indefinido',
            'salario_base'      => 3000,
            'frecuencia_pago'   => 'mensual',
        ], $overrides);
    }

    // ── 1. Crear personal básico (happy path) ───────────────────

    public function test_crear_personal_minimo(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($rol);

        $res = $this->actingAs($actor)->postJson('/api/personal', $this->payload());

        $res->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('personal', ['ci' => $res->json('data.ci')]);
    }

    // ── 2. CI debe ser único ────────────────────────────────────

    public function test_ci_duplicado_falla_validacion(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($rol);
        $personal = $this->crearPersonal(['ci' => '12345678']);

        $res = $this->actingAs($actor)->postJson('/api/personal', $this->payload(['ci' => '12345678']));

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['ci']);
    }

    // ── 3. Obrero sin usuario no tiene acceso al sistema ────────

    public function test_personal_sin_usuario_no_tiene_acceso_al_sistema(): void
    {
        $personal = $this->crearPersonal(['usuario_id' => null]);

        $this->assertFalse($personal->tieneUsuario());
        $this->assertFalse($personal->puedeAcceder());
    }

    // ── 4. Técnico con usuario puede acceder ────────────────────

    public function test_personal_con_usuario_activo_puede_acceder(): void
    {
        $rol = $this->crearRol();
        $usuario = $this->crearUsuario($rol, ['estado' => 'activo']);
        $personal = $this->crearPersonal(['usuario_id' => $usuario->id]);

        $this->assertTrue($personal->tieneUsuario());
        $this->assertTrue($personal->puedeAcceder());
    }

    // ── 5. No se puede vincular el mismo usuario a dos personal ─

    public function test_no_se_puede_vincular_mismo_usuario_a_dos_personal(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($rol);
        $usuario = $this->crearUsuario($rol);
        $personal1 = $this->crearPersonal(['usuario_id' => $usuario->id]);

        // Intentar vincular el mismo usuario a otro personal
        $personal2 = $this->crearPersonal();
        $res = $this->actingAs($actor)->postJson("/api/personal/{$personal2->id}/vincular-usuario", [
            'usuario_id' => $usuario->id,
        ]);

        $res->assertStatus(422);
        $this->assertStringContainsString(
            'ya está vinculado',
            $res->json('message')
        );
    }

    // ── 6. Desvinculación laboral suspende el usuario ───────────

    public function test_desvinculacion_suspende_usuario_y_cierra_sesiones(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($rol);
        $usuario = $this->crearUsuario($rol, ['estado' => 'activo']);
        $personal = $this->crearPersonal(['usuario_id' => $usuario->id]);

        // Crear un token de sesión falso
        DB::table('personal_access_tokens')->insert([
            'tokenable_type' => User::class,
            'tokenable_id'   => $usuario->id,
            'name'           => 'test_token',
            'token'          => hash('sha256', 'fake_token'),
            'abilities'      => '["*"]',
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        $res = $this->actingAs($actor)->patchJson("/api/personal/{$personal->id}/estado-laboral", [
            'estado_laboral' => 'desvinculado',
            'razon'          => 'Terminó el contrato por obra.',
        ]);

        $res->assertOk()->assertJsonPath('status', 'success');

        // Usuario debe quedar suspendido
        $this->assertDatabaseHas('users', [
            'id'     => $usuario->id,
            'estado' => 'suspendido',
        ]);

        // Sesiones deben haberse cerrado
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id'   => $usuario->id,
            'tokenable_type' => User::class,
        ]);
    }

    // ── 7. Desvinculación sin usuario solo cambia estado ────────

    public function test_desvinculacion_sin_usuario_solo_cambia_estado(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($rol);
        $personal = $this->crearPersonal(['usuario_id' => null]);

        $res = $this->actingAs($actor)->patchJson("/api/personal/{$personal->id}/estado-laboral", [
            'estado_laboral' => 'desvinculado',
            'razon'          => 'Baja voluntaria',
        ]);

        $res->assertOk();
        $this->assertDatabaseHas('personal', [
            'id'            => $personal->id,
            'estado_laboral'=> 'desvinculado',
        ]);
    }

    // ── 8. Crear cuenta de sistema desde ficha de personal ──────

    public function test_crear_usuario_desde_ficha_personal(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($rol);
        $personal = $this->crearPersonal(['usuario_id' => null]);
        $rolObrero = $this->crearRol(['nombre' => 'obrero_test', 'nombre_visible' => 'Obrero']);

        $res = $this->actingAs($actor)->postJson("/api/personal/{$personal->id}/crear-usuario", [
            'email'  => 'juan.perez.test@cakanagf.com',
            'rol_id' => $rolObrero->id,
        ]);

        $res->assertOk()->assertJsonPath('status', 'success');

        $personal->refresh();
        $this->assertNotNull($personal->usuario_id);
        $this->assertDatabaseHas('users', ['email' => 'juan.perez.test@cakanagf.com']);
    }

    // ── 9. No se puede crear dos usuarios para el mismo personal ─

    public function test_no_se_puede_crear_usuario_si_ya_tiene_uno(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($rol);
        $usuario = $this->crearUsuario($rol);
        $personal = $this->crearPersonal(['usuario_id' => $usuario->id]);

        $res = $this->actingAs($actor)->postJson("/api/personal/{$personal->id}/crear-usuario", [
            'email'  => 'otro@cakanagf.com',
            'rol_id' => $rol->id,
        ]);

        $res->assertStatus(422);
        $this->assertStringContainsString('ya tiene un usuario', $res->json('message'));
    }

    // ── 10. Crear personal con usuario en una transacción ───────

    public function test_transaccion_rollback_si_email_duplicado(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($rol);

        // Email que ya existe
        $emailExistente = 'duplicado@cakanagf.com';
        $this->crearUsuario($rol, ['email' => $emailExistente]);

        $ciNuevo = (string) rand(5000000, 5999999);

        $res = $this->actingAs($actor)->postJson('/api/personal', $this->payload([
            'ci'                       => $ciNuevo,
            'crear_usuario_vinculado'  => true,
            'usuario_data'             => [
                'email'  => $emailExistente,
                'rol_id' => $rol->id,
            ],
        ]));

        $res->assertStatus(422);

        // El personal tampoco debe haberse creado (transacción)
        $this->assertDatabaseMissing('personal', ['ci' => $ciNuevo]);
    }

    // ── 11. Crear personal con usuario vinculado ─────────────────

    public function test_crear_personal_con_usuario_vinculado_en_mismo_request(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($rol);
        $ciNuevo = (string) rand(6000000, 6999999);

        $res = $this->actingAs($actor)->postJson('/api/personal', $this->payload([
            'ci'                       => $ciNuevo,
            'crear_usuario_vinculado'  => true,
            'usuario_data'             => [
                'email'  => 'nuevo.usuario@cakanagf.com',
                'rol_id' => $rol->id,
            ],
        ]));

        $res->assertStatus(201);

        $personal = Personal::where('ci', $ciNuevo)->first();
        $this->assertNotNull($personal->usuario_id);
        $this->assertDatabaseHas('users', ['email' => 'nuevo.usuario@cakanagf.com']);
        Mail::assertSent(\App\Mail\UsuarioCreadoMail::class);
    }

    // ── 12. Anti-escalada: solo gerente puede asignar rol crítico ─

    public function test_solo_gerente_puede_crear_usuario_con_rol_critico(): void
    {
        Mail::fake();
        $permisosCriticos = $this->crearPermisosCriticos();

        $rolGerente = $this->crearRolGerente();
        $rolCritico = $this->crearRol(['nombre' => 'admin_critico', 'nombre_visible' => 'Admin Crítico']);
        $rolCritico->permisos()->attach(collect($permisosCriticos)->pluck('id')->toArray());

        $rolNormal = $this->crearRol();
        $actorNoGerente = $this->crearUsuario($rolNormal);
        $personal = $this->crearPersonal(['usuario_id' => null]);

        // Actor sin rol gerente no puede crear usuario con rol crítico
        $res = $this->actingAs($actorNoGerente)->postJson("/api/personal/{$personal->id}/crear-usuario", [
            'email'  => 'critico@cakanagf.com',
            'rol_id' => $rolCritico->id,
        ]);

        $res->assertStatus(422);
        $this->assertStringContainsString('gerente', $res->json('message'));
    }

    // ── 13. Gerente puede asignar rol crítico ────────────────────

    public function test_gerente_puede_crear_usuario_con_rol_critico(): void
    {
        Mail::fake();
        $permisosCriticos = $this->crearPermisosCriticos();

        $rolGerente = $this->crearRolGerente();
        $rolCritico = $this->crearRol(['nombre' => 'admin_critico2', 'nombre_visible' => 'Admin Crítico 2']);
        $rolCritico->permisos()->attach(collect($permisosCriticos)->pluck('id')->toArray());

        $gerente = $this->crearUsuario($rolGerente);
        $personal = $this->crearPersonal(['usuario_id' => null]);

        $res = $this->actingAs($gerente)->postJson("/api/personal/{$personal->id}/crear-usuario", [
            'email'  => 'admin.critico@cakanagf.com',
            'rol_id' => $rolCritico->id,
        ]);

        $res->assertOk();
    }

    // ── 14. No autenticado obtiene 401 ──────────────────────────

    public function test_no_autenticado_obtiene_401(): void
    {
        $this->getJson('/api/personal')->assertUnauthorized();
        $this->postJson('/api/personal', [])->assertUnauthorized();
    }

    // ── 15. Listar personal con filtros ─────────────────────────

    public function test_listar_personal_con_filtro_tipo(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($rol);

        $this->crearPersonal(['tipo' => 'tecnico', 'ci' => (string) rand(1000000, 1999999)]);
        $this->crearPersonal(['tipo' => 'obrero',  'ci' => (string) rand(2000000, 2999999)]);
        $this->crearPersonal(['tipo' => 'obrero',  'ci' => (string) rand(3000000, 3999999)]);

        $res = $this->actingAs($actor)->getJson('/api/personal?tipo=obrero');

        $res->assertOk();
        $data = $res->json('data.data');
        $this->assertNotEmpty($data);
        foreach ($data as $item) {
            $this->assertEquals('obrero', $item['tipo']);
        }
    }

    // ── 16. Soft delete y restauración ──────────────────────────

    public function test_eliminar_y_restaurar_personal(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($rol);
        $personal = $this->crearPersonal();

        // Eliminar
        $res = $this->actingAs($actor)->deleteJson("/api/personal/{$personal->id}");
        $res->assertOk();
        $this->assertSoftDeleted('personal', ['id' => $personal->id]);

        // Restaurar
        $res2 = $this->actingAs($actor)->postJson("/api/personal/{$personal->id}/restaurar");
        $res2->assertOk();
        $this->assertDatabaseHas('personal', ['id' => $personal->id, 'deleted_at' => null]);
    }

    // ── 17. Desvincular usuario ──────────────────────────────────

    public function test_desvincular_usuario_no_elimina_al_usuario(): void
    {
        Mail::fake();
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($rol);
        $usuario = $this->crearUsuario($rol);
        $personal = $this->crearPersonal(['usuario_id' => $usuario->id]);

        $res = $this->actingAs($actor)->postJson("/api/personal/{$personal->id}/desvincular-usuario");

        $res->assertOk();

        // Personal ya no tiene usuario
        $this->assertDatabaseHas('personal', ['id' => $personal->id, 'usuario_id' => null]);

        // El usuario sigue existiendo
        $this->assertDatabaseHas('users', ['id' => $usuario->id]);
    }

    // ── 18. Validación: campos obligatorios ─────────────────────

    public function test_faltan_campos_obligatorios_retorna_422(): void
    {
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($rol);

        $res = $this->actingAs($actor)->postJson('/api/personal', []);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['nombre', 'apellido_paterno', 'ci', 'tipo', 'fecha_contratacion', 'tipo_contrato', 'salario_base', 'frecuencia_pago']);
    }

    // ── 19. Estado laboral inválido retorna 422 ──────────────────

    public function test_estado_laboral_invalido_retorna_422(): void
    {
        $rol = $this->crearRol();
        $actor = $this->crearUsuario($rol);
        $personal = $this->crearPersonal();

        $res = $this->actingAs($actor)->patchJson("/api/personal/{$personal->id}/estado-laboral", [
            'estado_laboral' => 'inexistente',
        ]);

        $res->assertStatus(422)->assertJsonValidationErrors(['estado_laboral']);
    }
}
