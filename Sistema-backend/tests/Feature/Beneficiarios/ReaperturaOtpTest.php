<?php

namespace Tests\Feature\Beneficiarios;

use App\Mail\CodigoReaperturaMail;
use App\Models\CodigoReapertura;
use App\Models\Permiso;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ReaperturaOtpTest extends TestCase
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

    private function crearUsuario(Rol $rol, string $nombre = 'Juan', string $apellido = 'Perez'): User
    {
        return User::create([
            'nombre' => $nombre, 'apellido_paterno' => $apellido,
            'ci' => 'CI-' . uniqid(),
            'email' => 'usr-' . uniqid() . '@test.com',
            'password' => bcrypt('secret'),
            'rol_id' => $rol->id, 'estado' => 'activo',
        ]);
    }

    private function crearProyectoCerrado(User $user): Proyecto
    {
        $proyecto = Proyecto::create([
            'codigo' => 'PRJ-' . uniqid(), 'nombre' => 'Proyecto OTP Test',
            'categoria' => 'social', 'estado' => 'en_ejecucion',
            'presupuesto_referencial' => 200000,
            'fecha_inicio_planificada' => '2026-01-01',
            'fecha_fin_planificada' => '2027-01-01',
            'creado_por_id' => $user->id,
            'registros_beneficiarios_cerrados' => true,
            'fecha_cierre_registros' => now(),
            'cerrado_registros_por_id' => $user->id,
        ]);
        return $proyecto;
    }

    private function permisosCierre(): array
    {
        return ['beneficiarios.cierre_registros', 'beneficiarios.reapertura_registros'];
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_solicitar_reapertura_genera_otp_y_envia_correo(): void
    {
        Mail::fake();

        $rol = $this->crearRol($this->permisosCierre());
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoCerrado($user);

        $response = $this->actingAs($user)
            ->postJson("/api/proyectos/{$proyecto->id}/cierre-registros/solicitar-reapertura");

        $response->assertOk()->assertJsonPath('status', 'success');

        $this->assertEquals(1, CodigoReapertura::where('proyecto_id', $proyecto->id)->count());

        Mail::assertSent(CodigoReaperturaMail::class);
    }

    public function test_solicitante_se_propaga_correctamente_al_mailable(): void
    {
        Mail::fake();

        $rol = $this->crearRol($this->permisosCierre());
        $user = $this->crearUsuario($rol, 'Carlos', 'Gutierrez');
        $proyecto = $this->crearProyectoCerrado($user);

        $this->actingAs($user)
            ->postJson("/api/proyectos/{$proyecto->id}/cierre-registros/solicitar-reapertura")
            ->assertOk();

        Mail::assertSent(CodigoReaperturaMail::class, function (CodigoReaperturaMail $mail) {
            // El solicitante debe ser "Carlos Gutierrez" (nombre + apellido_paterno)
            $this->assertStringContainsString('Carlos', $mail->solicitante);
            $this->assertStringContainsString('Gutierrez', $mail->solicitante);
            $this->assertIsString($mail->solicitante);
            $this->assertNotEmpty($mail->solicitante);
            return true;
        });
    }

    public function test_otp_correcto_reabre_registros(): void
    {
        Mail::fake();

        $rol = $this->crearRol($this->permisosCierre());
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoCerrado($user);

        $codigoPlano = 'ABCD1234';
        CodigoReapertura::create([
            'proyecto_id' => $proyecto->id,
            'usuario_id' => $user->id,
            'codigo' => $codigoPlano,
            'tipo' => 'reapertura_beneficiarios',
            'usado' => false,
            'expira_en' => now()->addMinutes(15),
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/proyectos/{$proyecto->id}/cierre-registros/verificar-reapertura", [
                'codigo' => $codigoPlano,
            ]);

        $response->assertOk()->assertJsonPath('status', 'success');

        $proyecto->refresh();
        $this->assertFalse($proyecto->registros_beneficiarios_cerrados);
        $this->assertNull($proyecto->fecha_cierre_registros);
    }

    public function test_otp_expirado_no_reabre(): void
    {
        $rol = $this->crearRol($this->permisosCierre());
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoCerrado($user);

        $codigoPlano = 'EXPIR123';
        CodigoReapertura::create([
            'proyecto_id' => $proyecto->id,
            'usuario_id' => $user->id,
            'codigo' => $codigoPlano,
            'tipo' => 'reapertura_beneficiarios',
            'usado' => false,
            'expira_en' => now()->subMinutes(1), // ya expiró
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/proyectos/{$proyecto->id}/cierre-registros/verificar-reapertura", [
                'codigo' => $codigoPlano,
            ]);

        $response->assertStatus(422);

        $proyecto->refresh();
        $this->assertTrue($proyecto->registros_beneficiarios_cerrados);
    }

    public function test_otp_incorrecto_no_reabre(): void
    {
        $rol = $this->crearRol($this->permisosCierre());
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoCerrado($user);

        CodigoReapertura::create([
            'proyecto_id' => $proyecto->id,
            'usuario_id' => $user->id,
            'codigo' => 'CORRECTO',
            'tipo' => 'reapertura_beneficiarios',
            'usado' => false,
            'expira_en' => now()->addMinutes(15),
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/proyectos/{$proyecto->id}/cierre-registros/verificar-reapertura", [
                'codigo' => 'INCORREC',
            ]);

        $response->assertStatus(422);

        $proyecto->refresh();
        $this->assertTrue($proyecto->registros_beneficiarios_cerrados);
    }

    public function test_otp_ya_usado_no_reabre(): void
    {
        $rol = $this->crearRol($this->permisosCierre());
        $user = $this->crearUsuario($rol);
        $proyecto = $this->crearProyectoCerrado($user);

        $codigoPlano = 'USADOS12';
        CodigoReapertura::create([
            'proyecto_id' => $proyecto->id,
            'usuario_id' => $user->id,
            'codigo' => $codigoPlano,
            'tipo' => 'reapertura_beneficiarios',
            'usado' => true, // ya fue usado
            'usado_en' => now()->subMinutes(5),
            'expira_en' => now()->addMinutes(10),
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/proyectos/{$proyecto->id}/cierre-registros/verificar-reapertura", [
                'codigo' => $codigoPlano,
            ]);

        $response->assertStatus(422);

        $proyecto->refresh();
        $this->assertTrue($proyecto->registros_beneficiarios_cerrados);
    }
}
