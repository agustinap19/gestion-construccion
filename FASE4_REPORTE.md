# FASE 4 — Usuarios y Competencias: Reporte de Implementación

**Proyecto:** ERP CA & KANAGF S.R.L.
**Fecha:** 2026-05-19
**Estado:** COMPLETO ✅

---

## Resumen Ejecutivo

La Fase 4 cierra el módulo Personal-Usuarios conectando las piezas que faltaban:
el catálogo de Competencias con CRUD completo, la integración real del modal de
asignación con semáforo de vencimiento, el módulo de Usuarios con estado
"Pendiente" para primer login, y las suites de tests para ambos módulos.

---

## Estado del Módulo

| Capa | Archivo(s) | Estado |
|------|-----------|--------|
| Controlador | `app/Http/Controllers/Api/CompetenciaController.php` | ✅ **NUEVO** |
| FormRequest | `app/Http/Requests/Competencia/CrearCompetenciaRequest.php` | ✅ **NUEVO** |
| FormRequest | `app/Http/Requests/Competencia/ActualizarCompetenciaRequest.php` | ✅ **NUEVO** |
| Rutas API | `routes/api.php` — prefix `competencias` | ✅ **NUEVO** |
| Frontend service | `resources/js/services/competenciaService.js` | ✅ **NUEVO** |
| Catálogo UI | `resources/js/pages/admin/competencias/CompetenciasPage.jsx` | ✅ **NUEVO** |
| Ruta frontend | `resources/js/components/App.jsx` | ✅ **ACTUALIZADO** |
| Modal asignación | `resources/js/components/personal/AsignarCompetenciaModal.jsx` | ✅ **REESCRITO** |
| Semáforo | `resources/js/pages/admin/personal/DetallePersonal.jsx` | ✅ **ACTUALIZADO** |
| Estado Pendiente | `resources/js/pages/admin/usuarios/ListaUsuarios.jsx` | ✅ **ACTUALIZADO** |
| Tests Usuarios | `tests/Feature/Usuarios/UsuariosTest.php` | ✅ **NUEVO** |
| Tests Competencias | `tests/Feature/Competencias/CompetenciasTest.php` | ✅ **NUEVO** |

---

## PARTE 1 — Módulo Usuarios

### Estado "Pendiente"

El campo `debe_cambiar_password = true` (asignado automáticamente en la creación)
mapea al estado visual **Pendiente** en la lista de usuarios.

- `estadoBadge(usuario)` ahora evalúa `debe_cambiar_password && !ultimo_acceso`
- Filtro de estado incluye opción **"Pendientes (primer login)"** que se traduce
  internamente a `con_password_temporal=true` antes de enviar a la API
- Una vez el usuario cambia su password, el badge pasa a mostrar su estado real
  (`activo`, `inactivo`, `suspendido`)

### Endpoints ya disponibles (Fase 2-3, verificados)

```
GET    /api/usuarios                    Lista paginada con filtros
GET    /api/usuarios/{id}               Detalle + sesiones + dispositivos + actividad
POST   /api/usuarios                    Crear con credenciales temporales (email + rol)
PUT    /api/usuarios/{id}               Actualizar datos personales
PATCH  /api/usuarios/{id}/estado        Suspender/activar/desactivar (suspendido requiere razón)
PATCH  /api/usuarios/{id}/rol           Cambiar rol (anti-escalación integrada)
POST   /api/usuarios/{id}/reenviar-password  Generar nueva contraseña temporal
DELETE /api/usuarios/{id}/sesiones      Cerrar todas las sesiones
POST   /api/usuarios/accion-masiva      Acciones en bloque
DELETE /api/usuarios/{id}               Soft delete
POST   /api/usuarios/{id}/restaurar     Restaurar eliminado
```

### Reglas anti-escalación (heredadas Fase 2)

| Regla | Implementación |
|-------|---------------|
| Solo gerente asigna roles con permisos críticos | `UsuarioService::validarRolCritico()` |
| Suspensión siempre requiere razón | `CambiarEstadoRequest.required_if` |
| Credenciales enviadas por email al crear | `UsuarioCreadoMail` en `UsuarioService::crear()` |
| `debe_cambiar_password = true` al crear | Hardcoded en `UsuarioService::crear()` |

---

## PARTE 2 — Módulo Competencias

### Catálogo (CRUD)

Endpoint base: `/api/competencias`

```
GET    /api/competencias               Lista paginada (busqueda, tipo, requiere_renovacion)
POST   /api/competencias               Crear competencia
PUT    /api/competencias/{id}          Actualizar
DELETE /api/competencias/{id}          Eliminar (falla si tiene asignaciones activas)
```

**Campos del catálogo:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `nombre` | string unique | Nombre de la competencia |
| `descripcion` | text nullable | Descripción opcional |
| `tipo` | enum | `tecnico`, `seguridad`, `laboral`, `certificacion`, `otro` |
| `requiere_renovacion` | boolean | Habilita control de vencimiento |
| `vigencia_meses` | integer nullable | Obligatorio si `requiere_renovacion = true` |

### Asignación a Personal

Pivot `personal_competencia` con campos:

