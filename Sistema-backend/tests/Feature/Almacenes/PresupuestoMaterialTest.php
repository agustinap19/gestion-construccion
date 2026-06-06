<?php

namespace Tests\Feature\Almacenes;

use App\Models\CategoriaMaterial;
use App\Models\Material;
use App\Models\Permiso;
use App\Models\PresupuestoMaterialProyecto;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\UnidadMedida;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PresupuestoMaterialTest extends TestCase
{
    use RefreshDatabase;

    private function crearRol(): Rol
    {
        return Rol::create([
            'nombre' => 'rol_' . uniqid(), 'nombre_visible' => 'Rol Test',
            'es_sistema' => false, 'estado' => 'activo',
        ]);
    }

    private function crearUsuario(Rol $rol, array $permisos = []): User
    {
        $user = User::create([
            'nombre' => 'Test', 'apellido_paterno' => 'User',
            'ci' => (string) rand(1000000, 9999999),
            'email' => 'usr_' . uniqid() . '@test.com',
            'password' => Hash::make('Pass123!'),
            'rol_id' => $rol->id, 'estado' => 'activo',
            'debe_cambiar_password' => false,
        ]);

        foreach ($permisos as $codigo) {
            $p = Permiso::firstOrCreate(['codigo' => $codigo], [
                'nombre' => $codigo, 'nombre_visible' => $codigo,
                'modulo' => explode('.', $codigo)[0], 'accion' => explode('.', $codigo)[1] ?? 'ver',
            ]);
            $rol->permisos()->syncWithoutDetaching([$p->id]);
        }

        return $user;
    }

    private function crearProyecto(): Proyecto
    {
        return Proyecto::create([
            'codigo' => 'PRY-' . uniqid(),
            'nombre' => 'Proyecto Test',
            'estado' => 'en_ejecucion',
            'categoria' => 'privado',
            'tipo_proyecto_id' => null,
        ]);
    }

    private function crearMaterial(): Material
    {
        $cat = CategoriaMaterial::create(['nombre' => 'Cat_' . uniqid(), 'color' => '#fff']);
        $um  = UnidadMedida::create(['nombre' => 'um_' . uniqid(), 'simbolo' => 'u', 'activa' => true]);
        return Material::create([
            'codigo' => 'MAT-' . uniqid(), 'nombre' => 'Material Test',
            'tipo' => 'maestro', 'estado' => true,
            'categoria_id' => $cat->id, 'unidad_medida_id' => $um->id,
        ]);
    }

    // ── Tests ─────────────────────────────────────────────────────────────

    public function test_listar_presupuesto_sin_permiso_retorna_403()
    {
        $rol      = $this->crearRol();
        $usuario  = $this->crearUsuario($rol);
        $proyecto = $this->crearProyecto();

        $this->actingAs($usuario)->getJson("/api/proyectos/{$proyecto->id}/presupuesto-materiales")
            ->assertStatus(403);
    }

    public function test_listar_presupuesto_con_permiso_retorna_200()
    {
        $rol      = $this->crearRol();
        $usuario  = $this->crearUsuario($rol, ['presupuesto_materiales.gestionar']);
        $proyecto = $this->crearProyecto();

        $res = $this->actingAs($usuario)->getJson("/api/proyectos/{$proyecto->id}/presupuesto-materiales");
        $res->assertStatus(200)->assertJsonPath('status', 'success');
    }

    public function test_guardar_presupuesto_material_exitosamente()
    {
        $rol      = $this->crearRol();
        $usuario  = $this->crearUsuario($rol, ['presupuesto_materiales.gestionar']);
        $proyecto = $this->crearProyecto();
        $material = $this->crearMaterial();

        $res = $this->actingAs($usuario)->postJson("/api/proyectos/{$proyecto->id}/presupuesto-materiales", [
            'material_id'                   => $material->id,
            'cantidad_total_planificada'    => 100,
            'precio_unitario_presupuestado' => 25.50,
        ]);

        $res->assertStatus(201);
        $this->assertDatabaseHas('presupuesto_material_proyecto', [
            'proyecto_id' => $proyecto->id,
            'material_id' => $material->id,
        ]);
    }

    public function test_guardar_duplicado_actualiza_sin_crear_nuevo_registro()
    {
        $rol      = $this->crearRol();
        $usuario  = $this->crearUsuario($rol, ['presupuesto_materiales.gestionar']);
        $proyecto = $this->crearProyecto();
        $material = $this->crearMaterial();

        $payload = [
            'material_id'                   => $material->id,
            'cantidad_total_planificada'    => 100,
            'precio_unitario_presupuestado' => 25.00,
        ];

        $this->actingAs($usuario)->postJson("/api/proyectos/{$proyecto->id}/presupuesto-materiales", $payload);
        $this->actingAs($usuario)->postJson("/api/proyectos/{$proyecto->id}/presupuesto-materiales",
            array_merge($payload, ['precio_unitario_presupuestado' => 30.00])
        );

        $this->assertEquals(1, PresupuestoMaterialProyecto::where([
            'proyecto_id' => $proyecto->id,
            'material_id' => $material->id,
        ])->count());
    }

    public function test_cantidad_cero_retorna_422()
    {
        $rol      = $this->crearRol();
        $usuario  = $this->crearUsuario($rol, ['presupuesto_materiales.gestionar']);
        $proyecto = $this->crearProyecto();
        $material = $this->crearMaterial();

        $this->actingAs($usuario)->postJson("/api/proyectos/{$proyecto->id}/presupuesto-materiales", [
            'material_id'                   => $material->id,
            'cantidad_total_planificada'    => 0,
            'precio_unitario_presupuestado' => 25.00,
        ])->assertStatus(422);
    }

    public function test_eliminar_presupuesto_exitosamente()
    {
        $rol      = $this->crearRol();
        $usuario  = $this->crearUsuario($rol, ['presupuesto_materiales.gestionar']);
        $proyecto = $this->crearProyecto();
        $material = $this->crearMaterial();

        $res = $this->actingAs($usuario)->postJson("/api/proyectos/{$proyecto->id}/presupuesto-materiales", [
            'material_id'                   => $material->id,
            'cantidad_total_planificada'    => 50,
            'precio_unitario_presupuestado' => 10,
        ]);

        $id = $res->json('data.id');

        $this->actingAs($usuario)
            ->deleteJson("/api/proyectos/{$proyecto->id}/presupuesto-materiales/{$id}")
            ->assertStatus(200);

        $this->assertSoftDeleted('presupuesto_material_proyecto', ['id' => $id]);
    }
}
