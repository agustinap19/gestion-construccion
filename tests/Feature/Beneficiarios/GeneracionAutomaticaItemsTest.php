<?php

namespace Tests\Feature\Beneficiarios;

use App\Models\Beneficiario;
use App\Models\CategoriaConstructiva;
use App\Models\ItemConstructivo;
use App\Models\ItemPlantillaConstructiva;
use App\Models\PlantillaConstructiva;
use App\Models\Permiso;
use App\Models\PresupuestoItemProyecto;
use App\Models\PresupuestoMaterialProyecto;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\TipoVivienda;
use App\Models\User;
use App\Models\Vivienda;
use App\Services\Almacenes\IntegracionBeneficiarioService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GeneracionAutomaticaItemsTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function crearRol(array $permisos = []): Rol
    {
        $rol = Rol::create([
            'nombre' => 'gerente', 'nombre_visible' => 'Gerente',
            'es_sistema' => true, 'estado' => 'activo',
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
            'nombre' => 'Admin', 'apellido_paterno' => 'Test',
            'ci' => 'CI-' . uniqid(),
            'email' => 'admin-' . uniqid() . '@test.com',
            'password' => bcrypt('secret'),
            'rol_id' => $rol->id, 'estado' => 'activo',
        ]);
    }

    private function crearProyectoSocial(User $user, int $cupo = 10): Proyecto
    {
        return Proyecto::create([
            'codigo' => 'PRJ-' . uniqid(), 'nombre' => 'Proyecto Social Items Test',
            'categoria' => 'social', 'estado' => 'adjudicado',
            'presupuesto_referencial' => 500000,
            'cantidad_beneficiarios' => $cupo,
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada' => '2027-06-01',
            'creado_por_id' => $user->id,
        ]);
    }

    private function crearEstructuraCompleta(): TipoVivienda
    {
        $categoria = CategoriaConstructiva::create([
            'nombre' => 'Estructura', 'codigo' => 'EST-' . uniqid(), 'color' => '#f00',
        ]);
        $item = ItemConstructivo::create([
            'codigo' => 'ITM-' . uniqid(), 'nombre' => 'Cimentación',
            'categoria_constructiva_id' => $categoria->id,
            'unidad_base' => 'm3', 'estado' => true,
        ]);
        $plantilla = PlantillaConstructiva::create([
            'nombre' => 'Plantilla Social A-' . uniqid(),
            'tipo_obra' => 'vivienda_social', 'tipologia' => 'TIPO 1',
            'estado' => true, 'es_sistema' => true,
        ]);
        ItemPlantillaConstructiva::create([
            'plantilla_id' => $plantilla->id,
            'item_constructivo_id' => $item->id,
            'cantidad_sugerida' => 5.00, 'orden' => 1, 'ponderacion_avance' => 99.99,
        ]);
        return TipoVivienda::create([
            'nombre' => 'TIPO 1 Test', 'metros_cuadrados' => 45,
            'estado' => 'activo', 'plantilla_constructiva_id' => $plantilla->id,
        ]);
    }

    private function payloadBenef(int $proyectoId, int $tipoId, array $extras = []): array
    {
        return array_merge([
            'proyecto_id'      => $proyectoId,
            'nombre'           => 'María',
            'apellido_paterno' => 'Quispe',
            'ci'               => 'CI-' . uniqid(),
            'telefono_principal' => '71234567',
            'estado_seleccion' => 'aceptado',
            'tipo_vivienda_id' => $tipoId,
        ], $extras);
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_registrar_beneficiario_genera_items_de_su_plantilla(): void
    {
        $rol = $this->crearRol(['beneficiarios.crear', 'beneficiarios.ver']);
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);
        $tipo = $this->crearEstructuraCompleta();

        $response = $this->actingAs($user)->postJson('/api/beneficiarios', $this->payloadBenef($proyecto->id, $tipo->id));

        $response->assertCreated();

        $integracion = $response->json('integracion_plantilla');
        $this->assertNotNull($integracion);
        $this->assertTrue($integracion['generado']);
        $this->assertGreaterThan(0, $integracion['items_generados']);

        $this->assertGreaterThan(0, PresupuestoItemProyecto::where('proyecto_id', $proyecto->id)->count());
    }

    public function test_registrar_beneficiario_sin_tipo_vivienda_no_genera_items(): void
    {
        $rol = $this->crearRol(['beneficiarios.crear', 'beneficiarios.ver']);
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);

        $payload = $this->payloadBenef($proyecto->id, 0);
        unset($payload['tipo_vivienda_id']);

        $response = $this->actingAs($user)->postJson('/api/beneficiarios', $payload);

        $response->assertCreated();

        $integracion = $response->json('integracion_plantilla');
        $this->assertFalse($integracion['generado'] ?? false);
        $this->assertEquals(0, PresupuestoItemProyecto::where('proyecto_id', $proyecto->id)->count());
    }

    public function test_registrar_beneficiario_con_tipo_sin_plantilla_no_genera_items(): void
    {
        $rol = $this->crearRol(['beneficiarios.crear', 'beneficiarios.ver']);
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);

        $tipoSinPlantilla = TipoVivienda::create([
            'nombre' => 'TIPO SIN PLANTILLA', 'metros_cuadrados' => 50,
            'estado' => 'activo', 'plantilla_constructiva_id' => null,
        ]);

        $response = $this->actingAs($user)->postJson('/api/beneficiarios', $this->payloadBenef($proyecto->id, $tipoSinPlantilla->id));

        $response->assertCreated();

        $integracion = $response->json('integracion_plantilla');
        $this->assertFalse($integracion['generado']);
        $this->assertEquals('tipo_vivienda_sin_plantilla', $integracion['razon']);
        $this->assertEquals(0, PresupuestoItemProyecto::where('proyecto_id', $proyecto->id)->count());
    }

    public function test_cambiar_plantilla_de_beneficiario_regenera_items(): void
    {
        $rol = $this->crearRol(['beneficiarios.crear', 'beneficiarios.ver']);
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);
        $tipo1 = $this->crearEstructuraCompleta();

        // Crear segunda tipología con 2 items
        $categoria2 = CategoriaConstructiva::create(['nombre' => 'Cat2', 'codigo' => 'C2-' . uniqid(), 'color' => '#00f']);
        $item2a = ItemConstructivo::create(['codigo' => 'I2A-' . uniqid(), 'nombre' => 'Item2A', 'categoria_constructiva_id' => $categoria2->id, 'unidad_base' => 'glb', 'estado' => true]);
        $item2b = ItemConstructivo::create(['codigo' => 'I2B-' . uniqid(), 'nombre' => 'Item2B', 'categoria_constructiva_id' => $categoria2->id, 'unidad_base' => 'glb', 'estado' => true]);
        $plantilla2 = PlantillaConstructiva::create(['nombre' => 'Plantilla B ' . uniqid(), 'tipo_obra' => 'vivienda_social', 'estado' => true, 'es_sistema' => true]);
        ItemPlantillaConstructiva::create(['plantilla_id' => $plantilla2->id, 'item_constructivo_id' => $item2a->id, 'cantidad_sugerida' => 1, 'orden' => 1, 'ponderacion_avance' => 49.99]);
        ItemPlantillaConstructiva::create(['plantilla_id' => $plantilla2->id, 'item_constructivo_id' => $item2b->id, 'cantidad_sugerida' => 2, 'orden' => 2, 'ponderacion_avance' => 49.99]);
        $tipo2 = TipoVivienda::create(['nombre' => 'TIPO 2 Test', 'metros_cuadrados' => 60, 'estado' => 'activo', 'plantilla_constructiva_id' => $plantilla2->id]);

        // Registrar beneficiario con tipo1 (1 item)
        $respCrear = $this->actingAs($user)->postJson('/api/beneficiarios', $this->payloadBenef($proyecto->id, $tipo1->id));
        $respCrear->assertCreated();
        $beneficiarioId = $respCrear->json('id');
        $this->assertEquals(1, PresupuestoItemProyecto::where('proyecto_id', $proyecto->id)->count());

        // Regenerar con tipo2 (2 items) via servicio directamente
        $beneficiario = Beneficiario::with('vivienda')->findOrFail($beneficiarioId);
        $beneficiario->tipo_vivienda_id = $tipo2->id;
        $beneficiario->save();

        $service = app(IntegracionBeneficiarioService::class);
        $resultado = $service->regenerarItemsPorCambioTipologia($beneficiario->fresh('vivienda'), $user->id);

        $this->assertTrue($resultado['generado']);
        $this->assertEquals(2, $resultado['items_generados']);
        $this->assertEquals(2, PresupuestoItemProyecto::where('proyecto_id', $proyecto->id)->count());
    }

    public function test_si_no_existe_vivienda_se_crea_una_al_registrar(): void
    {
        $rol = $this->crearRol(['beneficiarios.crear', 'beneficiarios.ver']);
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoSocial($user);
        $tipo = $this->crearEstructuraCompleta();

        $this->assertEquals(0, Vivienda::where('proyecto_id', $proyecto->id)->count());

        $response = $this->actingAs($user)->postJson('/api/beneficiarios', $this->payloadBenef($proyecto->id, $tipo->id));
        $response->assertCreated();

        $this->assertEquals(1, Vivienda::where('proyecto_id', $proyecto->id)->count());

        $vivienda = Vivienda::where('proyecto_id', $proyecto->id)->first();
        $this->assertEquals($tipo->id, $vivienda->tipo_vivienda_id);
    }
}
