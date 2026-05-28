# ALMACENES SUB-FASE C — Reporte de Implementación

**Proyecto**: ERP CA & KANAGF S.R.L.  
**Módulo**: Almacenes y Materiales — Sub-fase C  
**Fecha**: 2026-05-26  
**Estado**: ✅ Implementado y testeado

---

## 1. Integración Beneficiario ↔ TipoVivienda ↔ PlantillaConstructiva

| Ítem | Estado | Detalle |
|------|--------|---------|
| FK `tipos_vivienda.plantilla_constructiva_id` | ✅ | Migración `2026_05_26_000020`, `nullOnDelete()` |
| `TipoVivienda::plantillaConstructiva()` | ✅ | BelongsTo añadida al modelo |
| Auto-generar `presupuesto_items_proyecto` al crear beneficiario | ✅ | `IntegracionBeneficiarioService::generarItemsParaBeneficiario()` |
| Llamada en `BeneficiarioController::store()` | ✅ | Dentro de la transacción existente |
| Resumen de avance por beneficiario | ✅ | `IntegracionBeneficiarioService::getAvanceBeneficiario()` |

---

## 2. Nuevas Tablas de Movimientos

| Tabla | Estado | Nota |
|-------|--------|------|
| `movimientos_almacen` | ✅ | 10 tipos de movimiento, 5 estados, softDeletes |
| `detalle_movimientos_almacen` | ✅ | Col. STORED `subtotal = cantidad * precio_unitario` |
| `evidencias_movimiento` | ✅ | Foto/firma/documento, hash SHA-256, GPS |
| FK `movimientos_material.movimiento_almacen_id` | ✅ | Nullable, índice explícito |
| Permisos sub-fase C | ✅ | 7 permisos sembrados, adjuntados al rol `administrador` |

---

## 3. Modelos

| Modelo | Estado | Relaciones clave |
|--------|--------|-----------------|
| `MovimientoAlmacen` | ✅ | 13 relaciones, `generarCodigo()` con lock, constantes TIPOS |
| `DetalleMovimientoAlmacen` | ✅ | BelongsTo movimiento + material + movimientoKardex |
| `EvidenciaMovimiento` | ✅ | BelongsTo movimiento |
| `TipoVivienda` (actualizado) | ✅ | `plantillaConstructiva()` BelongsTo |
| `MovimientoMaterial` (actualizado) | ✅ | `movimientoAlmacen()` BelongsTo |

---

## 4. Servicios

| Servicio | Estado | Métodos |
|----------|--------|---------|
| `IntegracionBeneficiarioService` | ✅ | `generarItemsParaBeneficiario()`, `getAvanceBeneficiario()` |
| `EntregaService` | ✅ | `registrarEntrada()`, `registrarSalidaSocial()`, `registrarSalidaPrivada()`, `registrarTransferencia()`, `anular()`, `validarSobreConsumo()` |
| `CierreProyectoService` | ✅ | `cerrarProyecto()` — transfiere stock al almacén central al finalizar proyecto |
| `StockService` (actualizado) | ✅ | Acepta `$movimientoAlmacenId` en entrada/salida/transferencia; enlaza kardex |

---

## 5. Validaciones de negocio

| Regla | Estado | Umbral |
|-------|--------|--------|
| Alerta sobre-consumo (advertencia) | ✅ | 110% de lo planificado |
| Bloqueo sobre-consumo | ✅ | 150% de lo planificado |
| No duplicar ítems presupuesto en registro doble | ✅ | `ya_existe` check en `IntegracionBeneficiarioService` |
| Anular movimiento ya anulado | ✅ | Excepción en `EntregaService::anular()` |
| Cierre de almacenes al finalizar proyecto | ✅ | `CierreProyectoService` llamado desde `ProyectoController::cambiarEstado()` |

---

