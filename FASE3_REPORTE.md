# FASE 3 — Módulo de Personal: Reporte de Implementación

**Proyecto:** ERP CA & KANAGF S.R.L.  
**Fecha:** 2026-05-18  
**Estado:** COMPLETO ✅

---

## Resumen Ejecutivo

El módulo de Personal ya contaba con una implementación sustancialmente completa en backend y frontend.
La Fase 3 se centró en: verificar la integridad del sistema, documentar decisiones arquitectónicas,
y escribir la cobertura de pruebas que faltaba.

---

## Estado del Módulo

| Capa          | Archivo(s)                                       | Estado |
|---------------|--------------------------------------------------|--------|
| Migración     | `0001_01_01_000300_create_personal_table.php`    | ✅ Completo |
| Migración     | `0001_01_01_000301_create_personal_competencia_table.php` | ✅ Completo |
| Modelo        | `app/Models/Personal.php`                        | ✅ Completo |
| Servicio      | `app/Services/Personal/PersonalService.php`      | ✅ Completo |
| Servicio      | `app/Services/Personal/PersonalCompetenciaService.php` | ✅ Completo |
| Controlador   | `app/Http/Controllers/Api/PersonalController.php`| ✅ Completo |
| Form Requests | `app/Http/Requests/Personal/`                    | ✅ Completo |
| Rutas API     | `routes/api.php` — prefix `personal`            | ✅ Completo |
| Frontend service | `resources/js/services/personalService.js`    | ✅ Completo |
| Frontend router  | `resources/js/components/App.jsx`             | ✅ Completo |
| Lista Personal   | `resources/js/pages/admin/personal/ListaPersonal.jsx` | ✅ Completo |
| Crear Personal   | `resources/js/pages/admin/personal/CrearPersonal.jsx` | ✅ Completo |
| Detalle Personal | `resources/js/pages/admin/personal/DetallePersonal.jsx` | ✅ Completo |
| Editar Personal  | `resources/js/pages/admin/personal/EditarPersonal.jsx` | ✅ Completo |
| **Tests**     | `tests/Feature/Personal/PersonalTest.php`        | ✅ **CREADO** |

---

## Relación Personal ↔ Usuario

**Diseño:** `personal.usuario_id` (FK nullable, unique) → `users.id`

- Cardinalidad: 1 Personal : 0..1 Usuario del sistema
- Un Personal puede existir sin acceso al sistema (obreros, trabajadoras sociales sin cuenta)
- Un Personal puede vincularse a un Usuario existente o crear uno nuevo
- La FK tiene `nullOnDelete` — si se elimina el user, personal.usuario_id queda en null

### Sobre la redundancia de datos en `users`

La tabla `users` replica campos de `personal` (nombre, ci, telefono, etc.).
**Decisión: mantener como está** por las siguientes razones:

1. Un `User` puede existir sin `Personal` (admins del sistema externos a la empresa)
2. `UsuarioService::crear()` acepta estos datos directamente para ese caso de uso
3. Cuando se crea un usuario **desde** personal, `PersonalService::crearUsuarioParaPersonal()`
   toma los datos del registro de personal y los pasa a `UsuarioService`, garantizando consistencia
4. Eliminar los campos de `users` requeriría un JOIN en cada autenticación — impacto de rendimiento

**Invariante documentada:** Los datos de nombre/CI en `users` son copiados de `personal` al momento
de la creación. Modificaciones posteriores a `personal` NO sincronizan automáticamente a `users`.
Si se requiere sincronización, debe hacerse explícitamente desde `PersonalService::actualizar()`.

---

## Endpoints API disponibles

```
GET    /api/personal                          Lista con filtros y paginación
GET    /api/personal/estadisticas             Stats generales del módulo
GET    /api/personal/siguiente-codigo         Próximo código EMP###
GET    /api/personal/{id}                     Detalle completo
POST   /api/personal                          Crear (con usuario opcional en mismo request)
PUT    /api/personal/{id}                     Actualizar datos laborales
PATCH  /api/personal/{id}/estado-laboral      Cambiar estado (activo/vacaciones/licencia/desvinculado)
POST   /api/personal/{id}/vincular-usuario    Vincular usuario existente
POST   /api/personal/{id}/desvincular-usuario Desvincular usuario (sin eliminarlo)
POST   /api/personal/{id}/crear-usuario       Crear y vincular nuevo usuario del sistema
DELETE /api/personal/{id}                     Soft delete
POST   /api/personal/{id}/restaurar           Restaurar soft-deleted
GET    /api/personal/{id}/competencias        Competencias del personal
POST   /api/personal/{id}/competencias        Asignar competencia
PUT    /api/personal/{id}/competencias/{cid}  Actualizar competencia
DELETE /api/personal/{id}/competencias/{cid}  Desasignar competencia
```

