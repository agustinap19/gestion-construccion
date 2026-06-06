<?php

namespace Tests\Feature\Auth;

use App\Models\CodigoOtp;
use App\Models\DispositivoConfiable;
use App\Models\Rol;
use App\Models\TokenRecuperacion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function crearRol(): Rol
    {
        return Rol::create([
            'nombre'         => 'tecnico_campo',
            'nombre_visible' => 'Tecnico de Campo',
            'descripcion'    => 'Test',
            'es_sistema'     => true,
            'estado'         => 'activo',
        ]);
    }

    private function crearUsuario(array $attrs = []): User
    {
        $rol = $this->crearRol();
        return User::create(array_merge([
            'nombre'                => 'Test',
            'apellido_paterno'      => 'Usuario',
            'email'                 => 'test@cakanagf.com',
            'password'              => Hash::make('Password123!'),
            'rol_id'                => $rol->id,
            'estado'                => 'activo',
            'debe_cambiar_password' => false,
            'intentos_fallidos'     => 0,
        ], $attrs));
    }

    private function registrarDispositivo(User $user, string $fingerprint): void
    {
        DispositivoConfiable::create([
            'usuario_id'         => $user->id,
            'fingerprint'        => $fingerprint,
            'nombre_dispositivo' => 'Chrome en Windows 10/11',
            'ip_registro'        => '127.0.0.1',
            'ultimo_uso'         => now(),
            'activo'             => true,
        ]);
    }

    private function loginPayload(array $extra = []): array
    {
        return array_merge([
            'email'       => 'test@cakanagf.com',
            'password'    => 'Password123!',
            'fingerprint' => 'fp-device-new',
        ], $extra);
    }

    public function test_login_correcto_dispositivo_confiable(): void
    {
        Mail::fake();
        $user = $this->crearUsuario();
        $this->registrarDispositivo($user, 'fp-confiable');

        $response = $this->postJson('/api/login', $this->loginPayload(['fingerprint' => 'fp-confiable']));

        $response->assertOk()
            ->assertJsonPath('data.tipo_respuesta', 'login_exitoso')
            ->assertJsonStructure(['data' => ['token', 'usuario', 'permisos']]);
    }

    public function test_login_dispositivo_nuevo_requiere_otp(): void
    {
        Mail::fake();
        $this->crearUsuario();

        $response = $this->postJson('/api/login', $this->loginPayload(['fingerprint' => 'fp-nuevo-unico']));

        $response->assertOk()
            ->assertJsonPath('data.tipo_respuesta', 'requiere_2fa')
            ->assertJsonStructure(['data' => ['token_temporal', 'email_destino']]);

        $this->assertArrayNotHasKey('token', $response->json('data') ?? []);
    }

    public function test_verificar_otp_correcto_emite_token(): void
    {
        Mail::fake();
        $user = $this->crearUsuario();

        $loginResp = $this->postJson('/api/login', $this->loginPayload());
        $loginResp->assertOk();
        $tokenTemporal = $loginResp->json('data.token_temporal');

        $otp = CodigoOtp::where('usuario_id', $user->id)->latest()->first();
        $this->assertNotNull($otp);

        CodigoOtp::where('id', $otp->id)->update(['codigo' => Hash::make('123456')]);

        $response = $this->postJson('/api/2fa/verificar-otp', [
            'token_temporal'      => $tokenTemporal,
            'codigo'              => '123456',
            'confiar_dispositivo' => false,
            'fingerprint'         => 'fp-device-new',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.tipo_respuesta', 'login_exitoso')
            ->assertJsonStructure(['data' => ['token', 'usuario']]);
    }

    public function test_confiar_dispositivo_segundo_login_sin_otp(): void
    {
        Mail::fake();
        $user = $this->crearUsuario();

        $loginResp = $this->postJson('/api/login', $this->loginPayload(['fingerprint' => 'fp-confiar']));
        $loginResp->assertOk();
        $tokenTemporal = $loginResp->json('data.token_temporal');

        CodigoOtp::where('usuario_id', $user->id)->latest()
            ->update(['codigo' => Hash::make('654321')]);

        $this->postJson('/api/2fa/verificar-otp', [
            'token_temporal'      => $tokenTemporal,
            'codigo'              => '654321',
            'confiar_dispositivo' => true,
            'fingerprint'         => 'fp-confiar',
        ])->assertOk();

        $segundoLogin = $this->postJson('/api/login', $this->loginPayload(['fingerprint' => 'fp-confiar']));
        $segundoLogin->assertOk()
            ->assertJsonPath('data.tipo_respuesta', 'login_exitoso');
    }

    public function test_no_confiar_dispositivo_segundo_login_pide_otp(): void
    {
        Mail::fake();
        $user = $this->crearUsuario();

        $loginResp = $this->postJson('/api/login', $this->loginPayload(['fingerprint' => 'fp-no-confiar']));
        $tokenTemporal = $loginResp->json('data.token_temporal');

        CodigoOtp::where('usuario_id', $user->id)->latest()
            ->update(['codigo' => Hash::make('111111')]);

        $this->postJson('/api/2fa/verificar-otp', [
            'token_temporal'      => $tokenTemporal,
            'codigo'              => '111111',
            'confiar_dispositivo' => false,
            'fingerprint'         => 'fp-no-confiar',
        ])->assertOk();

        $segundoLogin = $this->postJson('/api/login', $this->loginPayload(['fingerprint' => 'fp-no-confiar']));
        $segundoLogin->assertOk()
            ->assertJsonPath('data.tipo_respuesta', 'requiere_2fa');
    }

    public function test_tres_intentos_fallidos_suspende_cuenta(): void
    {
        Mail::fake();
        $user = $this->crearUsuario();

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/login', $this->loginPayload(['password' => 'WrongPassword!']));
        }

        $user->refresh();
        $this->assertEquals('suspendido', $user->estado);
    }

    public function test_cuenta_suspendida_con_password_correcto_sigue_bloqueada_con_mensaje_soporte(): void
    {
        Mail::fake();
        $user = $this->crearUsuario(['estado' => 'suspendido']);

        $response = $this->postJson('/api/login', $this->loginPayload());

        $response->assertStatus(401)
            ->assertJsonFragment(['status' => 'error']);

        $message = strtolower($response->json('message'));
        $this->assertStringContainsString('bloqueada', $message);
        $this->assertStringContainsString('soporte', $message);
    }

    public function test_anti_enumeracion_mismo_mensaje(): void
    {
        Mail::fake();
        $this->crearUsuario();

        $respExistente = $this->postJson('/api/login', $this->loginPayload(['password' => 'WrongPassword!']));
        $respInexistente = $this->postJson('/api/login', [
            'email'       => 'noexiste@cakanagf.com',
            'password'    => 'WrongPassword!',
            'fingerprint' => 'fp-device-new',
        ]);

        $respExistente->assertStatus(401);
        $respInexistente->assertStatus(401);
        $this->assertEquals($respExistente->json('message'), $respInexistente->json('message'));
    }

    public function test_debe_cambiar_password_rutas_protegidas_devuelven_423(): void
    {
        Mail::fake();
        $user = $this->crearUsuario(['debe_cambiar_password' => true]);
        $this->registrarDispositivo($user, 'fp-primer-login');

        $loginResp = $this->postJson('/api/login', $this->loginPayload(['fingerprint' => 'fp-primer-login']));
        $loginResp->assertOk();
        $token = $loginResp->json('data.token');
        $this->assertNotNull($token);

        $response = $this->withToken($token)->getJson('/api/roles');
        $response->assertStatus(423)
            ->assertJsonFragment(['code' => 'PASSWORD_CHANGE_REQUIRED']);
    }

    public function test_cambio_password_libera_acceso_y_revoca_tokens_viejos(): void
    {
        Mail::fake();
        $user = $this->crearUsuario(['debe_cambiar_password' => true]);
        $this->registrarDispositivo($user, 'fp-cambio-pass');

        $loginResp = $this->postJson('/api/login', $this->loginPayload(['fingerprint' => 'fp-cambio-pass']));
        $tokenViejo = $loginResp->json('data.token');
        $this->assertNotNull($tokenViejo);

        $cambioResp = $this->withToken($tokenViejo)->postJson('/api/primer-login/cambiar-password', [
            'password_actual'             => 'Password123!',
            'nueva_password'              => 'NuevaPassword456!',
            'nueva_password_confirmation' => 'NuevaPassword456!',
        ]);
        $cambioResp->assertOk();
        $nuevoToken = $cambioResp->json('data.token');
        $this->assertNotNull($nuevoToken);

        // El token viejo NO debe ser igual al nuevo
        $this->assertNotEquals($tokenViejo, $nuevoToken);

        // Verificar en BD que el token viejo fue revocado
        $tokenHash = hash('sha256', explode('|', $tokenViejo)[1] ?? $tokenViejo);
        $tokenEnBd = \Laravel\Sanctum\PersonalAccessToken::where('token', $tokenHash)->first();
        $this->assertNull($tokenEnBd, 'El token viejo debe haber sido eliminado de la BD');

        // Nuevo token funciona en /api/me
        $this->withToken($nuevoToken)->getJson('/api/me')->assertOk();

        // Nuevo token tiene acceso a rutas normales
        $this->withToken($nuevoToken)->getJson('/api/roles')->assertOk();
    }

    public function test_recuperacion_respuesta_neutra(): void
    {
        Mail::fake();

        $resp = $this->postJson('/api/recuperacion/solicitar', ['email' => 'noexiste@cakanagf.com']);
        $resp->assertOk()->assertJsonFragment(['status' => 'success']);
    }

    public function test_recuperacion_token_valido_restablece_y_revoca_sesiones(): void
    {
        Mail::fake();
        $user = $this->crearUsuario();
        $this->registrarDispositivo($user, 'fp-recuperacion');

        $tokenStr = Str::random(60);
        TokenRecuperacion::create([
            'usuario_id' => $user->id,
            'token'      => $tokenStr,
            'expira_en'  => now()->addHour(),
            'usado'      => false,
        ]);

        $loginResp = $this->postJson('/api/login', $this->loginPayload(['fingerprint' => 'fp-recuperacion']));
        $tokenSesion = $loginResp->json('data.token');
        $this->assertNotNull($tokenSesion);

        $validarResp = $this->getJson("/api/recuperacion/validar-token/{$tokenStr}");
        $validarResp->assertOk();

        $restablecerResp = $this->postJson('/api/recuperacion/restablecer', [
            'token'                       => $tokenStr,
            'nueva_password'              => 'NuevaPass789!',
            'nueva_password_confirmation' => 'NuevaPass789!',
        ]);
        $restablecerResp->assertOk();

        $this->withToken($tokenSesion)->getJson('/api/me')->assertStatus(401);
    }

    public function test_recuperacion_token_expirado_falla(): void
    {
        Mail::fake();
        $user = $this->crearUsuario();
        $tokenStr = Str::random(60);

        TokenRecuperacion::create([
            'usuario_id' => $user->id,
            'token'      => $tokenStr,
            'expira_en'  => now()->subMinute(),
            'usado'      => false,
        ]);

        $validarResp = $this->getJson("/api/recuperacion/validar-token/{$tokenStr}");
        $validarResp->assertStatus(400);
    }

    public function test_rate_limiting_ip(): void
    {
        Mail::fake();

        // Registrar 10 intentos fallidos en intentos_acceso para la misma IP
        // para triggear el rate limit de AuditoriaAccesoService (>= 10 intentos)
        for ($i = 0; $i < 10; $i++) {
            \App\Models\IntentoAcceso::create([
                'email'      => "fake{$i}@cakanagf.com",
                'ip_address' => '127.0.0.1',
                'user_agent' => 'phpunit',
                'exitoso'    => false,
                'motivo'     => 'password_incorrecto',
                'created_at' => now(),
            ]);
        }

        // El siguiente intento debe ser bloqueado por nuestro rate limit de negocio
        $response = $this->postJson('/api/login', [
            'email'       => 'alguien@cakanagf.com',
            'password'    => 'WrongPassword!',
            'fingerprint' => 'fp-rate-limit',
        ]);

        // Puede ser 401 (rate limit de negocio) o 429 (throttle de Laravel)
        $this->assertContains($response->status(), [401, 422, 429]);

        if ($response->status() === 401) {
            $message = strtolower($response->json('message') ?? '');
            $this->assertStringContainsString('intentos', $message);
        }
    }
}
