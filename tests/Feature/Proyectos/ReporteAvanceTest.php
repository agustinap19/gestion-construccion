<?php

namespace Tests\Feature\Proyectos;

use App\Models\CategoriaConstructiva;
use App\Models\CategoriaMaterial;
use App\Models\HistorialCambioItem;
use App\Models\ItemConstructivo;
use App\Models\Material;
use App\Models\PresupuestoItemProyecto;
use App\Models\ProductoContractual;
use App\Models\Proyecto;
use App\Models\ReporteAvance;
use App\Models\Rol;
use App\Models\UnidadMedida;
use App\Models\User;
use App\Models\Vivienda;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReporteAvanceTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function crearUsuarioConRol(string $rolNombre): User
    {
        $rol  = Rol::create(['nombre' => $rolNombre, 'nombre_visible' => $rolNombre]);
        $user = User::factory()->create(['debe_cambiar_password' => false]);
        $user->update(['rol_id' => $rol->id]);
        return $user->fresh();
    }

    private function crearContexto(int $nItems = 1, ?string $productoNombre = null): array
    {
        $proyecto = Proyecto::create([
            'codigo'                   => 'PRJ-RA-' . uniqid(),
            'nombre'                   => 'Proyecto ReporteAvance Test',
            'categoria'                => 'social',
            'estado'                   => 'en_ejecucion',
            'prioridad'                => 'media',
            'fecha_inicio_planificada' => '2026-06-01',
            'fecha_fin_planificada'    => '2027-06-01',
        ]);

        $vivienda = Vivienda::create([
            'codigo'      => 'VIV-RA-' . uniqid(),
            'proyecto_id' => $proyecto->id,
            'estado'      => 'planificada',
        ]);

        $cat = CategoriaConstructiva::firstOrCreate(
            ['nombre' => 'CatRA'],
            ['color'  => '#a855f7']
        );

        $producto = null;
        if ($productoNombre) {
            $producto = ProductoContractual::create([
                'proyecto_id' => $proyecto->id,
                'nombre'      => $productoNombre,
                'porcentaje'  => 25.0,
                'estado'      => 'pendiente',
                'orden'       => 1,
            ]);
        }

        $pips = [];
        for ($i = 1; $i <= $nItems; $i++) {
            $item = ItemConstructivo::create([
                'codigo'                    => 'ITM-RA' . uniqid(),
                'nombre'                    => "Item Reporte $i",
                'unidad_base'               => 'm2',
                'categoria_constructiva_id' => $cat->id,
                'estado'                    => true,
            ]);

            $pip = PresupuestoItemProyecto::create([
                'proyecto_id'               => $proyecto->id,
                'vivienda_id'               => $vivienda->id,
                'item_constructivo_id'      => $item->id,
                'cantidad_planificada'      => 10.0,
                'ponderacion_avance'        => round(100 / $nItems, 4),
                'orden'                     => $i,
                'estado_ejecucion'          => 'pendiente',
                'porcentaje_avance'         => 0,
                'producto_contractual_id'   => $producto?->id,
            ]);

            $pips[] = $pip;
        }

        return compact('proyecto', 'vivienda', 'pips', 'producto');
    }

    private function fotoFalsa(): UploadedFile
    {
        Storage::fake('public');
        return UploadedFile::fake()->image('evidencia.jpg', 400, 300);
    }

    // ── Test 1: sin foto → 422 ────────────────────────────────────────────────

    public function test_registrar_reporte_sin_foto_es_rechazado(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0];
        $user = $this->crearUsuarioConRol('gerente');

        $res = $this->actingAs($user)
            ->postJson("/api/viviendas/{$ctx['vivienda']->id}/reportes-avance", [
                'presupuesto_item_proyecto_id' => $pip->id,
                'porcentaje_avance'            => 50,
            ]);

        $res->assertStatus(422);
        $this->assertStringContainsString('obligatoria', strtolower($res->json('message') ?? implode(' ', $res->json('errors.foto') ?? [])));
    }

    // ── Test 2: con foto actualiza avance del item ────────────────────────────

    public function test_registrar_reporte_con_foto_actualiza_avance_del_item(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0];
        $user = $this->crearUsuarioConRol('gerente');

        $res = $this->actingAs($user)
            ->post("/api/viviendas/{$ctx['vivienda']->id}/reportes-avance", [
                'presupuesto_item_proyecto_id' => $pip->id,
                'porcentaje_avance'            => '75',
                'foto'                         => $this->fotoFalsa(),
            ]);

        $res->assertStatus(201);
        $pipFresh = $pip->fresh();
        $this->assertEquals(75.0, (float) $pipFresh->porcentaje_avance);
        $this->assertEquals('en_proceso', $pipFresh->estado_ejecucion);
    }

    // ── Test 3: al 100% → estado terminado ───────────────────────────────────

    public function test_registrar_reporte_al_100_marca_item_terminado(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0];
        $user = $this->crearUsuarioConRol('gerente');

        $this->actingAs($user)
            ->post("/api/viviendas/{$ctx['vivienda']->id}/reportes-avance", [
                'presupuesto_item_proyecto_id' => $pip->id,
                'porcentaje_avance'            => '100',
                'foto'                         => $this->fotoFalsa(),
            ])
            ->assertStatus(201);

        $this->assertEquals('terminado', $pip->fresh()->estado_ejecucion);
    }

    // ── Test 4: cascada avance vivienda ──────────────────────────────────────

    public function test_cascada_actualiza_avance_vivienda(): void
    {
        // 4 items con ponderación 25% cada uno
        $ctx  = $this->crearContexto(nItems: 4);
        $user = $this->crearUsuarioConRol('gerente');
        $pip1 = $ctx['pips'][0];

        $res = $this->actingAs($user)
            ->post("/api/viviendas/{$ctx['vivienda']->id}/reportes-avance", [
                'presupuesto_item_proyecto_id' => $pip1->id,
                'porcentaje_avance'            => '100',
                'foto'                         => $this->fotoFalsa(),
            ])
            ->assertStatus(201);

        // 1 de 4 items al 100%, ponderación 25%
        // avance vivienda = (100×25 + 0×25 + 0×25 + 0×25) / 100 = 25%
        $avanceVivienda = $res->json('avance_vivienda');
        $this->assertEquals(25.0, $avanceVivienda, 'Avance vivienda debe ser 25% (suma ponderada)');
        $this->assertEquals(25.0, (float) $ctx['vivienda']->fresh()->porcentaje_avance);
    }

    // ── Test 5: cascada avance proyecto ──────────────────────────────────────

    public function test_cascada_actualiza_avance_proyecto(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0];
        $user = $this->crearUsuarioConRol('gerente');

        $res = $this->actingAs($user)
            ->post("/api/viviendas/{$ctx['vivienda']->id}/reportes-avance", [
                'presupuesto_item_proyecto_id' => $pip->id,
                'porcentaje_avance'            => '80',
                'foto'                         => $this->fotoFalsa(),
            ])
            ->assertStatus(201);

        $avanceProyecto = $res->json('avance_proyecto');
        $this->assertGreaterThan(0, $avanceProyecto);
        $this->assertGreaterThan(0, (float) $ctx['proyecto']->fresh()->avance_fisico);
    }

    // ── Test 6: producto listo para cobro cuando todos sus items al 100% ──────

    public function test_producto_se_marca_listo_si_todos_sus_items_al_100(): void
    {
        $ctx  = $this->crearContexto(nItems: 2, productoNombre: 'Producto 1');
        $user = $this->crearUsuarioConRol('gerente');
        $vid  = $ctx['vivienda']->id;

        // Marcar primer item al 100%
        $this->actingAs($user)
            ->post("/api/viviendas/{$vid}/reportes-avance", [
                'presupuesto_item_proyecto_id' => $ctx['pips'][0]->id,
                'porcentaje_avance'            => '100',
                'foto'                         => $this->fotoFalsa(),
            ])
            ->assertStatus(201);

        // El producto NO debe estar listo aún
        $this->assertNotEquals('listo_para_cobro', $ctx['producto']->fresh()->estado);

        // Marcar segundo item al 100%
        $res = $this->actingAs($user)
            ->post("/api/viviendas/{$vid}/reportes-avance", [
                'presupuesto_item_proyecto_id' => $ctx['pips'][1]->id,
                'porcentaje_avance'            => '100',
                'foto'                         => $this->fotoFalsa(),
            ])
            ->assertStatus(201);

        $this->assertTrue($res->json('producto_listo_para_cobro'));
        $this->assertEquals('listo_para_cobro', $ctx['producto']->fresh()->estado);
    }

    // ── Test 7: retrogradar sin justificación → 422 ───────────────────────────

    public function test_retrogradar_sin_justificacion_es_rechazado(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0];
        $pip->update(['porcentaje_avance' => 75, 'estado_ejecucion' => 'en_proceso']);
        $user = $this->crearUsuarioConRol('gerente');

        $res = $this->actingAs($user)
            ->post("/api/viviendas/{$ctx['vivienda']->id}/reportes-avance", [
                'presupuesto_item_proyecto_id' => $pip->id,
                'porcentaje_avance'            => '50',
                'foto'                         => $this->fotoFalsa(),
                // sin observacion
            ]);

        $res->assertStatus(422);
        $this->assertStringContainsString('observaci', strtolower($res->json('message') ?? ''));
    }

    // ── Test 8: retrogradar con justificación → 200 ───────────────────────────

    public function test_retrogradar_con_justificacion_funciona(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0];
        $pip->update(['porcentaje_avance' => 75, 'estado_ejecucion' => 'en_proceso']);
        $user = $this->crearUsuarioConRol('gerente');

        $this->actingAs($user)
            ->post("/api/viviendas/{$ctx['vivienda']->id}/reportes-avance", [
                'presupuesto_item_proyecto_id' => $pip->id,
                'porcentaje_avance'            => '50',
                'foto'                         => $this->fotoFalsa(),
                'observacion'                  => 'Se detectó un error en el avance anterior',
            ])
            ->assertStatus(201);

        $this->assertEquals(50.0, (float) $pip->fresh()->porcentaje_avance);
    }

    // ── Test 9: historial retorna reportes del item ordenados ────────────────

    public function test_historial_retorna_reportes_del_item_ordenados(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0];
        $user = $this->crearUsuarioConRol('gerente');
        $vid  = $ctx['vivienda']->id;

        // Registrar 3 reportes
        foreach ([25, 50, 75] as $pct) {
            $pip->update(['porcentaje_avance' => $pct - 25]);
            $this->actingAs($user)
                ->post("/api/viviendas/{$vid}/reportes-avance", [
                    'presupuesto_item_proyecto_id' => $pip->id,
                    'porcentaje_avance'            => (string) $pct,
                    'foto'                         => $this->fotoFalsa(),
                ])
                ->assertStatus(201);
        }

        $res = $this->actingAs($user)
            ->getJson("/api/viviendas/{$vid}/reportes-avance?item_id={$pip->id}");

        $res->assertStatus(200);
        $reportes = $res->json('data');
        $this->assertCount(3, $reportes);
        // Ordenados desc por fecha → primer elemento es el más reciente (75%)
        $this->assertEquals(75.0, (float) $reportes[0]['porcentaje_avance']);
    }

    // ── Test 10: PATCH directo sin pasar por reporte → 404 ───────────────────

    public function test_checklist_dashboard_no_tiene_endpoint_para_marcar_avance_directo(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0];
        $user = $this->crearUsuarioConRol('gerente');

        // El PATCH directo debe retornar 404 (ruta eliminada)
        $res = $this->actingAs($user)
            ->patchJson("/api/viviendas/{$ctx['vivienda']->id}/checklist/{$pip->id}/avance", [
                'porcentaje_avance' => 50,
            ]);

        $res->assertStatus(404);
    }

    // ── Test 11: auditoría registra reporte con usuario, fecha y valores ──────

    public function test_auditoria_registra_reporte_con_usuario_fecha_y_valores(): void
    {
        $ctx  = $this->crearContexto();
        $pip  = $ctx['pips'][0];
        $user = $this->crearUsuarioConRol('gerente');

        $this->actingAs($user)
            ->post("/api/viviendas/{$ctx['vivienda']->id}/reportes-avance", [
                'presupuesto_item_proyecto_id' => $pip->id,
                'porcentaje_avance'            => '60',
                'foto'                         => $this->fotoFalsa(),
                'observacion'                  => 'Avance registrado en test de auditoría',
            ])
            ->assertStatus(201);

        $historial = HistorialCambioItem::where('pip_id', $pip->id)
            ->where('tipo_cambio', 'avance_reporte')
            ->first();

        $this->assertNotNull($historial, 'Debe existir registro de auditoría');
        $this->assertEquals($user->id, $historial->usuario_id);
        $this->assertEquals(0.0,  (float) $historial->valores_antes['porcentaje_avance']);
        $this->assertEquals(60.0, (float) $historial->valores_despues['porcentaje_avance']);
        $this->assertEquals('Avance registrado en test de auditoría', $historial->descripcion);
    }
}