---

## Reglas de Negocio Clave

| Regla | Implementación |
|-------|---------------|
| CI único en `personal` | Validación DB + FormRequest |
| Un usuario solo puede vincularse a un personal | Constraint UNIQUE en `personal.usuario_id` |
| Desvinculación laboral suspende la cuenta de sistema | `PersonalService::cambiarEstadoLaboral()` llama `UsuarioService::cambiarEstado('suspendido')` |
| Desvinculación cierra todas las sesiones activas | `UsuarioService::cambiarEstado()` elimina tokens Sanctum |
| Personal + Usuario se crean en una sola transacción | `DB::transaction()` en `PersonalService::crear()` |
| Solo gerente puede asignar roles con permisos críticos | `UsuarioService::validarRolCritico()` |
| Soft delete: no se pierde el historial | `SoftDeletes` en modelo, restauración disponible |

---

## Tests — Cobertura

Archivo: `tests/Feature/Personal/PersonalTest.php`  
**19 tests, 62 assertions — todos en verde ✅**

| # | Test | Qué verifica |
|---|------|-------------|
| 1 | `crear_personal_minimo` | Happy path: POST /api/personal retorna 201 |
| 2 | `ci_duplicado_falla_validacion` | CI repetido → 422 con error en campo `ci` |
| 3 | `personal_sin_usuario_no_tiene_acceso` | `tieneUsuario()` y `puedeAcceder()` falsos |
| 4 | `personal_con_usuario_activo_puede_acceder` | `puedeAcceder()` verdadero con usuario activo |
| 5 | `no_se_puede_vincular_mismo_usuario_a_dos_personal` | Constraint único usuario_id |
| 6 | `desvinculacion_suspende_usuario_y_cierra_sesiones` | Workflow completo de baja laboral |
| 7 | `desvinculacion_sin_usuario_solo_cambia_estado` | Baja sin usuario vinculado no falla |
| 8 | `crear_usuario_desde_ficha_personal` | `POST /api/personal/{id}/crear-usuario` |
| 9 | `no_se_puede_crear_usuario_si_ya_tiene_uno` | Idempotencia — no duplicar usuarios |
| 10 | `transaccion_rollback_si_email_duplicado` | Atomicidad: personal no creado si email ya existe |
| 11 | `crear_personal_con_usuario_vinculado_en_mismo_request` | `crear_usuario_vinculado=true` en POST |
| 12 | `solo_gerente_puede_crear_usuario_con_rol_critico` | Anti-escalada: actor sin gerente → 422 |
| 13 | `gerente_puede_crear_usuario_con_rol_critico` | Gerente SÍ puede asignar rol con permisos críticos |
| 14 | `no_autenticado_obtiene_401` | Autenticación obligatoria (Sanctum) |
| 15 | `listar_personal_con_filtro_tipo` | Filtro `tipo=obrero` devuelve solo obreros |
| 16 | `eliminar_y_restaurar_personal` | Soft delete + restore |
| 17 | `desvincular_usuario_no_elimina_al_usuario` | Desvinculación es no destructiva |
| 18 | `faltan_campos_obligatorios_retorna_422` | Validación request completa |
| 19 | `estado_laboral_invalido_retorna_422` | Enum validation |

---

## Comandos para ejecutar

```bash
# Tests
php artisan test --filter=Personal

# Todos los tests
php artisan test

# Base de datos
php artisan migrate:fresh --seed

# Build frontend
npm run build
```

---

## Archivos Clave

**Backend**
- `app/Models/Personal.php` — Modelo con scopes, relaciones, soft deletes
- `app/Services/Personal/PersonalService.php` — Lógica de negocio completa
- `app/Http/Controllers/Api/PersonalController.php` — 13 endpoints
- `app/Http/Requests/Personal/CrearPersonalRequest.php` — Validación con soporte usuario vinculado
- `tests/Feature/Personal/PersonalTest.php` — Suite de 19 tests (**NUEVO**)

**Frontend**
- `resources/js/pages/admin/personal/ListaPersonal.jsx` — Tabla + grid, filtros, paginación
- `resources/js/pages/admin/personal/CrearPersonal.jsx` — Stepper 4 pasos con usuario opcional
- `resources/js/pages/admin/personal/DetallePersonal.jsx` — Tabs: Información, Laboral, Sistema, Competencias, Auditoría
- `resources/js/pages/admin/personal/EditarPersonal.jsx` — Edición de datos laborales y personales
- `resources/js/services/personalService.js` — Todos los endpoints mapeados
