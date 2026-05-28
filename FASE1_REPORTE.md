# FASE 1 - REPORTE FINAL

## Resultado Tests
**14/14 tests PASSING** - `php artisan test --filter=Auth`

## Archivos Creados
- `resources/css/tokens.css` — Sistema de diseño OKLCH (variables CSS)
- `tests/Feature/Auth/AuthTest.php` — 14 test cases de autenticacion
- `database/seeders/UserSeeder.php` — Reescrito (8 usuarios, incluye super_admin)

## Archivos Modificados
- `database/seeders/RolSeeder.php` — 7 roles (agrega super_admin)
- `database/seeders/EntidadEstatalSeeder.php` — Fix enum `nivel` y `estado`
- `database/seeders/PersonalCompetenciaSeeder.php` — Fix `vigencia_meses`
- `resources/css/app.css` — Importa tokens.css al inicio
- `package.json` — Remueve face-api.js, agrega framer-motion
- `phpunit.xml` — Cambia a MySQL (sin driver SQLite disponible)
- `app/Services/AuthService.php` — Mensajes especificos para cuenta suspendida/inactiva
- `app/Http/Controllers/Api/AuthController.php` — Agrega `reenviarOtp` endpoint
- `routes/api.php` — Agrega `POST /2fa/reenviar-otp`
- `resources/js/services/recuperacionService.js` — Elimina referencias a facial
- `resources/js/services/faceApiService.js` — ELIMINADO

## Archivos Eliminados
- `resources/js/pages/auth/VerificarRostro.jsx`
- `resources/js/pages/auth/RecuperacionFacial.jsx`
- `resources/js/services/faceApiService.js`
- `app/Http/Requests/Auth/VerificarRostro2FARequest.php`

## Endpoints de Auth

### Publicos
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | /api/login | Login con email+password+fingerprint |
| POST | /api/2fa/verificar-otp | Verificar codigo OTP |
| POST | /api/2fa/reenviar-otp | Reenviar codigo OTP |
| POST | /api/recuperacion/solicitar | Solicitar recuperacion de password |
| GET | /api/recuperacion/validar-token/{token} | Validar token de recuperacion |
| POST | /api/recuperacion/restablecer | Restablecer password |

### Protegidos (auth:sanctum)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | /api/logout | Cerrar sesion |
| GET | /api/me | Datos del usuario actual |
| GET | /api/primer-login/estado | Estado de cambio de password |
| POST | /api/primer-login/cambiar-password | Cambiar password obligatorio |

## Sistema de Diseno: tokens.css
Variables OKLCH en `:root` y `.dark`:
- Superficies: --surface-0 a --surface-3
- Texto: --fg, --fg-muted, --fg-subtle
- Acentos: --accent (verde), --tech (morado)
- Estados: --danger, --warning, --success, --info
- Glass morphism: --glass-bg, --glass-border, --glass-blur
- Radios: --radius-sm/md/lg/xl
- Sombras: --shadow-sm/md/lg
- Animaciones: --dur-fast/normal/slow, --ease-out, --ease-in-out

## Comportamiento de Auth
- Login con dispositivo confiable -> token inmediato
- Login con dispositivo nuevo -> OTP por email (10 min)
- 3 intentos fallidos -> cuenta suspendida, mensaje con soporte tecnico
- debe_cambiar_password=true -> token emitido pero ForzarCambioPassword (423) en rutas protegidas
- Anti-enumeracion: mismo mensaje para email inexistente o password incorrecto
- Rate limit: >= 10 intentos fallidos por IP en 15 min = bloqueado

## Comandos para ejecutar el proyecto

```bash
# Backend
php artisan serve

# Frontend (desarrollo)
npm run dev

# Build produccion
npm run build

# Migraciones + seeds
php artisan migrate:fresh --seed

# Tests
php artisan test --filter=Auth
```

## Checklist Manual
- [x] Login con credenciales correctas (dispositivo confiable)
- [x] Login con dispositivo nuevo muestra modal OTP
- [x] OTP incorrecto muestra intentos restantes
- [x] 3 intentos fallidos suspende cuenta
- [x] Mensaje de cuenta bloqueada menciona soporte tecnico
- [x] Usuario con debe_cambiar_password ve modal obligatorio
- [x] Modal no es dismissible (sin X, sin escape)
- [x] Cambio de password exitoso da acceso normal
- [x] Recuperacion de password envía email
- [x] Link de recuperacion expira en 60 min
- [x] Restablecimiento invalida todas las sesiones
- [x] Dark mode toggle funciona
- [x] Build de produccion sin errores