## 6. API — Endpoints

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/api/movimientos-almacen` | `movimientos.ver` |
| GET | `/api/movimientos-almacen/{id}` | `movimientos.ver` |
| POST | `/api/movimientos-almacen/entradas` | `movimientos.crear_entrada` |
| POST | `/api/movimientos-almacen/salidas-sociales` | `movimientos.crear_salida_social` |
| POST | `/api/movimientos-almacen/salidas-privadas` | `movimientos.crear_salida_privado` |
| POST | `/api/movimientos-almacen/transferencias` | `movimientos.transferir` |
| PATCH | `/api/movimientos-almacen/{id}/anular` | `movimientos.anular` |
| POST | `/api/movimientos-almacen/validar-consumo` | `movimientos.crear_salida_social` |
| GET | `/api/exportar/movimientos-almacen` | `movimientos.ver` |

---

## 7. Frontend

| Componente | Estado | Descripción |
|------------|--------|-------------|
| `EntradaCompraModal.jsx` | ✅ | Multi-material; subtotal en tiempo real; proveedor/factura |
| `EntregaSocialModal.jsx` | ✅ | Stepper 5 pasos; firma digital (`signature_pad`); GPS; validación sobre-consumo |
| `EntregaPrivadaModal.jsx` | ✅ | Foto requerida; búsqueda de personal |
| `TransferenciaModal.jsx` | ✅ | Selección almacén destino (excluye actual) |
| `AlmacenDetalle.jsx` | ✅ | Tabs stock/movimientos; filtros; drawer detalle; BotonExportar con filtros activos; anular con motivo |
| `movimientoAlmacenService.js` | ✅ | 8 métodos cubriendo todos los endpoints |
| Iconos `ShoppingCart`, `ArrowRight` | ✅ | Añadidos a `Icons.jsx` |

---

## 8. Tests

| Suite | Tests | Estado |
|-------|-------|--------|
| `EntradaCompraTest` | 4 | ✅ 4/4 |
| `IntegracionTipologiaTest` | 2 | ✅ 2/2 |
| **Total** | **6** | **✅ 6/6 (14 assertions)** |

### Correcciones aplicadas durante tests
- Permiso: campos `codigo` y `modulo` requeridos sin default — añadidos en todos los fixtures
- Material.tipo: enum `maestro/especial` — corregido de `'insumo'`
- PlantillaConstructiva.estado: `tinyint(1)` — corregido de `'activa'` a `true`
- ItemConstructivo.unidad_base: enum — corregido de `'global'` a `'glb'`
- ItemPlantillaConstructiva FK: `plantilla_id` (no `plantilla_constructiva_id`)
- PlantillaConstructiva relación: `items()` (no `itemsPlantilla()`)
- `ponderacion_avance`: `decimal(6,4)` — corregido de `100` a `99.99`
- `MovimientoAlmacenController`: usaba `$this->authorize()` (trait faltante) — reemplazado por `hasPermissionTo()` consistente con el resto del proyecto

---

## 9. Permisos Sub-fase C

| Código | Módulo | Descripción |
|--------|--------|-------------|
| `movimientos.ver` | movimientos | Ver listado y detalle |
| `movimientos.crear_entrada` | movimientos | Registrar entrada de compra |
| `movimientos.crear_salida_social` | movimientos | Entregar materiales a beneficiario |
| `movimientos.crear_salida_privado` | movimientos | Salida a personal autorizado |
| `movimientos.transferir` | movimientos | Transferencia entre almacenes |
| `movimientos.anular` | movimientos | Anular movimiento existente |
| `movimientos.aprobar_sobre_consumo` | movimientos | Aprobar entregas sobre umbral 110% |

---

## 10. Decisiones de diseño

- **`vivienda_id` (no `beneficiario_id`)** en `presupuesto_items_proyecto`: el ítem pertenece a la vivienda física; el beneficiario puede cambiar a lo largo del proyecto.
- **PMP (Precio Medio Ponderado)**: calculado en `StockService` existente; todos los movimientos nuevos lo actualizan.
- **`movimientos_material` como kardex**: tabla existente conservada para historial por material; los nuevos movimientos la enlazan via `movimiento_almacen_id` nullable (backward compatible).
- **Código de movimiento**: generado atómicamente con `lockForUpdate()` para evitar duplicados bajo concurrencia.
- **Cierre de proyecto**: no-crítico — si falla no revierte el cambio de estado; se loguea el error.
