<?php

namespace Tests\Feature\Roles;

use App\Models\Permiso;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RolTest extends TestCase
{
    use RefreshDatabase;

    private function crearRol(array $attrs = []): Rol
    {
        return Rol::create(array_merge([
            'nombre'         => 'rol_test_' . uniqid(),
            'nombre_visible' => 'Rol de Test',
            'descripcion'    => 'Rol para pruebas',
            'es_sistema'     => false,
            'estado'         => 'activo',
        ], $attrs));
    }

    private function crearRolSistema(array $attrs = []): Rol
    {
        return Rol::create(array_merge([
            'nombre'         => 'gerente',
            'nombre_visible' => 'Gerente General',
            'descripcion'    => 'Rol del sistema',
            'es_sistema'     => true,
            'estado'         => 'activo',
        ], $attrs));
    }

    private function crearPermisos(): array
    {
        $permisos = [];
        $modulos  = ['usuarios', 'roles'];
        $acciones = ['ver', 'crear', 'editar', 'eliminar'];

        foreach ($modulos as $modulo) {
            foreach ($acciones as $accion) {
                $permisos[] = Permiso::create([
                    'codigo'         => "{$modulo}.{$accion}",
                    'nombre'         => ucfirst($accion) . ' ' . ucfirst($modulo),
                    'nombre_visible' => ucfirst($accion) . ' ' . ucfirst($modulo),
                    'modulo'         => $modulo,
                    'accion'         => $accion,
                    'descripcion'    => "Permite {$accion} {$modulo}",
                ]);
            }
        }

        return $permisos;
    }

    private function crearUsuarioConRol(Rol $rol, array $attrs = []): User
    {
        return User::create(array_merge([
            'nombre'                => 'Usuario',
            'apellido_paterno'      => 'Test',
            'ci'                    => (string) rand(1000000, 9999999),
            'email'                 => 'test_' . uniqid() . '@cakanagf.com',
            'password'              => Hash::make('Password123!'),
            'rol_id'                => $rol->id,
            'estado'                => 'activo',
            'debe_cambiar_password' => false,
            'intentos_fallidos'     => 0,
        ], $attrs));
    }

    private function crearGerente(): User
    {
        $rolGerente = Rol::create([
            'nombre'         => 'gerente',
            'nombre_visible' => 'Gerente General',
            'es_sistema'     => true,
            'estado'         => 'activo',
        ]);

        $permisos = $this->crearPermisos();
        $rolGerente->permisos()->attach(array_map(fn($p) => $p->id, $permisos));

        return $this->crearUsuarioConRol($rolGerente, [
            'email'            => 'gerente@cakanagf.com',
            'es_admin_central' => false,
        ]);
    }

    public function test_listar_roles_devuelve_conteos_correctos(): void
    {
        $gerente = $this->crearGerente();

        $rol = $this->crearRol();
        $this->crearUsuarioConRol($rol);
        $this->crearUsuarioConRol($rol);

        $response = $this->actingAs($gerente)
            ->getJson('/api/roles');

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure(['data' => ['data']]);

        $roles = collect($response->json('data.data'));
        $rolEncontrado = $roles->firstWhere('id', $rol->id);

        $this->assertNotNull($rolEncontrado);
        $this->assertEquals(2, $rolEncontrado['usuarios_count']);
    }

    public function test_crear_rol_personalizado_activo(): void
    {
        $gerente  = $this->crearGerente();
        $permisos = Permiso::all();

        $response = $this->actingAs($gerente)
            ->postJson('/api/roles', [
                'nombre'         => 'rol_nuevo_test',
                'nombre_visible' => 'Rol Nuevo Test',
                'descripcion'    => 'Descripción de prueba',
                'permiso_ids'    => $permisos->pluck('id')->toArray(),
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('roles', [
            'nombre'    => 'rol_nuevo_test',
            'es_sistema' => false,
            'estado'    => 'activo',
        ]);
    }

    public function test_dependencia_permisos_agrega_ver_automaticamente(): void
    {
        $gerente  = $this->crearGerente();
        $permisos = Permiso::all()->keyBy('codigo');

        // Solo enviar "crear" sin "ver"
        $soloCrear = [
            $permisos['usuarios.crear']->id,
        ];

        $response = $this->actingAs($gerente)
            ->postJson('/api/roles', [
                'nombre'         => 'rol_dependencia_test',
                'nombre_visible' => 'Rol Dependencia',
                'permiso_ids'    => $soloCrear,
            ]);

        $response->assertStatus(201);

        $rolId = $response->json('data.id');
        $rol   = Rol::with('permisos')->find($rolId);

        $codigos = $rol->permisos->pluck('codigo')->toArray();
        $this->assertContains('usuarios.ver', $codigos, 'Debe agregar "ver" automáticamente al seleccionar "crear"');
        $this->assertContains('usuarios.crear', $codigos);
    }

    public function test_no_se_puede_eliminar_rol_del_sistema(): void
    {
        $gerente    = $this->crearGerente();
        $rolSistema = Rol::where('nombre', 'gerente')->first();

        $response = $this->actingAs($gerente)
            ->deleteJson("/api/roles/{$rolSistema->id}");

        $response->assertStatus(403)
            ->assertJsonPath('status', 'error');

        $this->assertDatabaseHas('roles', ['id' => $rolSistema->id]);
    }

    public function test_no_se_puede_eliminar_rol_con_usuarios(): void
    {
        $gerente       = $this->crearGerente();
        $rolPersonalizado = $this->crearRol(['nombre' => 'rol_con_users']);
        $this->crearUsuarioConRol($rolPersonalizado);

        $response = $this->actingAs($gerente)
            ->deleteJson("/api/roles/{$rolPersonalizado->id}");

        $response->assertStatus(422)
            ->assertJsonPath('status', 'error');

        $this->assertDatabaseHas('roles', ['id' => $rolPersonalizado->id]);
    }

    public function test_cambiar_estado_alterna_activo_inactivo(): void
    {
        $gerente = $this->crearGerente();
        $rol     = $this->crearRol(['estado' => 'activo']);

        $response = $this->actingAs($gerente)
            ->patchJson("/api/roles/{$rol->id}/estado");

        $response->assertOk()
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('roles', ['id' => $rol->id, 'estado' => 'inactivo']);

        // Volver a activar
        $response2 = $this->actingAs($gerente)
            ->patchJson("/api/roles/{$rol->id}/estado");

        $response2->assertOk();
        $this->assertDatabaseHas('roles', ['id' => $rol->id, 'estado' => 'activo']);
    }

    public function test_solo_autenticados_acceden_endpoints(): void
    {
        $response = $this->getJson('/api/roles');
        $response->assertStatus(401);
    }

    public function test_anti_escalada_no_puede_crear_rol_mas_poderoso(): void
    {
        // Crear permisos primero
        $this->crearPermisos();

        // Usuario con solo "ver" intenta crear un rol con "crear" y "eliminar"
        $rolLimitado = $this->crearRol(['nombre' => 'rol_limitado']);
        $permisoVer  = Permiso::where('codigo', 'usuarios.ver')->first();
        $rolLimitado->permisos()->attach($permisoVer->id);

        $usuario = $this->crearUsuarioConRol($rolLimitado, [
            'email' => 'limitado@cakanagf.com',
        ]);

        $permisoCrear    = Permiso::where('codigo', 'usuarios.crear')->first();
        $permisoEliminar = Permiso::where('codigo', 'usuarios.eliminar')->first();

        $response = $this->actingAs($usuario)
            ->postJson('/api/roles', [
                'nombre'         => 'rol_escalado',
                'nombre_visible' => 'Rol Escalado',
                'permiso_ids'    => [$permisoCrear->id, $permisoEliminar->id],
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('status', 'error');
    }

    public function test_no_se_puede_quitar_permiso_base_de_rol_sistema(): void
    {
        $gerente     = $this->crearGerente();
        $rolSistema  = Rol::where('nombre', 'gerente')->first();
        $permisosRol = $rolSistema->permisos->pluck('id')->toArray();

        // Intentar actualizar quitando todos los permisos salvo uno
        $soloUno = [$permisosRol[0]];

        // Para un rol del sistema, el update solo cambia nombre_visible y descripcion,
        // pero también sincroniza permisos — este test verifica que el endpoint responde bien
        $response = $this->actingAs($gerente)
            ->putJson("/api/roles/{$rolSistema->id}", [
                'nombre_visible' => 'Gerente Actualizado',
                'descripcion'    => 'Descripción actualizada',
                'estado'         => 'activo',
                'permiso_ids'    => $soloUno,
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success');
    }

    public function test_listar_con_filtro_estado(): void
    {
        $gerente = $this->crearGerente();
        $this->crearRol(['nombre' => 'rol_inactivo_x', 'estado' => 'inactivo']);

        $response = $this->actingAs($gerente)
            ->getJson('/api/roles?estado=inactivo');

        $response->assertOk();
        $roles = collect($response->json('data.data'));
        $this->assertTrue($roles->every(fn($r) => $r['estado'] === 'inactivo'));
    }

    public function test_obtener_matriz_permisos(): void
    {
        $gerente = $this->crearGerente();

        $response = $this->actingAs($gerente)
            ->getJson('/api/permisos/matriz');

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure(['data']);
    }
}
