# Auditoría — Almacenes Sub-fase C.1: Movimientos Profesionales
**CA & KANAGF S.R.L. — Sistema de Gestión de Construcción**
**Fecha:** 2026-05-28 | **Branch:** develop

---

## 1. Objetivo

Auditar el estado actual del módulo de movimientos de almacén antes de implementar la Sub-fase C.1 (movimientos profesionales completos: entradas, salidas con foto/firma, transferencias, cierre automático). Identificar gaps, bugs y elementos listos para usar.

---

## 2. Estado del Backend

### 2.1 EntregaService (`app/Services/Almacenes/EntregaService.php`)

**Estado:** ✅ Implementado — con 2 bugs críticos detectados

| Método | Estado | Notas |
|--------|--------|-------|
| `registrarEntrada(array, int)` | ✅ | Atómico, PMP correcto |
| `registrarSalidaSocial(array, int)` | ✅ | Con cascada avance, evidencias |
| `registrarSalidaPrivada(array, int)` | ✅ | Con evidencias |
| `registrarTransferencia(array, int)` | ✅ | Estado `en_transito`, PMP preservado |
| `anular(Movimiento, string, int)` | ✅ | Revierte kardex completo |
| `validarSobreConsumo(int, array)` | ✅ | Retorna niveles ok/alerta/bloqueado |
| `confirmarRecepcionTransferencia` | ❌ FALTA | Necesario para cambiar `en_transito → completado` |
| `cerrarAlmacenProyecto` | ❌ FALTA | Necesario para cierre formal del almacén |

**Bug #1:** `getCantidadPlanificadaMaterial` llama `->recetas()` pero `ItemConstructivo` define `receta()` (sin 's').

**Bug #2:** En la misma función, `$receta->cantidad_por_unidad` debería ser `->cantidad_por_unidad_base` (campo real en tabla `recetas_item`).

**Bug #3 (validación):** Entre 110% y 150%, el backend no valida que se requiera justificación; solo lo hace el frontend. Se debe agregar la validación al servicio.

### 2.2 StockService (`app/Services/Almacenes/StockService.php`)

**Estado:** ✅ Completo y correcto

- **PMP formula correcta:** `(stock_ant × PMP_ant + cant × precio) / (stock_ant + cant)` — implementada en `registrarEntrada`
- **lockForUpdate:** Salidas y transferencias usan `lockForUpdate()` — race-condition safe
- Métodos: `registrarEntrada`, `registrarSalida`, `transferir`, `registrarAjuste`, `reconciliarKardex`

### 2.3 MovimientoAlmacenController (`app/Http/Controllers/Api/MovimientoAlmacenController.php`)

**Estado:** ✅ 8 endpoints — falta `confirmarTransferencia`

| Endpoint | Método | Permiso | Estado |
|----------|--------|---------|--------|
| `GET /movimientos-almacen` | `index` | `movimientos.ver` | ✅ |
| `GET /movimientos-almacen/{id}` | `show` | `movimientos.ver` | ✅ |
| `POST /movimientos-almacen/entradas` | `registrarEntrada` | `movimientos.crear_entrada` | ✅ |
| `POST /movimientos-almacen/salidas-sociales` | `registrarSalidaSocial` | `movimientos.crear_salida_social` | ✅ |
| `POST /movimientos-almacen/salidas-privadas` | `registrarSalidaPrivada` | `movimientos.crear_salida_privado` | ✅ |
| `POST /movimientos-almacen/transferencias` | `registrarTransferencia` | `movimientos.transferir` | ✅ |
| `PATCH /movimientos-almacen/{id}/anular` | `anular` | `movimientos.anular` | ✅ |
| `POST /movimientos-almacen/validar-consumo` | `validarConsumo` | `movimientos.crear_salida_social` | ✅ |
| `PATCH /movimientos-almacen/{id}/confirmar` | `confirmarTransferencia` | `movimientos.transferir` | ❌ FALTA |

### 2.4 AlmacenController — endpoint cerrar

**Estado:** ❌ FALTA
- `PATCH /almacenes/{id}/cerrar` no existe

---

## 3. Estado del Frontend

### 3.1 Modales de movimiento

| Modal | Estado | Notas |
|-------|--------|-------|
| `EntradaCompraModal.jsx` | ✅ Completo | Multi-material, factura, monto total |
| `EntregaSocialModal.jsx` | ✅ Completo | 5 pasos: beneficiario → ítem → modalidad → evidencias → confirmar; SignaturePad integrado; NivelConsumo badge |
| `EntregaPrivadaModal.jsx` | ✅ Completo | Personal selector, foto obligatoria |
| `TransferenciaModal.jsx` | ✅ Completo | Selección de almacén destino, multi-material |

### 3.2 AlmacenDetalle.jsx

**Estado:** ✅ Completo para stock y movimientos — falta botón "Confirmar" para `en_transito`

- Tab **Stock**: tabla con cantidad, reservada, disponible, PMP, valor, estado, link a Kardex
- Tab **Movimientos**: filtros por tipo/estado/búsqueda, tabla paginada, panel lateral de detalle, botón Anular
- Botones acción: Entrada / Salida Social o Privada (auto-detectado vía `almacen.proyecto?.es_social`) / Transferir
- Exportar a xlsx/pdf disponible
- **Falta:** Botón "Confirmar recepción" para movimientos `en_transito` en la tabla

