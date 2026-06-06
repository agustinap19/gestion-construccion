<?php

namespace Tests\Feature;

use App\Models\CategoriaConstructiva;
use App\Models\ItemConstructivo;
use App\Models\PresupuestoItemProyecto;
use App\Models\Proyecto;
use App\Models\ReporteAvance;
use App\Models\Rol;
use App\Models\User;
use App\Models\Vivienda;
use App\Services\Proyectos\AvanceService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class SyncMovilTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function crearUsuario(): User
    {
        $rol  = Rol::create(['nombre' => 'tecnico_test_' . uniqid(), 'nombre_visible' => 'Técnico']);
        $user = User::factory()->create([
            'nombre'               => 'Técnico',
            'apellido_paterno'     => 'Prueba',
            'email'                => 'tecnico_' . uniqid() . '@test.com',
            'estado'               => 'activo',
            'debe_cambiar_password' => false,
        ]);
        $user->update(['rol_id' => $rol->id]);
        return $user->fresh();
    }

    private function crearContexto(array $ponderaciones = [50.0]): array
    {
        $user = $this->crearUsuario();

        $proyecto = Proyecto::create([
            'codigo'               => 'SYNC-' . uniqid(),
            'nombre'               => 'Proyecto Sync Test',
            'categoria'            => 'social',
            'estado'               => 'en_ejecucion',
            'prioridad'            => 'media',
            'responsable_id'       => $user->id,
            'latitud'              => -16.5000,
            'longitud'             => -68.1500,
            'fecha_inicio_planificada' => '2026-01-01',
            'fecha_fin_planificada'    => '2027-01-01',
        ]);

        $vivienda = Vivienda::create([
            'codigo'      => 'VIV-SYNC-' . uniqid(),
            'proyecto_id' => $proyecto->id,
            'estado'      => 'planificada',
        ]);

        $cat  = CategoriaConstructiva::firstOrCreate(
            ['nombre' => 'CatSync'],
            ['color'  => '#3b82f6']
        );

        $pips = [];
        foreach ($ponderaciones as $i => $ponderacion) {
            $item = ItemConstructivo::create([
                'codigo'                    => 'ITM-SY-' . uniqid(),
                'nombre'                    => "Item Sync " . ($i + 1),
                'unidad_base'               => 'm2',
                'categoria_constructiva_id' => $cat->id,
                'estado'                    => true,
            ]);

            $pips[] = PresupuestoItemProyecto::create([
                'proyecto_id'          => $proyecto->id,
                'vivienda_id'          => $vivienda->id,
                'item_constructivo_id' => $item->id,
                'cantidad_planificada' => 10.0,
                'ponderacion_avance'   => $ponderacion,
                'orden'                => $i + 1,
                'estado_ejecucion'     => 'pendiente',
                'porcentaje_avance'    => 0,
            ]);
        }

        return compact('user', 'proyecto', 'vivienda', 'pips');
    }

    private function fotoBase64(): string
    {
        return 'data:image/jpeg;base64,' . base64_encode('foto-fake-para-test-sync-movil');
    }

    private function payloadReporte(int $pipId, int $viviendaId, array $extra = []): array
    {
        return array_merge([
            'uuid_local'       => Str::uuid()->toString(),
            'item_id'          => $pipId,
            'vivienda_id'      => $viviendaId,
            'avance_registrado' => 60,
            'latitud'          => -16.5010,
            'longitud'         => -68.1510,
            'foto_base64'      => $this->fotoBase64(),
            'timestamp_local'  => now()->toIso8601String(),
        ], $extra);
    }

    // ── Test 1: pull sin auth falla ───────────────────────────────────────────

    public function test_pull_sin_auth_falla(): void
    {
        $response = $this->getJson('/api/movil/v1/sync/pull');
        $response->assertUnauthorized();
    }

    // ── Test 2: pull primera vez devuelve todo ────────────────────────────────

    public function test_pull_primera_vez_devuelve_todo(): void
    {
        $ctx = $this->crearContexto();

        $response = $this->actingAs($ctx['user'])
            ->getJson('/api/movil/v1/sync/pull');

        $response->assertOk();
        $response->assertJsonStructure([
            'timestamp_servidor',
            'proyectos',
            'viviendas',
            'items',
            'reportes',
        ]);

        $proyectosIds = array_column($response->json('proyectos'), 'id');
        $this->assertContains($ctx['proyecto']->id, $proyectosIds);

        $viviendasIds = array_column($response->json('viviendas'), 'id');
        $this->assertContains($ctx['vivienda']->id, $viviendasIds);

        $itemsIds = array_column($response->json('items'), 'id');
        $this->assertContains($ctx['pips'][0]->id, $itemsIds);

        // El avance del ítem viene desde el servidor (0% inicial)
        $itemData = collect($response->json('items'))->firstWhere('id', $ctx['pips'][0]->id);
        $this->assertEquals(0.0, $itemData['avance_actual']);
        $this->assertEquals((float) $ctx['pips'][0]->ponderacion_avance, $itemData['ponderacion']);
    }

    // ── Test 3: pull con timestamp devuelve solo nuevos ───────────────────────

    public function test_pull_con_timestamp_devuelve_solo_nuevos(): void
    {
        $ctx = $this->crearContexto();

        // Marcar el proyecto como "viejo"
        $ctx['proyecto']->forceFill(['updated_at' => Carbon::parse('2025-01-01 00:00:00')])->save();

        // Crear un proyecto nuevo (updated_at = ahora = 2026-05-29)
        $proyectoNuevo = Proyecto::create([
            'codigo'         => 'SYNC-NEW-' . uniqid(),
            'nombre'         => 'Proyecto Nuevo',
            'categoria'      => 'social',
            'estado'         => 'en_ejecucion',
            'prioridad'      => 'media',
            'responsable_id' => $ctx['user']->id,
        ]);

        $ultimoSync = '2026-01-01T00:00:00Z';

        $response = $this->actingAs($ctx['user'])
            ->getJson("/api/movil/v1/sync/pull?ultimo_sync={$ultimoSync}");

        $response->assertOk();
        $ids = array_column($response->json('proyectos'), 'id');

        $this->assertNotContains($ctx['proyecto']->id, $ids, 'El proyecto viejo no debe aparecer en el delta');
        $this->assertContains($proyectoNuevo->id, $ids, 'El proyecto nuevo debe aparecer en el delta');
    }

    // ── Test 4: push sin foto falla ───────────────────────────────────────────

    public function test_push_reporte_sin_foto_falla(): void
    {
        Storage::fake('public');
        $ctx = $this->crearContexto();

        $response = $this->actingAs($ctx['user'])
            ->postJson('/api/movil/v1/sync/push', [
                'reportes' => [
                    $this->payloadReporte($ctx['pips'][0]->id, $ctx['vivienda']->id, [
                        'foto_base64' => null,  // sin foto
                    ]),
                ],
            ]);

        $response->assertStatus(422);
        $this->assertEquals(0, $response->json('procesados'));
        $this->assertGreaterThan(0, $response->json('errores'));

        $mensaje = strtolower($response->json('detalle.0.mensaje') ?? '');
        $this->assertStringContainsString('foto', $mensaje);
    }

    // ── Test 5: push sin coordenadas falla ───────────────────────────────────

    public function test_push_reporte_sin_coordenadas_falla(): void
    {
        Storage::fake('public');
        $ctx = $this->crearContexto();

        $payload = $this->payloadReporte($ctx['pips'][0]->id, $ctx['vivienda']->id);
        unset($payload['latitud'], $payload['longitud']);

        $response = $this->actingAs($ctx['user'])
            ->postJson('/api/movil/v1/sync/push', ['reportes' => [$payload]]);

        $response->assertStatus(422);
        $this->assertEquals(0, $response->json('procesados'));
        $this->assertGreaterThan(0, $response->json('errores'));

        $mensaje = strtolower($response->json('detalle.0.mensaje') ?? '');
        $this->assertStringContainsString('latitud', $mensaje);
    }

    // ── Test 6: push válido recalcula avance en cascada ───────────────────────

    public function test_push_reporte_valido_recalcula_avance_cascada(): void
    {
        Storage::fake('public');
        $ctx = $this->crearContexto([5.0]);  // 1 PIP (decimal(6,4) max 99.9999)

        $response = $this->actingAs($ctx['user'])
            ->postJson('/api/movil/v1/sync/push', [
                'reportes' => [
                    $this->payloadReporte($ctx['pips'][0]->id, $ctx['vivienda']->id, [
                        'avance_registrado' => 75,
                    ]),
                ],
            ]);

        $response->assertOk();
        $this->assertEquals(1, $response->json('procesados'));
        $this->assertEquals(0, $response->json('errores'));
        $this->assertNotNull($response->json('detalle.0.id_servidor'));

        // PIP actualizado
        $pip = $ctx['pips'][0]->fresh();
        $this->assertEquals(75.0, (float) $pip->porcentaje_avance);
        $this->assertEquals('en_proceso', $pip->estado_ejecucion);

        // Vivienda actualizada (1 PIP al 75% con ponderación 100%)
        $vivienda = $ctx['vivienda']->fresh();
        $this->assertEquals(75.0, (float) $vivienda->porcentaje_avance);

        // Proyecto actualizado
        $proyecto = $ctx['proyecto']->fresh();
        $this->assertGreaterThan(0, (float) $proyecto->avance_fisico);
    }

    // ── Test 7: push duplicado es idempotente ─────────────────────────────────

    public function test_push_duplicado_es_idempotente(): void
    {
        Storage::fake('public');
        $ctx       = $this->crearContexto();
        $uuidLocal = Str::uuid()->toString();

        $payload = ['reportes' => [
            $this->payloadReporte($ctx['pips'][0]->id, $ctx['vivienda']->id, [
                'uuid_local' => $uuidLocal,
            ]),
        ]];

        // Primera vez → ok
        $r1 = $this->actingAs($ctx['user'])->postJson('/api/movil/v1/sync/push', $payload);
        $r1->assertOk();
        $this->assertEquals(1, $r1->json('procesados'));
        $idServidor = $r1->json('detalle.0.id_servidor');

        // Segunda vez → duplicado idempotente (no crea nuevo reporte)
        $r2 = $this->actingAs($ctx['user'])->postJson('/api/movil/v1/sync/push', $payload);
        $r2->assertOk();

        $this->assertEquals('duplicado', $r2->json('detalle.0.estado'));
        $this->assertEquals($idServidor, $r2->json('detalle.0.id_servidor'));

        // Solo debe existir un reporte en la BD
        $this->assertEquals(1, ReporteAvance::where('uuid_local', $uuidLocal)->count());
    }

    // ── Test 8: avance de vivienda es ponderado, no promedio simple ───────────

    public function test_avance_vivienda_ponderado_correcto(): void
    {
        // 3 PIPs con ponderaciones 50, 30, 20
        $ctx = $this->crearContexto([50.0, 30.0, 20.0]);

        // Fijar avances directamente en los PIPs
        $ctx['pips'][0]->update(['porcentaje_avance' => 80]);
        $ctx['pips'][1]->update(['porcentaje_avance' => 60]);
        $ctx['pips'][2]->update(['porcentaje_avance' => 40]);

        $servicio = app(AvanceService::class);
        $avance   = $servicio->recalcularVivienda($ctx['vivienda']->id);

        // Esperado: (80×50 + 60×30 + 40×20) / (50+30+20) = 6600 / 100 = 66.0
        $this->assertEquals(66.0, $avance, 'Avance ponderado debe ser 66%, no el promedio simple 60%');
        $this->assertEquals(66.0, (float) $ctx['vivienda']->fresh()->porcentaje_avance);
    }

    // ── Test 9: avance del proyecto es el promedio de sus viviendas ───────────

    public function test_avance_proyecto_promedio_viviendas(): void
    {
        $ctx = $this->crearContexto();

        // Crear segunda vivienda en el mismo proyecto
        $vivienda2 = Vivienda::create([
            'codigo'      => 'VIV-SYNC2-' . uniqid(),
            'proyecto_id' => $ctx['proyecto']->id,
            'estado'      => 'planificada',
        ]);

        // Fijar avances directamente
        $ctx['vivienda']->update(['porcentaje_avance' => 60]);
        $vivienda2->update(['porcentaje_avance' => 80]);

        $servicio = app(AvanceService::class);
        $avance   = $servicio->recalcularProyecto($ctx['proyecto']->id);

        // Esperado: AVG(60, 80) = 70
        $this->assertEquals(70.0, $avance, 'Avance proyecto debe ser el promedio de sus viviendas');
        $this->assertEquals(70.0, (float) $ctx['proyecto']->fresh()->avance_fisico);
    }
}
