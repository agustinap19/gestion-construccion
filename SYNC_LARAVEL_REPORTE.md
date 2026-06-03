# SYNC_LARAVEL_REPORTE — Sincronización Móvil Implementada

Fecha: 2026-05-29

---

## 1. Endpoints implementados

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET    | `/api/movil/v1/ping`          | No  | Verificar conectividad. Responde `{ok: true, timestamp, version}`. |
| POST   | `/api/movil/v1/auth/login`    | No  | Login con `device_id` y `device_name`. Registra en `dispositivos_movil`. |
| POST   | `/api/movil/v1/login`         | No  | Alias legacy del anterior. |
| POST   | `/api/movil/v1/logout`        | Sí  | Revoca el token actual. |
| GET    | `/api/movil/v1/sync/pull`     | Sí  | Descarga datos. Acepta `?ultimo_sync=ISO8601`. |
| POST   | `/api/movil/v1/sync/push`     | Sí  | Sube reportes con foto, GPS y validaciones completas. |
| GET    | `/api/movil/v1/sync-down`     | Sí  | Alias legacy → delega a `pull`. |
| POST   | `/api/movil/v1/sync-up`       | Sí  | Alias legacy → delega a `push`. |

---

## 2. Tabla `dispositivos_movil` (esquema)

```sql
CREATE TABLE dispositivos_movil (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id   BIGINT UNSIGNED NOT NULL  REFERENCES users(id) ON DELETE CASCADE,
  device_id    VARCHAR(255) NOT NULL,
  device_name  VARCHAR(255) NULL,
  ultimo_sync  TIMESTAMP NULL,
  activo       TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP NULL,
  updated_at   TIMESTAMP NULL,
  UNIQUE KEY (usuario_id, device_id),
  INDEX (device_id)
);
```

---

## 3. Campos agregados a `reportes_avance`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `uuid_local`    | VARCHAR(36) UNIQUE NULL | UUID generado en la app para deduplicación |
| `latitud`       | DECIMAL(10,7) NULL | Latitud GPS al momento del reporte |
| `longitud`      | DECIMAL(10,7) NULL | Longitud GPS al momento del reporte |
| `fuera_de_rango` | TINYINT(1) DEFAULT 0 | 1 si el técnico estaba a > 2 km del proyecto |

---

## 4. `AvanceService` — métodos nuevos

**Archivo:** `app/Services/Proyectos/AvanceService.php`

| Método | Descripción |
|--------|-------------|
| `recalcularCascada(ReporteAvance $reporte): void` | Orquesta la cascada completa en una sola `DB::transaction()`. |
| `recalcularVivienda(int $viviendaId): float` | `SUM(pip.avance × pip.ponderacion_avance) / SUM(pip.ponderacion_avance)`. Actualiza `viviendas.porcentaje_avance` y el estado. |
| `recalcularProyecto(int $proyectoId): float` | `AVG(viviendas.porcentaje_avance)`. Actualiza `proyectos.avance_fisico`. |
| `distanciaKm(lat1, lon1, lat2, lon2): float` | Fórmula Haversine, resultado en km. |

---

## 5. Lógica del avance (fuente única de verdad: servidor)

```
avance_item    = porcentaje_avance del último ReporteAvance con estado='aprobado'
avance_vivienda = SUM(pip.porcentaje_avance × pip.ponderacion_avance) / SUM(pip.ponderacion_avance)
avance_proyecto = AVG(viviendas.porcentaje_avance)
```

Todo se recalcula automáticamente en el servidor al recibir un push. La app NUNCA calcula avances localmente.

---

## 6. Validaciones del push (por reporte)

1. **Campos requeridos:** `uuid_local`, `item_id`, `vivienda_id`, `avance_registrado`, `latitud`, `longitud`, `timestamp_local`
2. **Foto obligatoria:** si `foto_base64` está ausente o vacío → error 422 (si todos fallan)
3. **Deduplicación:** `uuid_local` único en BD → si ya existe, devuelve el reporte existente (`estado: duplicado`) sin crear duplicado
4. **Retroceso de avance:** si `avance_registrado < pip.porcentaje_avance`, la `observacion` es obligatoria
5. **Geo-validación:** si la distancia entre el reporte y el proyecto supera 2 km → `fuera_de_rango: true` (NO rechaza, solo flagea)
6. **Almacenamiento de foto:** base64 → decode → guardado en `storage/public/reportes/{proyecto_id}/{vivienda_id}/{YYYY-MM}/`. Si supera 2MB y GD está disponible → compresión a 75%.

