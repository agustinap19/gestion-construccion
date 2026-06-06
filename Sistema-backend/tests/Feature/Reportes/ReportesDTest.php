<?php

namespace Tests\Feature\Reportes;

use App\Models\User;
use App\Models\Almacen;
use App\Models\Proyecto;
use App\Models\Beneficiario;
use App\Models\Material;
use App\Models\MovimientoAlmacen;
use App\Models\DetalleMovimientoAlmacen;
use App\Models\PresupuestoMaterialProyecto;
use App\Models\EvidenciaMovimiento;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReportesDTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $proyecto;
    protected $almacen;
    protected $beneficiario;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        // Asignar rol o permisos si fuera necesario, o saltar auth para tests
        
        $this->proyecto = Proyecto::factory()->create([
            'categoria' => 'social',
            'estado' => 'en_ejecucion'
        ]);
        
        $this->almacen = Almacen::factory()->create([
            'proyecto_id' => $this->proyecto->id,
            'tipo' => 'obra'
        ]);

        $this->beneficiario = Beneficiario::create([
            'proyecto_id' => $this->proyecto->id,
            'nombre' => 'Juan',
            'apellido_paterno' => 'Perez',
            'ci' => '1234567',
            'ci_expedido' => 'LP',
            'estado_seleccion' => 'candidato',
            'codigo_beneficiario' => 'BEN-001'
        ]);
    }

    public function test_puede_generar_kardex_pdf()
    {
        $response = $this->actingAs($this->user)->postJson("/api/almacenes/{$this->almacen->id}/reportes/kardex", [
            'formato' => 'pdf',
            'variante' => 'oficial'
        ]);

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_puede_generar_balance_consolidado_pdf()
    {
        $response = $this->actingAs($this->user)->postJson("/api/proyectos/{$this->proyecto->id}/reportes/balance-consolidado", [
            'formato' => 'pdf'
        ]);

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_puede_generar_reporte_fotografico_pdf()
    {
        $response = $this->actingAs($this->user)->postJson("/api/beneficiarios/{$this->beneficiario->id}/reportes/fotografico", [
            'formato' => 'pdf'
        ]);

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_puede_generar_planilla_entregas_pdf()
    {
        $response = $this->actingAs($this->user)->postJson("/api/beneficiarios/{$this->beneficiario->id}/reportes/planilla-entregas", [
            'formato' => 'pdf'
        ]);

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_validacion_documento_qr_endpoint()
    {
        // Generar un documento para validar
        $this->actingAs($this->user)->postJson("/api/almacenes/{$this->almacen->id}/reportes/kardex", [
            'formato' => 'pdf',
            'variante' => 'oficial'
        ]);

        $doc = \App\Models\DocumentoEmitido::first();
        $this->assertNotNull($doc);

        $response = $this->get("/verificar-documento/{$doc->hash}");
        $response->assertStatus(200);
        $response->assertSee('Documento Auténtico');
    }
}
