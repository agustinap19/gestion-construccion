# AUTH_REFACTOR — Módulo de Autenticación

## Resumen de cambios

Refactor completo del módulo de autenticación. Eliminación total del reconocimiento facial. Nueva arquitectura de seguridad con OTP por correo, bloqueo a 3 intentos y modal de cambio obligatorio de contraseña.

---

## Archivos modificados / creados

### Backend

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `database/migrations/0001_01_01_000026_add_fields_to_codigos_otp_table.php` | NUEVO | Agrega `token_temporal`, `fingerprint_dispositivo`, `intentos_fallidos` a `codigos_otp` |
| `app/Models/IntentoAcceso.php` | MODIFICADO | Corregido: usa `created_at` (no `fecha_intento`), `motivo` (no `motivo_fallo`) |
| `app/Models/CodigoOtp.php` | MODIFICADO | Agrega nuevos campos al fillable |
| `app/Models/DispositivoConfiable.php` | MODIFICADO | Elimina columnas inexistentes (`user_agent`, `fecha_registro`) |
| `app/Models/TokenRecuperacion.php` | MODIFICADO | Limpia columnas inexistentes (`email`, `ip_solicitud`, `rostro_verificado`, etc.) |
| `app/Services/AuditoriaAccesoService.php` | MODIFICADO | **Bug fix crítico**: usa `created_at` no `fecha_intento` en queries |
| `app/Services/AuthService.php` | REESCRITO | Sin facial. 3-strike lockout → `estado='suspendido'`. Anti-enumeración. OTP flow |
| `app/Services/OtpService.php` | REESCRITO | Hash::make para almacenar código. Usa `token_temporal`. 5 intentos máx |
| `app/Services/DispositivoService.php` | REESCRITO | Confianza 30 días vía `ultimo_uso`. Corregido para schema real |
| `app/Services/PrimerLoginService.php` | REESCRITO | Sin facial. Solo cambio de contraseña obligatorio |
| `app/Services/RecuperacionPasswordService.php` | REESCRITO | Sin facial. Recuperación solo por enlace de email |
| `app/Services/RostroService.php` | ELIMINADO | Clase vacía (stub para no romper autoloading) |
| `app/Http/Middleware/ForzarCambioPassword.php` | NUEVO | Devuelve 423 `PASSWORD_CHANGE_REQUIRED` si `debe_cambiar_password=true` |
| `app/Http/Controllers/Api/AuthController.php` | MODIFICADO | Elimina `verificarRostro2FA`. Llama `intentarLogin` |
| `app/Http/Controllers/Api/PrimerLoginController.php` | MODIFICADO | Elimina `registrarRostro`. Emite nuevo token tras cambio |
| `app/Http/Controllers/Api/RecuperacionPasswordController.php` | MODIFICADO | Elimina `verificarRostro`. Nuevo endpoint `restablecer` |
| `app/Http/Requests/Auth/VerificarOtpRequest.php` | MODIFICADO | Agrega `confiar_dispositivo` y `fingerprint` |
| `routes/api.php` | MODIFICADO | Elimina rutas faciales. Estructura con `ForzarCambioPassword` middleware |
| `bootstrap/app.php` | MODIFICADO | Registra alias de middleware |

### Frontend

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `resources/js/components/ui/FloatingInput.jsx` | CORREGIDO | Bug fix: label con `pointer-events-none` para no capturar clicks |
| `resources/js/services/authService.js` | REESCRITO | Centralizado. Interceptor 423. Sin facial. Nuevos métodos de recuperación |
| `resources/js/context/AuthContext.jsx` | REESCRITO | Sin facial. Maneja `mostrarModalCambioPassword`. Callback para interceptor 423 |
| `resources/js/pages/auth/Login.jsx` | REESCRITO | Modal OTP inline (6 dígitos, timer, trust device). Modal recuperación inline. CSS animations |
| `resources/js/pages/auth/PrimerLogin.jsx` | SIMPLIFICADO | Redirige a dashboard (modal se maneja en App.jsx) |
| `resources/js/pages/auth/RestablecerPassword.jsx` | NUEVO | Página para `/recuperar-password?token=&email=`. Valida token, formulario, éxito |
| `resources/js/components/auth/CambioPasswordObligatorioModal.jsx` | NUEVO | Modal no-dismissible. Se renderiza en App.jsx cuando `debe_cambiar_password=true` |
| `resources/js/components/App.jsx` | MODIFICADO | Elimina rutas faciales y páginas obsoletas. Agrega `CambioPasswordObligatorioModal` y `RestablecerPassword` |

### Archivos eliminados (ya no referenciados)
- `resources/js/pages/auth/VerificarOtp.jsx` — flujo OTP ahora es inline en Login
- `resources/js/pages/auth/VerificarRostro.jsx` — facial eliminado
- `resources/js/pages/auth/RecuperacionFacial.jsx` — facial eliminado
- `resources/js/pages/auth/SolicitarRecuperacion.jsx` — reemplazado por modal inline en Login
- `resources/js/pages/auth/CambiarPasswordRecuperacion.jsx` — reemplazado por RestablecerPassword.jsx

---

## Endpoints API