---

## 7. Output de los tests (`php artisan test --filter=SyncMovil`)

```
 PASS  Tests\Feature\SyncMovilTest
  ✓ pull sin auth falla                                  17.01s
  ✓ pull primera vez devuelve todo                        0.16s
  ✓ pull con timestamp devuelve solo nuevos               0.07s
  ✓ push reporte sin foto falla                           0.11s
  ✓ push reporte sin coordenadas falla                    0.06s
  ✓ push reporte valido recalcula avance cascada          0.08s
  ✓ push duplicado es idempotente                         0.09s
  ✓ avance vivienda ponderado correcto                    0.07s
  ✓ avance proyecto promedio viviendas                    0.07s

Tests:    9 passed (41 assertions)
Duration: 18.11s
```

Tests previos (ReporteAvanceTest): **11/11 sin regresión.**

---

## 8. Ejemplo request/response del push

### Request
```http
POST /api/movil/v1/sync/push
Authorization: Bearer {token}
Content-Type: application/json

{
  "reportes": [
    {
      "uuid_local":        "550e8400-e29b-41d4-a716-446655440000",
      "item_id":           42,
      "vivienda_id":       7,
      "avance_registrado": 75,
      "observacion":       "Se completó la estructura de techo.",
      "latitud":           -16.5012,
      "longitud":          -68.1489,
      "foto_base64":       "data:image/jpeg;base64,/9j/4AAQ...",
      "timestamp_local":   "2026-05-29T14:30:00Z"
    }
  ]
}
```

### Response `200 OK`
```json
{
  "procesados": 1,
  "errores": 0,
  "detalle": [
    {
      "uuid_local":     "550e8400-e29b-41d4-a716-446655440000",
      "id_servidor":    157,
      "estado":         "ok",
      "fuera_de_rango": false
    }
  ]
}
```

### Response `422` (foto faltante)
```json
{
  "procesados": 0,
  "errores": 1,
  "detalle": [
    {
      "uuid_local":  "550e8400-...",
      "id_servidor": null,
      "estado":      "error",
      "mensaje":     "La foto es obligatoria."
    }
  ]
}
```

---

## 9. Comandos para prueba manual con curl

```bash
# Ping (sin auth)
curl http://localhost:8000/api/movil/v1/ping

# Login
curl -s -X POST http://localhost:8000/api/movil/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"secret","device_name":"Motorola G22","device_id":"android-abc123"}'

# Pull completo (primera sincronización)
curl -s http://localhost:8000/api/movil/v1/sync/pull \
  -H "Authorization: Bearer TOKEN"

# Pull delta (solo desde fecha)
curl -s "http://localhost:8000/api/movil/v1/sync/pull?ultimo_sync=2026-05-28T00:00:00Z" \
  -H "Authorization: Bearer TOKEN"

# Push con foto base64
curl -s -X POST http://localhost:8000/api/movil/v1/sync/push \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportes": [{
      "uuid_local":        "550e8400-e29b-41d4-a716-446655440000",
      "item_id":           42,
      "vivienda_id":       7,
      "avance_registrado": 60,
      "latitud":           -16.5012,
      "longitud":          -68.1489,
      "foto_base64":       "data:image/jpeg;base64,'"$(base64 -w0 evidencia.jpg)"'",
      "timestamp_local":   "2026-05-29T14:30:00Z"
    }]
  }'
```

---

## 10. Archivos clave

| Archivo | Rol |
|---------|-----|
| `app/Http/Controllers/Api/MobileAuthController.php` | Login/logout con registro de dispositivo |
| `app/Http/Controllers/Api/MobileSyncController.php` | ping / pull / push completos |
| `app/Services/Proyectos/AvanceService.php` | Lógica de cascada: ítem → vivienda → proyecto |
| `app/Models/DispositivoMovil.php` | Modelo para dispositivos registrados |
| `app/Models/ReporteAvance.php` | Actualizado con campos `uuid_local`, `latitud`, `longitud`, `fuera_de_rango` |
| `database/migrations/2026_05_29_210001_create_dispositivos_movil_table.php` | Tabla de dispositivos |
| `database/migrations/2026_05_29_210002_add_sync_fields_to_reportes_avance.php` | Campos de sync en reportes |
| `routes/api.php` | 8 rutas móviles (nuevas + legacy aliases) |
| `tests/Feature/SyncMovilTest.php` | 9 tests — todos en verde |
| `SYNC_AUDITORIA.md` | Diagnóstico del sistema anterior |
