<?php

namespace Tests\Feature\Almacenes;

use App\Models\Almacen;
use App\Models\Permiso;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CargaAlmacenTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function crearRol(array $permisos = []): Rol
    {
        $rol = Rol::create([
            'nombre' => 'rol_' . uniqid(), 'nombre_visible' => 'Test',
            'es_sistema' => false, 'estado' => 'activo',
        ]);
        foreach ($permisos as $codigo) {
            $p = Permiso::firstOrCreate(['codigo' => $codigo], [
                'nombre' => $codigo, 'nombre_visible' => $codigo,
                'modulo' => explode('.', $codigo)[0], 'accion' => 'ver', 'descripcion' => $codigo,
            ]);
            $rol->permisos()->syncWithoutDetaching([$p->id]);
        }
        return $rol;
    }

    private function crearUsuario(Rol $rol): User
    {
        return User::create([
            'nombre' => 'Test', 'apellido_paterno' => 'User',
            'ci' => 'CI-' . uniqid(),
            'email' => 'tst-' . uniqid() . '@test.com',
            'password' => bcrypt('secret'),
            'rol_id' => $rol->id, 'estado' => 'activo',
        ]);
    }

    private function crearProyecto(string $categoria = 'social', User $user = null): Proyecto
    {
        return Proyecto::create([
            'codigo' => 'PRJ-' . uniqid(), 'nombre' => 'Proyecto ' . $categoria,
            'categoria' => $categoria, 'estado' => 'en_ejecucion',
            'presupuesto_referencial' => 300000,
            'fecha_inicio_planificada' => '2026-01-01',
            'fecha_fin_planificada' => '2027-01-01',
            'creado_por_id' => $user?->id ?? 1,
        ]);
    }

    private function crearAlmacen(array $attrs = []): Almacen
    {
        return Almacen::create(array_merge([
            'codigo' => 'ALM-' . uniqid(),
            'nombre' => 'Almacén Test',
            'tipo' => 'central',
            'estado' => 'activo',
        ], $attrs));
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_almacen_central_carga_correctamente(): void
    {
        $rol = $this->crearRol(['almacenes.ver']);
        $user = $this->crearUsuario($rol);

        $almacen = $this->crearAlmacen(['tipo' => 'central']);

        $response = $this->actingAs($user)->getJson("/api/almacenes/{$almacen->id}");

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.almacen.id', $almacen->id)
            ->assertJsonPath('data.almacen.tipo', 'central');
    }

    public function test_almacen_de_proyecto_social_carga_correctamente(): void
    {
        $rol = $this->crearRol(['almacenes.ver']);
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyecto('social', $user);

        $almacen = $this->crearAlmacen([
            'tipo' => 'obra',
            'proyecto_id' => $proyecto->id,
        ]);

        $response = $this->actingAs($user)->getJson("/api/almacenes/{$almacen->id}");

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.almacen.id', $almacen->id)
            ->assertJsonPath('data.almacen.proyecto_id', $proyecto->id);

        // El proyecto debe exponer es_social=true (calculado desde categoria)
        $proyecto_data = $response->json('data.almacen.proyecto');
        $this->assertNotNull($proyecto_data);
        $this->assertEquals('social', $proyecto_data['categoria']);
        $this->assertTrue($proyecto_data['es_social']);
    }

    public function test_almacen_de_proyecto_privado_carga_correctamente(): void
    {
        $rol = $this->crearRol(['almacenes.ver']);
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyecto('privado', $user);

        $almacen = $this->crearAlmacen([
            'tipo' => 'obra',
            'proyecto_id' => $proyecto->id,
        ]);

        $response = $this->actingAs($user)->getJson("/api/almacenes/{$almacen->id}");

        $response->assertOk();

        $proyecto_data = $response->json('data.almacen.proyecto');
        $this->assertNotNull($proyecto_data);
        $this->assertEquals('privado', $proyecto_data['categoria']);
        $this->assertFalse($proyecto_data['es_social']);
    }

    public function test_almacen_inexistente_retorna_404(): void
    {
        $rol = $this->crearRol(['almacenes.ver']);
        $user = $this->crearUsuario($rol);

        $response = $this->actingAs($user)->getJson('/api/almacenes/99999');

        $response->assertNotFound();
    }

    public function test_almacen_sin_autenticacion_retorna_401(): void
    {
        $almacen = $this->crearAlmacen();

        $this->getJson("/api/almacenes/{$almacen->id}")->assertUnauthorized();
    }

    public function test_almacen_sin_permiso_retorna_403(): void
    {
        $rol = $this->crearRol([]); // sin permiso almacenes.ver
        $user = $this->crearUsuario($rol);
        $almacen = $this->crearAlmacen();

        $this->actingAs($user)->getJson("/api/almacenes/{$almacen->id}")->assertForbidden();
    }
}
