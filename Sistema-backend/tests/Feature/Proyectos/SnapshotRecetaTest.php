<?php

namespace Tests\Feature\Proyectos;

use App\Models\Almacen;
use App\Models\CategoriaMaterial;
use App\Models\CategoriaConstructiva;
use App\Models\ItemConstructivo;
use App\Models\Material;
use App\Models\OverrideItemProyecto;
use App\Models\Permiso;
use App\Models\PresupuestoItemProyecto;
use App\Models\Proyecto;
use App\Models\RecetaItem;
use App\Models\Rol;
use App\Models\StockMaterial;
use App\Models\UnidadMedida;
use App\Models\User;
use App\Models\Vivienda;
use App\Services\Almacenes\PresupuestoAutomaticoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifica que los proyectos quedan aislados de cambios en la Biblioteca Constructiva.
 */
class SnapshotRecetaTest extends TestCase
{
    use RefreshDatabase;

    private User $gerente;
    private Almacen $almacen;
    private Material $cemento;
    private ItemConstructivo $item;
    private Proyecto $proyecto;
    private PresupuestoItemProyecto $pip;

    protected function setUp(): void
    {
        parent::setUp();

        $um  = UnidadMedida::firstOrCreate(['simbolo' => 'bol'], ['nombre' => 'Bolsa', 'activa' => true]);
        $cat = CategoriaMaterial::firstOrCreate(['nombre' => 'Cementos'], ['color' => '#fbbf24']);

        $this->cemento = Material::create([
            'codigo' => 'CEM-SN', 'nombre' => 'Cemento Portland SN',
            'unidad_medida_id' => $um->id, 'categoria_id' => $cat->id,
            'tipo' => 'maestro', 'estado' => true,
        ]);

        $catC = CategoriaConstructiva::firstOrCreate(['nombre' => 'Estructura'], ['color' => '#60a5fa']);
        $this->item = ItemConstructivo::create([
            'codigo' => 'ITM-CICL', 'nombre' => 'Hormigón ciclópeo',
            'unidad_base' => 'm3', 'categoria_constructiva_id' => $catC->id, 'estado' => true,
        ]);

        // Receta global: 3 bol/m³
        RecetaItem::create([
            'item_constructivo_id'     => $this->item->id,
            'material_id'              => $this->cemento->id,
            'cantidad_por_unidad_base' => 3.0,
            'unidad_material'          => 'bol',
        ]);

        // Proyecto con un PIP (generado vía servicio para que cree el snapshot)
        $this->proyecto = Proyecto::create([
            'codigo' => 'PRY-SN', 'nombre' => 'Proyecto Snapshot Test',
            'categoria' => 'social', 'estado' => 'en_ejecucion',
            'prioridad' => 'media',
            'fecha_inicio_planificada' => '2026-06-01', 'fecha_fin_planificada' => '2027-06-01',
        ]);

        $this->almacen = Almacen::create([
            'codigo' => 'ALM-SN', 'nombre' => 'Almacén Snapshot',
            'tipo' => 'obra', 'estado' => 'activo', 'proyecto_id' => $this->proyecto->id,
        ]);

        StockMaterial::create([
            'almacen_id' => $this->almacen->id, 'material_id' => $this->cemento->id,
            'cantidad' => 1000.0, 'cantidad_reservada' => 0, 'costo_promedio' => 10.0,
        ]);

        $vivienda = Vivienda::create([
            'codigo' => 'VIV-SN', 'proyecto_id' => $this->proyecto->id, 'estado' => 'planificada',
        ]);

        // Usar el servicio real para generar el presupuesto (esto crea el snapshot)
        $service = app(PresupuestoAutomaticoService::class);
        $rol = Rol::create(['nombre' => 'gerente_sn', 'nombre_visible' => 'Gerente SN']);
        $permisos = ['almacenes.ver', 'presupuesto_materiales.ver', 'presupuesto_materiales.gestionar', 'overrides_receta.aprobar', 'presupuesto_materiales.bloquear'];
        foreach ($permisos as $codigo) {
            $p = Permiso::firstOrCreate(['codigo' => $codigo], ['nombre' => $codigo, 'nombre_visible' => $codigo, 'modulo' => 'test', 'accion' => 'ver']);
            $rol->permisos()->syncWithoutDetaching([$p->id]);
        }
        $this->gerente = User::factory()->create(['debe_cambiar_password' => false]);
        $this->gerente->update(['rol_id' => $rol->id]);

        $service->generarDesde($this->proyecto->id, [[
            'vivienda_id'          => $vivienda->id,
            'item_constructivo_id' => $this->item->id,
            'cantidad_planificada' => 10.0,
            'orden'                => 1,
        ]], $this->gerente->id);

        $this->pip = PresupuestoItemProyecto::where('proyecto_id', $this->proyecto->id)->firstOrFail();
    }

    // ── Test principal: snapshot protege del cambio en biblioteca ─────────────

