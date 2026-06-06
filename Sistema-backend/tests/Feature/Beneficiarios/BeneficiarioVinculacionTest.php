<?php

namespace Tests\Feature\Beneficiarios;

use App\Models\Beneficiario;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\TipoVivienda;
use App\Models\User;
use App\Models\Vivienda;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BeneficiarioVinculacionTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function crearRol(string $nombre = 'gerente'): Rol
    {
        return Rol::firstOrCreate(
            ['nombre' => $nombre],
            ['nombre_visible' => ucfirst($nombre), 'es_sistema' => true, 'estado' => 'activo']
        );
    }

    private function crearUsuario(Rol $rol): User
    {
        return User::create([
            'nombre'           => 'Test',
            'apellido_paterno' => 'Tester',
            'ci'               => 'CI-' . uniqid(),
            'email'            => 'tst-' . uniqid() . '@example.com',
            'password'         => bcrypt('secret'),
            'rol_id'           => $rol->id,
            'estado'           => 'activo',
        ]);
    }

    private function crearProyectoSocial(User $user, int $cantBenef = 5): Proyecto
    {
        return Proyecto::create([
            'codigo'                    => 'PRJ-' . uniqid(),
            'nombre'                    => 'Proyecto Social Test',
            'categoria'                 => 'social',
            'estado'                    => 'adjudicado',
            'presupuesto_referencial'   => 500000,
            'fecha_inicio_planificada'  => '2026-06-01',
            'fecha_fin_planificada'     => '2027-06-01',
            'cantidad_beneficiarios'    => $cantBenef,
            'creado_por_id'             => $user->id,
        ]);
    }

    private function crearVivienda(Proyecto $proyecto, string $codigo, ?int $beneficiarioId = null): Vivienda
    {
        return Vivienda::create([
            'codigo'           => $codigo,
            'proyecto_id'      => $proyecto->id,
            'beneficiario_id'  => $beneficiarioId,
            'estado'           => 'planificada',
            'porcentaje_avance'=> 0,
        ]);
    }

    private function payloadBenef(int $proyectoId, array $extra = []): array
    {
        return array_merge([
            'proyecto_id'        => $proyectoId,
            'nombre'             => 'Ana',
            'apellido_paterno'   => 'Mamani',
            'ci'                 => 'CI-' . uniqid(),
            'telefono_principal' => '71234567',
            'estado_seleccion'   => 'candidato',
        ], $extra);
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    /** Registrar beneficiario en proyecto con viviendas lo vincula a la primera libre */
    public function test_registrar_beneficiario_vincula_primera_vivienda_libre(): void
    {
        $user     = $this->crearUsuario($this->crearRol());
        $proyecto = $this->crearProyectoSocial($user, 3);

        // Dos viviendas: VIV-002 libre, VIV-001 ya ocupada (para verificar orden numérico)
        $viv1 = $this->crearVivienda($proyecto, 'VIV-001');
        $viv2 = $this->crearVivienda($proyecto, 'VIV-002');

        // Ocupar VIV-001 con un beneficiario previo
        $benPrevio = Beneficiario::create($this->payloadBenef($proyecto->id, [
            'ci'                  => 'CI-PREVIO',
            'codigo_beneficiario' => 'BEN-001',
        ]));
        $viv1->beneficiario_id = $benPrevio->id;
        $viv1->save();

        // El nuevo beneficiario debe obtener VIV-002
        $response = $this->actingAs($user)
            ->postJson('/api/beneficiarios', $this->payloadBenef($proyecto->id))
            ->assertCreated();

        $benId = $response->json('id') ?? $response->json('data.id');
        $this->assertNotNull($benId);

        $viv2->refresh();
        $this->assertEquals($benId, $viv2->beneficiario_id, 'VIV-002 debe quedar asignada al nuevo beneficiario');
    }

    /** Con viviendas llenas, no se puede registrar más beneficiarios */
    public function test_no_permite_registro_cuando_todas_las_viviendas_estan_asignadas(): void
    {
        $user     = $this->crearUsuario($this->crearRol());
        $proyecto = $this->crearProyectoSocial($user, 1);
        $viv      = $this->crearVivienda($proyecto, 'VIV-001');

        // Llenar la única vivienda
        $benOcupado = Beneficiario::create($this->payloadBenef($proyecto->id, [
            'ci'                  => 'CI-OCUP',
            'codigo_beneficiario' => 'BEN-001',
        ]));
        $viv->beneficiario_id = $benOcupado->id;
        $viv->save();

        $this->actingAs($user)
            ->postJson('/api/beneficiarios', $this->payloadBenef($proyecto->id))
            ->assertStatus(422);
    }

    /** Dar de baja libera la vivienda pero conserva el porcentaje de avance */
    public function test_dar_de_baja_libera_vivienda_y_conserva_avance(): void
    {
        $user     = $this->crearUsuario($this->crearRol());
        $proyecto = $this->crearProyectoSocial($user, 2);
        $viv      = $this->crearVivienda($proyecto, 'VIV-001');

        // Crear beneficiario y vincularlo
        $ben = Beneficiario::create($this->payloadBenef($proyecto->id, [
            'ci'                  => 'CI-BAJA',
            'codigo_beneficiario' => 'BEN-001',
            'estado_seleccion'    => 'candidato',
        ]));
        $viv->beneficiario_id = $ben->id;
        $viv->porcentaje_avance = 50;
        $viv->estado = 'obra_gruesa';
        $viv->save();

        // Avanzar estado a aceptado primero (candidato → aceptado → retirado)
        $ben->estado_seleccion = 'aceptado';
        $ben->save();

        // Dar de baja (retirado requiere razón)
        $this->actingAs($user)
            ->patchJson("/api/beneficiarios/{$ben->id}/estado", [
                'estado_seleccion' => 'retirado',
                'razon'            => 'Ya no cumple los requisitos',
            ])
            ->assertOk();

        $viv->refresh();
        $this->assertNull($viv->beneficiario_id, 'La vivienda debe quedar libre');
        $this->assertEquals(50, (float) $viv->porcentaje_avance, 'El avance debe conservarse');
        $this->assertEquals('obra_gruesa', $viv->estado, 'El estado constructivo debe conservarse');
    }

    /** CI debe ser único dentro del mismo proyecto */
    public function test_ci_unico_dentro_del_proyecto_y_repetible_en_otro(): void
    {
        $user       = $this->crearUsuario($this->crearRol());
        $proyecto1  = $this->crearProyectoSocial($user, 2);
        $proyecto2  = $this->crearProyectoSocial($user, 2);
        $ciRepetido = 'CI-D' . substr(uniqid(), -6); // max 10 chars

        // Primer registro en proyecto1 OK
        $this->actingAs($user)
            ->postJson('/api/beneficiarios', $this->payloadBenef($proyecto1->id, ['ci' => $ciRepetido]))
            ->assertCreated();

        // Mismo CI en proyecto1 → error
        $this->actingAs($user)
            ->postJson('/api/beneficiarios', $this->payloadBenef($proyecto1->id, ['ci' => $ciRepetido]))
            ->assertStatus(422);

        // Mismo CI en proyecto2 → OK (distintos proyectos)
        $this->actingAs($user)
            ->postJson('/api/beneficiarios', $this->payloadBenef($proyecto2->id, ['ci' => $ciRepetido]))
            ->assertCreated();
    }

    /** El endpoint de cupo refleja viviendas ocupadas y disponibles correctamente */
    public function test_cupo_proyecto_refleja_estado_real(): void
    {
        $user     = $this->crearUsuario($this->crearRol());
        $proyecto = $this->crearProyectoSocial($user, 3);

        $viv1 = $this->crearVivienda($proyecto, 'VIV-001');
        $viv2 = $this->crearVivienda($proyecto, 'VIV-002');
        $viv3 = $this->crearVivienda($proyecto, 'VIV-003');

        $ben = Beneficiario::create($this->payloadBenef($proyecto->id, [
            'ci'                  => 'CI-CUPO-1',
            'codigo_beneficiario' => 'BEN-001',
        ]));
        $viv1->beneficiario_id = $ben->id;
        $viv1->save();

        $response = $this->actingAs($user)
            ->getJson("/api/beneficiarios/proyecto/{$proyecto->id}/cupo")
            ->assertOk()
            ->assertJsonPath('status', 'success');

        $data = $response->json('data');
        $this->assertEquals(3, $data['cupo_total']);
        $this->assertEquals(1, $data['viviendas_asignadas']);
        $this->assertEquals(1, $data['beneficiarios_registrados']);
        $this->assertEquals(2, $data['cupos_disponibles']);
    }

    /** Si no existen viviendas previas, se auto-crea una vivienda y se vincula al beneficiario */
    public function test_proyecto_sin_viviendas_autocrea_vivienda_al_registrar(): void
    {
        $user     = $this->crearUsuario($this->crearRol());
        $proyecto = $this->crearProyectoSocial($user, 10);
        // No se crean viviendas deliberadamente

        $response = $this->actingAs($user)
            ->postJson('/api/beneficiarios', $this->payloadBenef($proyecto->id))
            ->assertCreated();

        $this->assertDatabaseHas('beneficiarios', [
            'nombre'      => 'Ana',
            'proyecto_id' => $proyecto->id,
        ]);

        // Se debe haber creado automáticamente una vivienda vinculada
        $this->assertEquals(1, Vivienda::where('proyecto_id', $proyecto->id)->count());
        $benId = $response->json('id') ?? $response->json('data.id');
        $this->assertNotNull(Vivienda::where('beneficiario_id', $benId)->first());
    }

    /** Solo proyectos de categoría social permiten registrar beneficiarios */
    public function test_proyecto_no_social_rechaza_beneficiarios(): void
    {
        $user = $this->crearUsuario($this->crearRol());

        $proyectoVial = Proyecto::create([
            'codigo'                    => 'PRJ-PRIV-' . uniqid(),
            'nombre'                    => 'Proyecto Privado',
            'categoria'                 => 'privado',
            'estado'                    => 'adjudicado',
            'presupuesto_referencial'   => 200000,
            'fecha_inicio_planificada'  => '2026-06-01',
            'fecha_fin_planificada'     => '2027-06-01',
            'creado_por_id'             => $user->id,
        ]);

        $this->actingAs($user)
            ->postJson('/api/beneficiarios', $this->payloadBenef($proyectoVial->id))
            ->assertStatus(422);
    }

    /** La subida de foto rechaza archivos que superen 2 MB */
    public function test_subida_foto_rechaza_archivos_grandes(): void
    {
        Storage::fake('public');
        $user = $this->crearUsuario($this->crearRol());

        $archivoGrande = UploadedFile::fake()->create('foto.jpg', 3072, 'image/jpeg'); // 3 MB

        $this->actingAs($user)
            ->postJson('/api/upload/imagen', ['archivo' => $archivoGrande])
            ->assertStatus(422);
    }

    /** La subida de foto acepta imagen válida ≤ 2 MB y devuelve una URL */
    public function test_subida_foto_valida_retorna_url(): void
    {
        Storage::fake('public');
        $user = $this->crearUsuario($this->crearRol());

        $foto = UploadedFile::fake()->image('foto.jpg', 100, 100);

        $response = $this->actingAs($user)
            ->postJson('/api/upload/imagen', ['archivo' => $foto])
            ->assertOk()
            ->assertJsonStructure(['url']);

        $this->assertNotEmpty($response->json('url'));
    }

    /** El orden de asignación sigue el número del código (VIV-2 antes de VIV-10) */
    public function test_asignacion_sigue_orden_numerico_del_codigo(): void
    {
        $user     = $this->crearUsuario($this->crearRol());
        $proyecto = $this->crearProyectoSocial($user, 3);

        // Crear en orden no secuencial para probar el ORDER BY numérico
        $viv10 = $this->crearVivienda($proyecto, 'VIV-10');
        $viv2  = $this->crearVivienda($proyecto, 'VIV-2');
        $viv1  = $this->crearVivienda($proyecto, 'VIV-1');

        $response = $this->actingAs($user)
            ->postJson('/api/beneficiarios', $this->payloadBenef($proyecto->id))
            ->assertCreated();

        $benId = $response->json('id') ?? $response->json('data.id');

        $viv1->refresh();
        $this->assertEquals($benId, $viv1->beneficiario_id, 'VIV-1 debe ser la primera asignada (orden numérico)');

        $viv2->refresh();
        $this->assertNull($viv2->beneficiario_id);

        $viv10->refresh();
        $this->assertNull($viv10->beneficiario_id);
    }
}