| Campo | Descripción |
|-------|-------------|
| `fecha_emision` | Fecha de obtención (obligatoria) |
| `fecha_vencimiento` | Obligatoria si la competencia requiere renovación |
| `entidad_emisora` | Universidad, instituto, organismo emisor |
| `numero_certificado` | Número de matrícula o registro |
| `archivo_url` | Enlace al documento (Drive, etc.) |
| `estado` | `vigente`, `vencida` (calculado automáticamente al asignar/actualizar) |

### Semáforo de Vencimiento (on-the-fly)

El estado se calcula en el frontend en el momento de renderizar, independiente del
campo `estado` almacenado en la pivot (que puede estar desactualizado):

| Color | Condición |
|-------|-----------|
| 🟢 Verde — **Vigente** | Sin fecha de vencimiento, o vence en más de 30 días |
| 🟡 Amarillo — **Vence en Xd** | Vence en ≤ 30 días |
| 🔴 Rojo — **Vencida** | `fecha_vencimiento < hoy` |

El mismo semáforo está integrado en `AsignarCompetenciaModal` para dar retroalimentación
inmediata mientras el usuario selecciona la fecha de vencimiento.

---

## Tests — Cobertura

### Suite completa: **73 tests, 210 assertions — todos en verde ✅**

#### `tests/Feature/Usuarios/UsuariosTest.php` — 14 tests

| # | Test | Qué verifica |
|---|------|-------------|
| 1 | `crear_usuario_minimo` | POST /api/usuarios retorna 201 |
| 2 | `crear_usuario_establece_debe_cambiar_password` | `debe_cambiar_password = true` al crear |
| 3 | `email_duplicado_falla_validacion` | Email repetido → 422 con errors |
| 4 | `ci_duplicado_falla_validacion` | CI repetido → 422 |
| 5 | `no_autenticado_obtiene_401` | Sanctum protege endpoints |
| 6 | `listar_usuarios_retorna_paginado` | Estructura paginada |
| 7 | `filtro_pendiente_devuelve_solo_con_password_temporal` | Filtro `con_password_temporal` |
| 8 | `cambiar_estado_activo_a_inactivo` | PATCH /estado funciona |
| 9 | `suspender_usuario_requiere_razon` | Validación razón obligatoria |
| 10 | `solo_gerente_puede_cambiar_a_rol_critico` | Anti-escalación |
| 11 | `gerente_puede_cambiar_a_rol_critico` | Gerente SÍ puede |
| 12 | `eliminar_usuario` | Soft delete |
| 13 | `restaurar_usuario_eliminado` | Restore |
| 14 | `ver_detalle_usuario` | Estructura detalle completo |

#### `tests/Feature/Competencias/CompetenciasTest.php` — 13 tests

| # | Test | Qué verifica |
|---|------|-------------|
| 1 | `listar_competencias_retorna_paginado` | GET /competencias estructura |
| 2 | `crear_competencia_basica` | POST /competencias retorna 201 |
| 3 | `nombre_duplicado_falla` | Unique constraint nombre |
| 4 | `tipo_invalido_falla` | Enum validation tipo |
| 5 | `requiere_renovacion_sin_vigencia_meses_falla` | required_if validation |
| 6 | `crear_competencia_con_renovacion` | Competencia con meses de vigencia |
| 7 | `actualizar_competencia` | PUT /competencias/{id} |
| 8 | `eliminar_competencia_sin_asignaciones` | DELETE limpio |
| 9 | `eliminar_competencia_con_asignaciones_falla` | Protección referencial → 422 |
| 10 | `asignar_competencia_a_personal` | POST /personal/{id}/competencias |
| 11 | `competencia_requiere_renovacion_sin_fecha_vencimiento_falla` | Regla de negocio |
| 12 | `asignar_competencia_marca_estado_vencida_si_fecha_pasada` | Estado automático |
| 13 | `no_autenticado_no_puede_ver_competencias` | Sanctum 401 |

---

## Archivos Clave

**Backend (nuevos)**
- `app/Http/Controllers/Api/CompetenciaController.php` — CRUD catálogo con protección referencial
- `app/Http/Requests/Competencia/CrearCompetenciaRequest.php`
- `app/Http/Requests/Competencia/ActualizarCompetenciaRequest.php`
- `tests/Feature/Usuarios/UsuariosTest.php` — 14 tests
- `tests/Feature/Competencias/CompetenciasTest.php` — 13 tests

**Frontend (nuevos/actualizados)**
- `resources/js/services/competenciaService.js` — listar/crear/actualizar/eliminar
- `resources/js/pages/admin/competencias/CompetenciasPage.jsx` — catálogo con glass modal CRUD
- `resources/js/components/personal/AsignarCompetenciaModal.jsx` — modal reescrito con semáforo
- `resources/js/pages/admin/personal/DetallePersonal.jsx` — semáforo tricolor en tab competencias
- `resources/js/pages/admin/usuarios/ListaUsuarios.jsx` — estado "Pendiente" + filtro primer login

---

## Comandos

```bash
# Tests
php artisan test --filter="UsuariosTest|CompetenciasTest"

# Suite completa
php artisan test

# Base de datos
php artisan migrate:fresh --seed

# Build frontend
npm run build
```

---

## Resultado final

```
Tests:    73 passed (210 assertions)
Build:    ✓ built in 5.24s
Migrate:  ✓ All seeders DONE
```