    public function test_modal_entrega_no_cambia_cuando_se_edita_biblioteca(): void
    {
        // Verificar que el snapshot existe (3.0 bol/m³)
        $this->assertDatabaseHas('overrides_items_proyecto', [
            'proyecto_id'              => $this->proyecto->id,
            'item_constructivo_id'     => $this->item->id,
            'material_id'              => $this->cemento->id,
            'vivienda_id'              => null,
            'nivel'                    => 'tipologia',
        ]);

        $snapshotOriginal = OverrideItemProyecto::where('proyecto_id', $this->proyecto->id)
            ->where('item_constructivo_id', $this->item->id)
            ->first()
            ->cantidad_por_unidad_base;

        $this->assertEquals('3.0000', $snapshotOriginal, 'Snapshot debe ser 3 bol/m³');

        // ACCIÓN: cambiar la receta global a 99 bol/m³ (simula que el gerente editó la biblioteca)
        RecetaItem::where('item_constructivo_id', $this->item->id)
            ->update(['cantidad_por_unidad_base' => 99]);

        // El endpoint del modal debe retornar el snapshot (3), NO el global (99)
        $response = $this->actingAs($this->gerente)
            ->getJson("/api/almacenes/{$this->almacen->id}/items/{$this->pip->id}/materiales-receta");

        $response->assertStatus(200);

        $materiales = $response->json('materiales');
        $this->assertNotEmpty($materiales, 'El endpoint debe retornar materiales');

        $cemento = collect($materiales)->firstWhere('material_id', $this->cemento->id);
        $this->assertNotNull($cemento, 'Debe retornar el cemento');

        // La cantidad teórica total DEBE SER 3 × 10 = 30, NO 99 × 10 = 990
        $this->assertNotEquals(990.0, (float) $cemento['cantidad_teorica_total'],
            'La cantidad NO debe ser 990 (99 bol × 10 m³) — la biblioteca global fue modificada pero el snapshot protege al proyecto');

        $this->assertEquals(30.0, (float) $cemento['cantidad_teorica_total'],
            'La cantidad debe ser 30 (3 bol × 10 m³) — valor del snapshot al momento de generar el presupuesto');

        $this->assertEquals('tipologia', $cemento['fuente'],
            'La fuente debe ser "tipologia" (snapshot), no "global"');
    }

    // ── Test: endpoint receta-con-stock también usa el snapshot ──────────────

    public function test_receta_con_stock_usa_snapshot_no_global(): void
    {
        // Cambiar biblioteca a 99
        RecetaItem::where('item_constructivo_id', $this->item->id)
            ->update(['cantidad_por_unidad_base' => 99]);

        $response = $this->actingAs($this->gerente)
            ->getJson("/api/presupuesto-items-proyecto/{$this->pip->id}/receta-con-stock/{$this->almacen->id}");

        $response->assertStatus(200);
        $r = $response->json('data.0');

        $this->assertEquals(3.0, (float) $r['cantidad_por_unidad_base'],
            'receta-con-stock también debe usar el snapshot (3.0), no la global (99.0)');
        $this->assertEquals(30.0, (float) $r['teorico_total'],
            'teórico_total debe ser 3 × 10 = 30, no 990');
        $this->assertEquals('tipologia', $r['fuente']);
    }

    // ── Test: generarDesde crea snapshot con la receta vigente ───────────────

    public function test_generar_presupuesto_crea_snapshot_de_receta_vigente(): void
    {
        $this->assertDatabaseHas('overrides_items_proyecto', [
            'proyecto_id'          => $this->proyecto->id,
            'item_constructivo_id' => $this->item->id,
            'material_id'          => $this->cemento->id,
            'nivel'                => 'tipologia',
            'vivienda_id'          => null,
        ]);

        $count = OverrideItemProyecto::where('proyecto_id', $this->proyecto->id)->count();
        $this->assertEquals(1, $count,
            'Debe haber exactamente 1 snapshot (1 material en la receta del ítem)');
    }

    // ── Test: snapshot no sobreescribe override manual pre-existente ─────────

    public function test_regenerar_presupuesto_respeta_overrides_manuales(): void
    {
        // Primero: admin sube manualmente el coeficiente a 5.0 (override manual)
        OverrideItemProyecto::where('proyecto_id', $this->proyecto->id)
            ->where('item_constructivo_id', $this->item->id)
            ->update(['cantidad_por_unidad_base' => 5.0, 'justificacion' => 'Override manual gerente']);

        $viviendas = Vivienda::where('proyecto_id', $this->proyecto->id)->get();

        // Regenerar presupuesto (llama a generarDesde de nuevo)
        $service = app(PresupuestoAutomaticoService::class);
        $service->generarDesde($this->proyecto->id, [[
            'vivienda_id'          => $viviendas->first()->id,
            'item_constructivo_id' => $this->item->id,
            'cantidad_planificada' => 10.0,
            'orden'                => 1,
        ]], $this->gerente->id);

        // El override manual (5.0) debe conservarse
        $override = OverrideItemProyecto::where('proyecto_id', $this->proyecto->id)
            ->where('item_constructivo_id', $this->item->id)
            ->whereNull('vivienda_id')
            ->first();

        $this->assertEquals('5.0000', $override->cantidad_por_unidad_base,
            'El override manual (5.0) debe conservarse; firstOrCreate no sobreescribe');
    }
}
