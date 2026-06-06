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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * El test de fuego: la sugerencia del modal NO puede cambiar
 * cuando alguien edita la Biblioteca Constructiva.
 */
class SnapshotDefinitivoTest extends TestCase
{
    use RefreshDatabase;

    private User $almacenero;
    private Proyecto $proyecto;
    private Almacen $almacen;

    protected function setUp(): void
    {
        parent::setUp();

        $rol = Rol::create(['nombre' => 'almac_def', 'nombre_visible' => 'Almacenero Definitivo']);
        foreach (['almacenes.ver', 'presupuesto_materiales.ver'] as $codigo) {
            $p = Permiso::firstOrCreate(['codigo' => $codigo], [
                'nombre' => $codigo, 'nombre_visible' => $codigo,
                'modulo' => 'almacenes', 'accion' => 'ver',
            ]);
            $rol->permisos()->syncWithoutDetaching([$p->id]);
        }
        $this->almacenero = User::factory()->create(['debe_cambiar_password' => false]);
        $this->almacenero->update(['rol_id' => $rol->id]);

        $this->proyecto = Proyecto::create([
            'codigo' => 'DEF-01', 'nombre' => 'Proyecto Snapshot Definitivo',
            'categoria' => 'social', 'estado' => 'en_ejecucion', 'prioridad' => 'media',
            'fecha_inicio_planificada' => '2026-06-01', 'fecha_fin_planificada' => '2027-06-01',
        ]);

        $this->almacen = Almacen::create([
            'codigo' => 'ALM-DEF', 'nombre' => 'Almacén Definitivo',
            'tipo' => 'obra', 'estado' => 'activo', 'proyecto_id' => $this->proyecto->id,
        ]);
    }

    // ── El test de fuego principal ────────────────────────────────────────────

    public function test_sugerencia_no_cambia_cuando_biblioteca_se_actualiza(): void
    {
        $um  = UnidadMedida::firstOrCreate(['simbolo' => 'bol'], ['nombre' => 'Bolsa', 'activa' => true]);
        $cat = CategoriaMaterial::firstOrCreate(['nombre' => 'Cem'], ['color' => '#fbbf24']);
        $material = Material::create([
            'codigo' => 'CEM-DEF', 'nombre' => 'Cemento Definitivo',
            'unidad_medida_id' => $um->id, 'categoria_id' => $cat->id,
            'tipo' => 'maestro', 'estado' => true,
        ]);

        $catC = CategoriaConstructiva::firstOrCreate(['nombre' => 'EstrDef'], ['color' => '#60a5fa']);
        $item = ItemConstructivo::create([
            'codigo' => 'ITM-DEF', 'nombre' => 'Hormigón ciclópeo DEF',
            'unidad_base' => 'm3', 'categoria_constructiva_id' => $catC->id, 'estado' => true,
        ]);

        StockMaterial::create([
            'almacen_id' => $this->almacen->id, 'material_id' => $material->id,
            'cantidad' => 500.0, 'cantidad_reservada' => 0, 'costo_promedio' => 10.0,
        ]);

        // Receta global: 3 bolsas/m³
        RecetaItem::create([
            'item_constructivo_id'     => $item->id,
            'material_id'              => $material->id,
            'cantidad_por_unidad_base' => 3,
            'unidad_material'          => 'bol',
        ]);

        // Crear PIP (snapshot del proyecto: 10 m³ planificados)
        // El observer `booted()` crea automáticamente el snapshot con 3 bol/m³
        $vivienda = Vivienda::create([
            'codigo' => 'VIV-DEF', 'proyecto_id' => $this->proyecto->id, 'estado' => 'planificada',
        ]);
        $pip = PresupuestoItemProyecto::create([
            'proyecto_id'          => $this->proyecto->id,
            'vivienda_id'          => $vivienda->id,
            'item_constructivo_id' => $item->id,
            'cantidad_planificada' => 10,
            'orden'                => 1,
            'estado_ejecucion'     => 'pendiente',
        ]);

        // Verificar que el snapshot se creó automáticamente con 3
        $this->assertDatabaseHas('overrides_items_proyecto', [
            'proyecto_id'              => $this->proyecto->id,
            'item_constructivo_id'     => $item->id,
            'material_id'              => $material->id,
            'nivel'                    => 'tipologia',
            'vivienda_id'              => null,
        ]);
        $snap = OverrideItemProyecto::where('proyecto_id', $this->proyecto->id)
            ->where('item_constructivo_id', $item->id)->first();
        $this->assertEquals('3.0000', $snap->cantidad_por_unidad_base,
            'El snapshot debe capturar 3 bol/m³ al momento de crear el PIP');

        // ACCIÓN: alguien edita la Biblioteca Global a 99 bol/m³
        RecetaItem::where('item_constructivo_id', $item->id)
            ->update(['cantidad_por_unidad_base' => 99]);

        // Verificar que la global cambió
        $globalActual = RecetaItem::where('item_constructivo_id', $item->id)->value('cantidad_por_unidad_base');
        $this->assertEquals(99, $globalActual, 'La receta global debe ser 99 ahora');

        // Llamar al endpoint que usa el modal de entrega
        $response = $this->actingAs($this->almacenero)
            ->getJson("/api/almacenes/{$this->almacen->id}/items/{$pip->id}/materiales-receta");

        $response->assertStatus(200);

        $materiales = $response->json('materiales');
        $this->assertNotEmpty($materiales, 'El endpoint debe retornar materiales');

        $cantidadSugerida = (float) $materiales[0]['cantidad_teorica_total'];

        // DEBE SER 30 (3 × 10), no 990 (99 × 10)
        $this->assertEquals(30, $cantidadSugerida,
            "El modal está usando la receta global (99×10=990) en vez del snapshot (3×10=30). Bug no corregido.");

        $this->assertNotEquals(990, $cantidadSugerida,
            'Si esto falla, el sistema está usando la receta global en vez del snapshot del proyecto');

        $this->assertEquals('tipologia', $materiales[0]['fuente'],
            'La fuente debe ser tipologia (snapshot), no global');
    }

