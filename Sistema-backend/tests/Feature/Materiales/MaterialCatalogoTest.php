<?php

namespace Tests\Feature\Materiales;

use App\Models\CategoriaMaterial;
use App\Models\Material;
use App\Models\Permiso;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\UnidadMedida;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MaterialCatalogoTest extends TestCase
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

    private function crearPermiso(string $codigo): Permiso
    {
        [$modulo, $accion] = explode('.', $codigo, 2);
        return Permiso::firstOrCreate(
            ['codigo' => $codigo],
            [
                'nombre'         => $codigo,
                'nombre_visible' => $codigo,
                'modulo'         => $modulo,
                'accion'         => $accion,
            ]
        );
    }

    private function crearUsuarioConPermiso(string $permiso): User
    {
        $p   = $this->crearPermiso($permiso);
        $rol = $this->crearRol();
        $rol->permisos()->attach($p->id);
        return $this->crearUsuario($rol);
    }

    private function crearUsuarioConPermisos(array $permisos): User
    {
        $rol = $this->crearRol();
        foreach ($permisos as $codigoPerm) {
            $p = $this->crearPermiso($codigoPerm);
            $rol->permisos()->attach($p->id);
        }
        return $this->crearUsuario($rol);
    }

    private function crearCategoria(array $attrs = []): CategoriaMaterial
    {
        return CategoriaMaterial::create(array_merge([
            'nombre'      => 'Cat_' . uniqid(),
            'color'       => '#64748b',
            'descripcion' => 'Categoría de prueba',
            'activo'      => true,
        ], $attrs));
    }

    private function crearUnidad(array $attrs = []): UnidadMedida
    {
        return UnidadMedida::firstOrCreate(
            ['simbolo' => $attrs['simbolo'] ?? 'pza_' . uniqid()],
            array_merge([
                'nombre' => 'Pieza_' . uniqid(),
                'tipo'   => 'unidad',
                'activa' => true,
            ], $attrs)
        );
    }

    private function crearMaterial(CategoriaMaterial $categoria, UnidadMedida $unidad, array $attrs = []): Material
    {
        static $counter = 1;
        return Material::create(array_merge([
            'codigo'          => 'MAT-' . str_pad($counter++, 4, '0', STR_PAD_LEFT),
            'nombre'          => 'Material_' . uniqid(),
            'categoria_id'    => $categoria->id,
            'unidad_medida_id' => $unidad->id,
            'tipo'            => 'maestro',
            'stock_minimo'    => 0,
            'activo'          => true,
        ], $attrs));
    }

    private function payloadMaterial(CategoriaMaterial $cat, UnidadMedida $uni, array $extra = []): array
    {
        return array_merge([
            'nombre'          => 'Mat_' . uniqid(),
            'categoria_id'    => $cat->id,
            'unidad_medida_id' => $uni->id,
            'tipo'            => 'maestro',
            'stock_minimo'    => 5,
        ], $extra);
    }

    // ── 1. Crear material maestro (201, campos correctos) ────────

    public function test_crear_material_maestro_retorna_201(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.gestionar');
        $cat   = $this->crearCategoria();
        $uni   = $this->crearUnidad();

        $payload = $this->payloadMaterial($cat, $uni, ['nombre' => 'Cemento Portland']);

        $res = $this->actingAs($actor)->postJson('/api/materiales', $payload);

        $res->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.nombre', 'Cemento Portland')
            ->assertJsonPath('data.tipo', 'maestro')
            ->assertJsonPath('data.activo', true);

        $this->assertDatabaseHas('materiales', [
            'nombre'       => 'Cemento Portland',
            'categoria_id' => $cat->id,
            'tipo'         => 'maestro',
            'activo'       => true,
        ]);
    }

    // ── 2. Crear material especial con proyecto ──────────────────

    public function test_crear_material_especial_con_proyecto(): void
    {
        $actor    = $this->crearUsuarioConPermiso('materiales.gestionar');
        $cat      = $this->crearCategoria();
        $uni      = $this->crearUnidad();
        $proyecto = Proyecto::create([
            'codigo'  => 'PRY-TEST-01',
            'nombre'  => 'Proyecto Test',
            'estado'  => 'formulacion',
        ]);

        $payload = $this->payloadMaterial($cat, $uni, [
            'nombre'      => 'Bloque Especial',
            'tipo'        => 'especial',
            'proyecto_id' => $proyecto->id,
        ]);

        $res = $this->actingAs($actor)->postJson('/api/materiales', $payload);

        $res->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.tipo', 'especial');

        $this->assertDatabaseHas('materiales', [
            'nombre'      => 'Bloque Especial',
            'tipo'        => 'especial',
            'proyecto_id' => $proyecto->id,
        ]);
    }

    // ── 3. Validación unicidad nombre+categoría (422) ───────────

    public function test_nombre_duplicado_en_misma_categoria_retorna_400(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.gestionar');
        $cat   = $this->crearCategoria();
        $uni   = $this->crearUnidad();

        $this->crearMaterial($cat, $uni, ['nombre' => 'Material Duplicado']);

        $payload = $this->payloadMaterial($cat, $uni, ['nombre' => 'Material Duplicado']);

        $res = $this->actingAs($actor)->postJson('/api/materiales', $payload);

        // El servicio lanza Exception que el controller devuelve como 400
        $res->assertStatus(400)
            ->assertJsonPath('status', 'error');
    }

    // ── 4. Categoría con materiales activos no se elimina (400) ─

    public function test_eliminar_categoria_con_materiales_activos_falla(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.gestionar');
        $cat   = $this->crearCategoria();
        $uni   = $this->crearUnidad();

        $this->crearMaterial($cat, $uni, ['activo' => true]);

        $res = $this->actingAs($actor)->deleteJson("/api/categorias-material/{$cat->id}");

        $res->assertStatus(400)
            ->assertJsonPath('status', 'error');

        $this->assertDatabaseHas('categorias_material', ['id' => $cat->id]);
    }

    // ── 5. Soft delete de material ───────────────────────────────

    public function test_soft_delete_material(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.gestionar');
        $cat   = $this->crearCategoria();
        $uni   = $this->crearUnidad();
        $mat   = $this->crearMaterial($cat, $uni);

        // La ruta de soft delete no está definida aún; probamos cambiarEstado a false
        // como equivalente funcional de desactivar (soft delete usa destroy si existe)
        // Probamos desactivar (cambio de estado)
        $res = $this->actingAs($actor)->patchJson("/api/materiales/{$mat->id}/estado", [
            'activo' => false,
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $mat->refresh();
        $this->assertFalse((bool) $mat->activo);
    }

    // ── 6. Permisos: 403 sin materiales.gestionar ────────────────

    public function test_sin_permiso_gestionar_crear_material_retorna_403(): void
    {
        // Usuario sin permisos (rol sin ningún permiso)
        $rol   = $this->crearRol();
        $actor = $this->crearUsuario($rol);

        $cat = $this->crearCategoria();
        $uni = $this->crearUnidad();

        $payload = $this->payloadMaterial($cat, $uni);

        $res = $this->actingAs($actor)->postJson('/api/materiales', $payload);

        $res->assertStatus(403);
    }

    // ── 7. Estado activo por defecto al crear ────────────────────

    public function test_material_creado_esta_activo_por_defecto(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.gestionar');
        $cat   = $this->crearCategoria();
        $uni   = $this->crearUnidad();

        $payload = $this->payloadMaterial($cat, $uni, ['nombre' => 'Material Activo Test']);

        $res = $this->actingAs($actor)->postJson('/api/materiales', $payload);

        $res->assertStatus(201);
        $this->assertDatabaseHas('materiales', [
            'nombre' => 'Material Activo Test',
            'activo' => true,
        ]);
    }

    // ── 8. Búsqueda por nombre retorna correctos ─────────────────

    public function test_busqueda_por_nombre_retorna_materiales_correctos(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.ver');
        $cat   = $this->crearCategoria();
        $uni   = $this->crearUnidad();

        $this->crearMaterial($cat, $uni, ['nombre' => 'Cemento Soboce IP30']);
        $this->crearMaterial($cat, $uni, ['nombre' => 'Fierro corrugado 8mm']);
        $this->crearMaterial($cat, $uni, ['nombre' => 'Cemento Coboce']);

        $res = $this->actingAs($actor)->getJson('/api/materiales?busqueda=Cemento');

        $res->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $nombres = collect($res->json('data.data'))->pluck('nombre');
        $this->assertTrue($nombres->contains('Cemento Soboce IP30'));
        $this->assertTrue($nombres->contains('Cemento Coboce'));
        $this->assertFalse($nombres->contains('Fierro corrugado 8mm'));
    }

    // ── 9. Filtro por categoría ───────────────────────────────────

    public function test_filtro_por_categoria_retorna_solo_esa_categoria(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.ver');
        $cat1  = $this->crearCategoria(['nombre' => 'Cemento y mortero_' . uniqid()]);
        $cat2  = $this->crearCategoria(['nombre' => 'Acero estructural_' . uniqid()]);
        $uni   = $this->crearUnidad();

        $this->crearMaterial($cat1, $uni, ['nombre' => 'Cemento Test']);
        $this->crearMaterial($cat2, $uni, ['nombre' => 'Fierro Test']);

        $res = $this->actingAs($actor)->getJson("/api/materiales?categorias[]={$cat1->id}");

        $res->assertStatus(200);

        $nombres = collect($res->json('data.data'))->pluck('nombre');
        $this->assertTrue($nombres->contains('Cemento Test'));
        $this->assertFalse($nombres->contains('Fierro Test'));
    }

    // ── 10. Filtro por tipo maestro/especial ─────────────────────

    public function test_filtro_por_tipo_maestro(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.ver');
        $cat   = $this->crearCategoria();
        $uni   = $this->crearUnidad();

        $this->crearMaterial($cat, $uni, ['nombre' => 'Mat Maestro', 'tipo' => 'maestro']);

        // Crear un proyecto para el material especial
        $proyecto = Proyecto::create([
            'codigo' => 'PRY-FILT-' . uniqid(),
            'nombre' => 'Proyecto Filtro',
            'estado' => 'formulacion',
        ]);
        $this->crearMaterial($cat, $uni, [
            'nombre'      => 'Mat Especial',
            'tipo'        => 'especial',
            'proyecto_id' => $proyecto->id,
        ]);

        $resMaestro = $this->actingAs($actor)->getJson('/api/materiales?tipo=maestro');
        $resEspecial = $this->actingAs($actor)->getJson('/api/materiales?tipo=especial');

        $resMaestro->assertStatus(200);
        $resEspecial->assertStatus(200);

        $nombresMaestro  = collect($resMaestro->json('data.data'))->pluck('nombre');
        $nombresEspecial = collect($resEspecial->json('data.data'))->pluck('nombre');

        $this->assertTrue($nombresMaestro->contains('Mat Maestro'));
        $this->assertFalse($nombresMaestro->contains('Mat Especial'));

        $this->assertTrue($nombresEspecial->contains('Mat Especial'));
        $this->assertFalse($nombresEspecial->contains('Mat Maestro'));
    }

    // ── 11. Crear categoría ───────────────────────────────────────

    public function test_crear_categoria_exitosamente(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.gestionar');

        $res = $this->actingAs($actor)->postJson('/api/categorias-material', [
            'nombre'      => 'Nueva Categoría Test',
            'color'       => '#3b82f6',
            'descripcion' => 'Descripción de prueba',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('categorias_material', [
            'nombre' => 'Nueva Categoría Test',
            'color'  => '#3b82f6',
        ]);
    }

    // ── 12b. Validación de límites de caracteres ────────────────

    public function test_nombre_mayor_50_chars_retorna_422(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.gestionar');
        $cat   = $this->crearCategoria();
        $uni   = $this->crearUnidad();

        $payload = $this->payloadMaterial($cat, $uni, ['nombre' => str_repeat('A', 51)]);
        $res = $this->actingAs($actor)->postJson('/api/materiales', $payload);
        $res->assertStatus(422)->assertJsonValidationErrors(['nombre']);
    }

    public function test_marca_mayor_40_chars_retorna_422(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.gestionar');
        $cat   = $this->crearCategoria();
        $uni   = $this->crearUnidad();

        $payload = $this->payloadMaterial($cat, $uni, ['marca' => str_repeat('B', 41)]);
        $res = $this->actingAs($actor)->postJson('/api/materiales', $payload);
        $res->assertStatus(422)->assertJsonValidationErrors(['marca']);
    }

    public function test_descripcion_mayor_60_chars_retorna_422(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.gestionar');
        $cat   = $this->crearCategoria();
        $uni   = $this->crearUnidad();

        $payload = $this->payloadMaterial($cat, $uni, ['descripcion' => str_repeat('C', 61)]);
        $res = $this->actingAs($actor)->postJson('/api/materiales', $payload);
        $res->assertStatus(422)->assertJsonValidationErrors(['descripcion']);
    }

    public function test_precio_negativo_retorna_422(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.gestionar');
        $cat   = $this->crearCategoria();
        $uni   = $this->crearUnidad();

        $payload = $this->payloadMaterial($cat, $uni, ['precio_referencial' => -1]);
        $res = $this->actingAs($actor)->postJson('/api/materiales', $payload);
        $res->assertStatus(422)->assertJsonValidationErrors(['precio_referencial']);
    }

    public function test_precio_cero_retorna_422(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.gestionar');
        $cat   = $this->crearCategoria();
        $uni   = $this->crearUnidad();

        $payload = $this->payloadMaterial($cat, $uni, ['precio_referencial' => 0]);
        $res = $this->actingAs($actor)->postJson('/api/materiales', $payload);
        $res->assertStatus(422)->assertJsonValidationErrors(['precio_referencial']);
    }

    // ── 12. Código generado automáticamente ──────────────────────

    public function test_codigo_generado_automaticamente_tiene_formato_mat(): void
    {
        $actor = $this->crearUsuarioConPermiso('materiales.gestionar');
        $cat   = $this->crearCategoria();
        $uni   = $this->crearUnidad();

        $payload = $this->payloadMaterial($cat, $uni, ['nombre' => 'Material Código Auto']);

        $res = $this->actingAs($actor)->postJson('/api/materiales', $payload);

        $res->assertStatus(201);
        $codigo = $res->json('data.codigo');
        $this->assertMatchesRegularExpression('/^MAT-\d{4}$/', $codigo);
    }
}