### 3.3 Auto-detección social/privado

`Proyecto.es_social` es un atributo computado en `$appends`:
```php
// app/Models/Proyecto.php
protected $appends = ['es_social'];
public function getEsSocialAttribute(): bool
{
    return $this->categoria === 'social';
}
```
El frontend lee `almacen.proyecto?.es_social` — ✅ funciona sin intervención del usuario.

---

## 4. Modelos y Tablas Clave

### 4.1 `movimientos_almacen`

| Columna | Tipo | Notas |
|---------|------|-------|
| `codigo` | varchar | `generarCodigo(tipo)` auto |
| `tipo` | ENUM | entrada_compra, salida_social, salida_privado, transferencia_interna, … |
| `estado` | ENUM | completado, en_transito, pendiente, anulado, borrador |
| `almacen_origen_id` | FK→almacenes | nullable |
| `almacen_destino_id` | FK→almacenes | nullable |
| `beneficiario_id` | FK→beneficiarios | nullable |
| `presupuesto_item_proyecto_id` | FK→presupuesto_items_proyecto | nullable |
| `receptor_personal_id` | FK→personal | nullable |
| `requiere_aprobacion` | boolean | true si consumo >150% |
| `justificacion_sobre_consumo` | text | nullable |
| `modalidad_entrega` | ENUM | total, parcial |

### 4.2 `evidencias_movimiento`

| Columna | Tipo | Notas |
|---------|------|-------|
| `tipo` | ENUM(foto, firma, documento) | |
| `archivo_url` | varchar | URL en storage |
| `hash_validacion` | varchar | sha256 |
| `latitud` / `longitud` | decimal | GPS opcional |
| `dispositivo` | varchar | nombre del dispositivo |
| `fecha_captura` | datetime | |

### 4.3 `stock_material`

| Columna | Tipo | Notas críticas |
|---------|------|----------------|
| `cantidad` | decimal | Stock real actualizable |
| `cantidad_disponible` | **VIRTUAL/GENERATED** | = cantidad − cantidad_reservada — NO en fillable |
| `cantidad_reservada` | decimal | Para reservas |
| `costo_promedio` | decimal | PMP actual |
| `ultimo_precio_entrada` | decimal | Último precio de compra |

> ⚠️ `cantidad_disponible` es columna generada — NUNCA asignarla directamente.

### 4.4 `recetas_item`

| Columna | Tipo | Notas |
|---------|------|-------|
| `item_constructivo_id` | FK | |
| `material_id` | FK | |
| `cantidad_por_unidad_base` | decimal(4) | Cantidad de material por unidad del ítem |

Relación en `ItemConstructivo`: `receta()` (hasMany de `RecetaItem`) — **sin 's'**.

---

## 5. Umbrales de Sobre-consumo

| Nivel | Rango | Acción requerida |
|-------|-------|-----------------|
| OK | ≤ 110% | Ninguna |
| Alerta | 110% < pct ≤ 150% | `justificacion_sobre_consumo` obligatoria |
| Bloqueado | > 150% | `aprobado_por_id` obligatorio |

---

## 6. Gaps Identificados y Plan de Acción

| # | Gap | Acción | Archivo |
|---|-----|--------|---------|
| 1 | Bug `->recetas()` → debe ser `->receta()` | Fix | `EntregaService.php` |
| 2 | Bug `->cantidad_por_unidad` → `->cantidad_por_unidad_base` | Fix | `EntregaService.php` |
| 3 | Sin validación backend 110-150% requiere justificación | Agregar | `EntregaService.php` |
| 4 | `confirmarRecepcionTransferencia` faltante | Implementar | `EntregaService.php` |
| 5 | `cerrarAlmacenProyecto` faltante | Implementar | `EntregaService.php` |
| 6 | Endpoint `confirmarTransferencia` faltante | Agregar | `MovimientoAlmacenController.php` |
| 7 | Endpoint `cerrar` en AlmacenController faltante | Agregar | `AlmacenController.php` |
| 8 | Rutas para endpoints nuevos | Agregar | `routes/api.php` |
| 9 | Botón "Confirmar recepción" en tab Movimientos | Agregar | `AlmacenDetalle.jsx` |

---

## 7. Tests Existentes

| Archivo | Tests | Estado |
|---------|-------|--------|
| `tests/Feature/MovimientosAlmacen/EntradaCompraTest.php` | 4 | ✅ |
| `tests/Feature/MovimientosAlmacen/IntegracionTipologiaTest.php` | ? | ✅ |

**Tests a crear:** 15 en `tests/Feature/Movimientos/MovimientoAlmacenTest.php`

---

## 8. Conclusión

El 80% de la infraestructura está implementada y correcta. Los gaps son:
- 2 bugs críticos en `getCantidadPlanificadaMaterial`
- 1 gap de validación backend
- 2 métodos faltantes en `EntregaService`
- 2 endpoints faltantes en controladores
- 1 mejora UI (botón confirmar transferencia)

**No se requieren nuevas migraciones.** La implementación puede completarse modificando archivos existentes y agregando el archivo de tests.
