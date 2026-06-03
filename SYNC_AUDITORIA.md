# SYNC_AUDITORIA — Estado actual de la API Móvil

Fecha: 2026-05-29

---

## 1. Endpoints existentes (routes/api.php verificado con `php artisan route:list`)

| Método | Ruta | Controller | Estado |
|--------|------|-----------|--------|
| POST   | `/api/movil/v1/login`     | MobileAuthController@login          | Parcial — sin device_id |
| POST   | `/api/movil/v1/logout`    | MobileAuthController@logout         | Funciona |
| GET    | `/api/movil/v1/sync-down` | MobileSyncController@descargarDatos | Roto (ver §4) |
| POST   | `/api/movil/v1/sync-up`   | MobileSyncController@subirReportes  | Roto (ver §4) |

**No existen:** `/ping`, `/auth/login`, `/sync/pull`, `/sync/push`

---

## 2. Cómo calcula el avance actualmente

### Avance de ítem
Campo `presupuesto_items_proyecto.porcentaje_avance`. Se actualiza al recibir un reporte.

### Avance de vivienda
`CalculadoraAvanceService::recalcularAvanceVivienda()` — usa `Vivienda::itemsChecklist()` (tabla `items_checklist`).
**PROBLEMA:** la tabla activa de ítems es `presupuesto_items_proyecto` con `ponderacion_avance`.
La calculadora de la vivienda usa la relación **incorrecta** para sync.

La lógica correcta vive en `ReporteAvanceService::recalcularVivienda()` (método privado):
```
avance_vivienda = SUM(pip.porcentaje_avance × pip.ponderacion_avance) / SUM(pip.ponderacion_avance)
```

### Avance de proyecto
`CalculadoraAvanceService::recalcularAvanceProyecto()` — usa `AVG(viviendas.porcentaje_avance)`.
Correcto para proyectos sociales.

### Desde la app (roto)
`subirReportes` corre el recálculo **fuera** de la transacción y llama a `CalculadoraAvanceService::recalcularAvanceVivienda()` (calculadora incorrecta).

---

## 3. Autenticación para la app

- Sanctum Bearer Token con nombre `mobile_app`.
- Login revoca token anterior del mismo nombre y crea uno nuevo.
- **No existe** tabla `dispositivos_movil`. No hay `device_id`, `device_name`, ni `ultimo_sync` por dispositivo.
- Sin diferenciación de auth entre web y app (ambas usan `auth:sanctum`).

---

## 4. Problemas concretos encontrados

### sync-down (GET /api/movil/v1/sync-down)
1. Sin filtro `ultimo_sync` — siempre devuelve TODO sin importar cuándo se sincronizó.
2. Devuelve `items_checklist` (datos de `presupuesto_items_proyecto` mal nombrados) sin `ponderacion` ni `avance_actual` del servidor.
3. Devuelve `porcentaje_avance` crudo; la app recalcula localmente en SQLite → origen del "50% global sin base real".
4. Sin campo `timestamp_servidor` en la respuesta.
5. Beneficiarios separados del JSON de viviendas.
6. No filtra por `updated_at` → sin delta sync posible.

### sync-up (POST /api/movil/v1/sync-up)
1. **Foto no validada** — `foto_path` tiene NOT NULL en migración → SQL error si no viene foto.
2. **GPS no validado** — acepta reportes sin latitud/longitud.
3. **Sin deduplicación** — `uuid_movil` guardado en JSON `metadata`, sin índice único → duplicados posibles.
4. **Recálculo fuera de transacción** — si falla, BD queda inconsistente.
5. **Calculadora incorrecta** — llama a `recalcularAvanceVivienda()` del `CalculadoraAvanceService`.
6. **Sin validación de retroceso** — el avance puede bajar sin observación.
7. **Sin validación geográfica** — no verifica distancia al proyecto.

### Auth / login
1. No guarda `device_id` ni `device_name`.
2. No actualiza `ultimo_sync` por dispositivo.
3. Tabla `dispositivos_movil` no existe.

---

## 5. Tablas y campos que faltan

| Tabla | Campo | Acción |
|-------|-------|--------|
| `dispositivos_movil` | id, usuario_id, device_id, device_name, ultimo_sync, activo | CREAR |
| `reportes_avance` | `uuid_local` VARCHAR(36) UNIQUE | AGREGAR |
| `reportes_avance` | `latitud` DECIMAL(10,7) | AGREGAR |
| `reportes_avance` | `longitud` DECIMAL(10,7) | AGREGAR |
| `reportes_avance` | `fuera_de_rango` BOOLEAN DEFAULT FALSE | AGREGAR |
| `proyectos` | `latitud`, `longitud` | YA EXISTEN (migración 0001_01_01_000402) |

---

## 6. Diagnóstico de servicios de avance

| Servicio | Método | Usa | Estado para sync |
|----------|--------|-----|--------|
| `CalculadoraAvanceService` | `recalcularAvanceVivienda()` | `ItemChecklist` (tabla vieja) | **Incorrecto** |
| `ReporteAvanceService` | `recalcularVivienda()` (privado) | `PresupuestoItemProyecto` | **Correcto** pero privado |
| `CalculadoraAvanceService` | `recalcularAvanceProyecto()` | `AVG(viviendas.porcentaje_avance)` | Correcto |

**Falta:** `AvanceService::recalcularCascada(ReporteAvance)` — servicio público, atómico, reutilizable.

---

## 7. Plan de acción (Pasos 2–7)

- Crear tabla `dispositivos_movil` + agregar campos a `reportes_avance`.
- Crear `AvanceService` con `recalcularCascada()` usando la lógica correcta de `presupuesto_items_proyecto`.
- Actualizar `MobileAuthController` para registrar device.
- Reescribir `MobileSyncController` con `ping / pull / push` con todas las validaciones.
- Agregar nuevas rutas: `/ping`, `/auth/login`, `/sync/pull`, `/sync/push`.
- Tests automatizados: `SyncMovilTest.php` con 9 casos.