    // ── El mismo test pero vía receta-con-stock (el otro endpoint del modal) ──

    public function test_receta_con_stock_tampoco_usa_global_cuando_cambia(): void
    {
        $um  = UnidadMedida::firstOrCreate(['simbolo' => 'bol'], ['nombre' => 'Bolsa', 'activa' => true]);
        $cat = CategoriaMaterial::firstOrCreate(['nombre' => 'Cem'], ['color' => '#fbbf24']);
        $material = Material::create([
            'codigo' => 'CEM-DEF2', 'nombre' => 'Cemento Definitivo 2',
            'unidad_medida_id' => $um->id, 'categoria_id' => $cat->id,
            'tipo' => 'maestro', 'estado' => true,
        ]);

        $catC = CategoriaConstructiva::firstOrCreate(['nombre' => 'EstrDef'], ['color' => '#60a5fa']);
        $item = ItemConstructivo::create([
            'codigo' => 'ITM-DEF2', 'nombre' => 'Hormigón ciclópeo DEF2',
            'unidad_base' => 'm3', 'categoria_constructiva_id' => $catC->id, 'estado' => true,
        ]);

        RecetaItem::create([
            'item_constructivo_id' => $item->id, 'material_id' => $material->id,
            'cantidad_por_unidad_base' => 3, 'unidad_material' => 'bol',
        ]);

        $vivienda = Vivienda::create([
            'codigo' => 'VIV-DEF2', 'proyecto_id' => $this->proyecto->id, 'estado' => 'planificada',
        ]);
        $pip = PresupuestoItemProyecto::create([
            'proyecto_id' => $this->proyecto->id, 'vivienda_id' => $vivienda->id,
            'item_constructivo_id' => $item->id, 'cantidad_planificada' => 10,
            'orden' => 1, 'estado_ejecucion' => 'pendiente',
        ]);

        // Cambiar global a 99
        RecetaItem::where('item_constructivo_id', $item->id)->update(['cantidad_por_unidad_base' => 99]);

        $response = $this->actingAs($this->almacenero)
            ->getJson("/api/presupuesto-items-proyecto/{$pip->id}/receta-con-stock/{$this->almacen->id}");

        $response->assertStatus(200);
        $r = $response->json('data.0');

        $this->assertEquals(3.0, (float) $r['cantidad_por_unidad_base'],
            'receta-con-stock debe usar snapshot (3), no global (99)');
        $this->assertEquals(30.0, (float) $r['teorico_total'],
            'teórico_total debe ser 3×10=30, no 990');
        $this->assertEquals('tipologia', $r['fuente']);
    }
}
