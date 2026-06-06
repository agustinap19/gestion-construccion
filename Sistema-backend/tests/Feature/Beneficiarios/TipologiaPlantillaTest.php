<?php

namespace Tests\Feature\Beneficiarios;

use App\Models\Beneficiario;
use App\Models\CategoriaConstructiva;
use App\Models\ItemConstructivo;
use App\Models\ItemPlantillaConstructiva;
use App\Models\PresupuestoItemProyecto;
use App\Models\PlantillaConstructiva;
use App\Models\Permiso;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\TipoVivienda;
use App\Models\User;
use App\Models\Vivienda;
use App\Services\Almacenes\IntegracionBeneficiarioService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TipologiaPlantillaTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function crearRol(array $permisos = []): Rol
    {
        $rol = Rol::create(['nombre' => 'rol_' . uniqid(), 'nombre_visible' => 'Test', 'es_sistema' => false, 'estado' => 'activo']);
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

    private function crearProyectoSocial(User $user): Proyecto
    {
        return Proyecto::create([
            'codigo' => 'PRJ-' . uniqid(), 'nombre' => 'Proyecto Social Test',
            'categoria' => 'social', 'estado' => 'adjudicado',
            'presupuesto_referencial' => 200000,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada' => '2027-06-01',
            'creado_por_id' => $user->id,
        ]);
    }

    private function crearPlantillaConItem(): PlantillaConstructiva
    {
        $categoria = CategoriaConstructiva::create(['nombre' => 'Cat', 'codigo' => 'CT-' . uniqid(), 'color' => '#000']);
        $item = ItemConstructivo::create([
            'codigo' => 'ITM-' . uniqid(), 'nombre' => 'Item Test',
            'categoria_constructiva_id' => $categoria->id,
            'unidad_base' => 'glb', 'estado' => true,
        ]);
        $plantilla = PlantillaConstructiva::create([
            'nombre' => 'Plantilla Test ' . uniqid(),
            'tipo_obra' => 'vivienda_social', 'estado' => true, 'es_sistema' => true,
        ]);
        ItemPlantillaConstructiva::create([
            'plantilla_id' => $plantilla->id,
            'item_constructivo_id' => $item->id,
            'cantidad_sugerida' => 1, 'orden' => 1, 'ponderacion_avance' => 99.99,
        ]);
        return $plantilla;
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_beneficiario_solo_acepta_plantillas_activas(): void
    {
        // TipoVivienda sin plantilla → servicio retorna tipo_vivienda_sin_plantilla
        $rol = $this->crearRol(['beneficiarios.crear', 'beneficiarios.ver']);
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);

        $tipoSinPlantilla = TipoVivienda::create([
            'nombre' => 'TIPO SIN PLANTILLA', 'metros_cuadrados' => 50,
            'estado' => 'activo', 'plantilla_constructiva_id' => null,
        ]);

        $beneficiario = Beneficiario::create([
            'codigo_beneficiario' => 'BNF-TST-001',
            'proyecto_id' => $proyecto->id,
            'usuario_registrador_id' => $user->id,
            'nombre' => 'Juan', 'apellido_paterno' => 'Test',
            'ci' => 'CI-' . uniqid(),
            'estado_seleccion' => 'aceptado',
            'tipo_vivienda_id' => $tipoSinPlantilla->id,
            'fecha_aceptacion' => now()->toDateString(),
        ]);
        $vivienda = Vivienda::create([
            'codigo' => 'VIV-TST-001', 'proyecto_id' => $proyecto->id,
            'estado' => 'planificada', 'porcentaje_avance' => 0,
            'usuario_creador_id' => $user->id, 'beneficiario_id' => $beneficiario->id,
        ]);

        $service = app(IntegracionBeneficiarioService::class);
        $resultado = $service->generarItemsParaBeneficiario($beneficiario->fresh('vivienda'), $user->id);

        $this->assertFalse($resultado['generado']);
        $this->assertEquals('tipo_vivienda_sin_plantilla', $resultado['razon']);
        $this->assertEquals(0, PresupuestoItemProyecto::count());
    }

    public function test_tipo_vivienda_con_plantilla_activa_genera_items(): void
    {
        // TipoVivienda CON plantilla → servicio genera items
        $rol = $this->crearRol(['beneficiarios.crear', 'beneficiarios.ver']);
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);

        $plantilla = $this->crearPlantillaConItem();
        $tipoConPlantilla = TipoVivienda::create([
            'nombre' => 'TIPO CON PLANTILLA', 'metros_cuadrados' => 60,
            'estado' => 'activo', 'plantilla_constructiva_id' => $plantilla->id,
        ]);

        $beneficiario = Beneficiario::create([
            'codigo_beneficiario' => 'BNF-TST-002',
            'proyecto_id' => $proyecto->id,
            'usuario_registrador_id' => $user->id,
            'nombre' => 'Ana', 'apellido_paterno' => 'Tst',
            'ci' => 'CI-' . uniqid(),
            'estado_seleccion' => 'aceptado',
            'tipo_vivienda_id' => $tipoConPlantilla->id,
            'fecha_aceptacion' => now()->toDateString(),
        ]);
        $vivienda = Vivienda::create([
            'codigo' => 'VIV-TST-002', 'proyecto_id' => $proyecto->id,
            'estado' => 'planificada', 'porcentaje_avance' => 0,
            'usuario_creador_id' => $user->id, 'beneficiario_id' => $beneficiario->id,
        ]);

        $service = app(IntegracionBeneficiarioService::class);
        $resultado = $service->generarItemsParaBeneficiario($beneficiario->fresh('vivienda'), $user->id);

        $this->assertTrue($resultado['generado']);
        $this->assertEquals(1, $resultado['items_generados']);
        $this->assertEquals(1, PresupuestoItemProyecto::where('proyecto_id', $proyecto->id)->count());
    }

    public function test_formulario_tipos_vivienda_expone_plantilla_constructiva_id(): void
    {
        // GET /api/tipos-vivienda debe incluir plantilla_constructiva_id en la respuesta
        $rol = $this->crearRol(['tipos-vivienda.ver']);
        $user = $this->crearUsuario($rol);

        $plantilla = PlantillaConstructiva::create([
            'nombre' => 'Plantilla TIPO 1', 'tipo_obra' => 'vivienda_social',
            'estado' => true, 'es_sistema' => true,
        ]);
        TipoVivienda::create([
            'nombre' => 'Vivienda Social TIPO 1', 'metros_cuadrados' => 45,
            'estado' => 'activo', 'plantilla_constructiva_id' => $plantilla->id,
        ]);

        $response = $this->actingAs($user)->getJson('/api/tipos-vivienda');

        $response->assertOk();
        $data = $response->json('data');
        $this->assertNotEmpty($data);

        $tipo = collect($data)->firstWhere('nombre', 'Vivienda Social TIPO 1');
        $this->assertNotNull($tipo);
        $this->assertArrayHasKey('plantilla_constructiva_id', $tipo);
        $this->assertEquals($plantilla->id, $tipo['plantilla_constructiva_id']);
    }
}