### Públicos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/login` | Login con email + password + fingerprint |
| POST | `/api/2fa/verificar-otp` | Verificar código OTP. Body: `token_temporal, codigo, confiar_dispositivo, fingerprint` |
| POST | `/api/recuperacion/solicitar` | Solicitar enlace de recuperación (anti-enum, rate limit 6/min) |
| GET | `/api/recuperacion/validar-token/{token}` | Validar token de recuperación |
| POST | `/api/recuperacion/restablecer` | Restablecer contraseña con token |

### Protegidos (auth:sanctum)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/logout` | Cerrar sesión |
| GET | `/api/me` | Datos del usuario autenticado |
| GET | `/api/primer-login/estado` | Estado del primer login |
| POST | `/api/primer-login/cambiar-password` | Cambio obligatorio de contraseña (sin ForzarCambioPassword) |

---

## Flujos de autenticación

### Flujo 1: Login normal (dispositivo confiable)
1. POST `/api/login` → `tipo_respuesta: login_exitoso` → token en localStorage → dashboard

### Flujo 2: Login nuevo dispositivo (OTP)
1. POST `/api/login` → `tipo_respuesta: requiere_2fa` + `token_temporal` + `email_destino`
2. Modal OTP aparece inline (6 cajas, timer 10min)
3. POST `/api/2fa/verificar-otp` con código + `confiar_dispositivo` (checkbox)
4. Si OK → `tipo_respuesta: login_exitoso` → token → dashboard

### Flujo 3: Primer login (debe_cambiar_password)
1. POST `/api/login` → `tipo_respuesta: login_exitoso` con `usuario.debe_cambiar_password=true`
2. AuthContext detecta el flag → `mostrarModalCambioPassword=true`
3. `CambioPasswordObligatorioModal` aparece sobre toda la interfaz (no dismissible)
4. POST `/api/primer-login/cambiar-password` → nuevo token emitido
5. Modal se cierra, `debe_cambiar_password=false` en context

### Flujo 4: Recuperación de contraseña
1. Clic "¿Olvidaste tu contraseña?" → `ModalRecuperarPassword` inline en Login
2. POST `/api/recuperacion/solicitar` → email con enlace si existe
3. Enlace: `/recuperar-password?token=xxx&email=yyy` → `RestablecerPassword.jsx`
4. GET validar token → mostrar formulario
5. POST `/api/recuperacion/restablecer` → contraseña actualizada

---

## Mejoras de seguridad implementadas

| Mejora | Descripción |
|--------|-------------|
| **3-strike lockout** | 3 intentos fallidos → `estado='suspendido'` (desbloqueo solo por admin) |
| **Anti-enumeración** | Misma respuesta genérica para email inexistente, cuenta inactiva o password incorrecto |
| **OTP hasheado** | `Hash::make()` para almacenar, `Hash::check()` para verificar (nunca plaintext) |
| **Token temporal único** | UUID para correlacionar OTP con sesión pendiente |
| **Confianza 30 días** | Dispositivos confiables expiran si no se usan en 30 días (`ultimo_uso`) |
| **423 PASSWORD_CHANGE_REQUIRED** | Middleware bloquea todas las rutas protegidas si `debe_cambiar_password=true` |
| **Revocación al cambiar password** | `tokens()->delete()` invalida todas las sesiones al cambiar contraseña |
| **Revocar dispositivos en recovery** | Todos los dispositivos confiables se revocan al restablecer contraseña |
| **Rate limit recuperación** | Máx 3 solicitudes por hora por usuario |
| **Bug fix `fecha_intento`** | `AuditoriaAccesoService` ahora usa `created_at` (columna real en `intentos_acceso`) |

---

## Comandos a ejecutar

```bash
# 1. Ejecutar la migración nueva
php artisan migrate

# 2. Limpiar caché de rutas
php artisan route:clear
php artisan config:clear

# 3. Si usas OPcache en producción
php artisan optimize:clear
```

---

## Checklist de pruebas

- [ ] Login con credenciales correctas → dashboard
- [ ] Login con password incorrecto → mensaje genérico "Credenciales incorrectas"
- [ ] 3 intentos fallidos → cuenta suspendida, mismo mensaje
- [ ] Login con cuenta suspendida → mensaje genérico (no revela el estado)
- [ ] Login nuevo dispositivo → modal OTP aparece inline
- [ ] OTP incorrecto → contador de intentos (5 máx)
- [ ] OTP expirado (>10 min) → mensaje de expiración
- [ ] OTP con "confiar dispositivo" → siguiente login sin OTP
- [ ] OTP confianza expira → OTP requerido nuevamente tras 30 días
- [ ] Login con `debe_cambiar_password=true` → modal no-dismissible aparece
- [ ] Modal no puede cerrarse con click fuera ni tecla Escape
- [ ] Cambio de contraseña exitoso → modal cierra, nuevo token, acceso normal
- [ ] "¿Olvidaste tu contraseña?" → modal inline en Login
- [ ] Solicitud de recuperación → mismo mensaje si email existe o no
- [ ] Enlace de recuperación → RestablecerPassword.jsx valida token
- [ ] Token expirado o ya usado → mensaje de error claro
- [ ] Contraseña restablecida → sesiones anteriores revocadas
- [ ] FloatingInput → click en label no captura, input recibe foco correctamente
- [ ] OTP paste (pegar 6 dígitos) → auto-completa cajas
- [ ] OTP backspace → retrocede a caja anterior
- [ ] Timer OTP → cuenta regresiva visible, botón deshabilitado al llegar a 0
