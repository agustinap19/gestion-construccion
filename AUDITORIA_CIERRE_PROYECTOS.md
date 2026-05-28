# Auditoría de Cierre — Módulo Proyectos: Reactividad Financiera + Matriz Items×Productos
**CA & KANAGF S.R.L. — Sistema de Gestión de Construcción**
**Fecha:** 2026-05-28 | **Branch:** develop | **Auditor:** Claude (antes de tocar código)

---

## 1. Estado Actual del Módulo

### 1.1 Tablas relevantes

| Tabla | Columnas críticas | Notas |
|-------|-------------------|-------|
| `proyectos` | `monto_contractual`, `presupuesto_materiales`, `porcentaje_mano_obra`, `porcentaje_gastos_generales`, `porcentaje_utilidad_esperada`, `presupuesto_mano_obra`, `presupuesto_gastos_generales`, `presupuesto_utilidad_esperada`, `usa_monto_fijo_mo`, `usa_monto_fijo_gg`, `usa_monto_fijo_util`, `justificacion_rentabilidad_baja`, `salud_financiera` | Columnas financieras añadidas en `2026_05_27_000002` y `2026_05_27_000010`. Montos fijos se almacenan en `presupuesto_*` cuando `usa_monto_fijo_*=true`. **Sin columnas duplicadas necesarias.** |
| `hitos_cobro_proyecto` | `proyecto_id`, `nombre`, `porcentaje_contrato`, `monto_calculado`, `tipo` (producto_sicooes / hito_negociado), `orden` | Modelo `HitoCobro`. Para social: P1–P4 con tipo=producto_sicooes. Para privado: hitos negociados. |
| `productos_contractuales` | `proyecto_id`, `nombre`, `porcentaje`, `monto_calculado`, `orden` | Modelo `ProductoContractual`. Sistema **legacy** anterior al rediseño. Conservado para compatibilidad. |
| `presupuesto_items_proyecto` | `proyecto_id`, `vivienda_id`, `item_constructivo_id`, `cantidad_planificada`, `producto_contractual_id`, `fase_id` | FK `producto_contractual_id` → `productos_contractuales` (legacy). **No existe FK a `hitos_cobro_proyecto`.** Modelo `PresupuestoItemProyecto`. |
| `items_constructivos` | `id`, `nombre`, `codigo`, `unidad_base`, `categoria_id` | Categoría constructiva vía `categoria_id`. |
| `categorias_constructivas` | `id`, `nombre`, `color` | Categoría de ítem constructivo. |

### 1.2 Gap detectado: FK para Matriz Items×Productos

La Matriz Items×Productos requiere vincular cada `PresupuestoItemProyecto` a un `HitoCobro` (P1–P4). La columna `producto_contractual_id` ya existe en `presupuesto_items_proyecto` pero apunta al modelo **legacy** `ProductoContractual`.

**Decisión de implementación:** Agregar columna `hito_cobro_id` nullable FK → `hitos_cobro_proyecto` en `presupuesto_items_proyecto`. Esto preserva el legacy sin romper nada y usa la infraestructura nueva.

### 1.3 Modelos existentes relevantes

| Modelo | Ubicación | Relaciones clave |
|--------|-----------|-----------------|
| `Proyecto` | `app/Models/Proyecto.php` | `hitosCobro()`, `productosContractuales()` |
| `HitoCobro` | `app/Models/HitoCobro.php` | `belongsTo(Proyecto)`, `belongsTo(FaseProyecto, vinculacion_fase_id)` |
| `PresupuestoItemProyecto` | `app/Models/PresupuestoItemProyecto.php` | `productoContractual()` → `ProductoContractual` (legacy), `itemConstructivo()`, `vivienda()` |
| `ProductoContractual` | `app/Models/ProductoContractual.php` | `belongsTo(Proyecto)` |

### 1.4 Servicios existentes

| Servicio | Ubicación | Responsabilidad |
|----------|-----------|----------------|
| `ProyectoService` | `app/Services/Proyectos/ProyectoService.php` | CRUD, snapshot financiero en `crear()`, lógica de estados |
| `CascadaProyectoService` | `app/Services/Proyectos/CascadaProyectoService.php` | Crea almacén, fases, viviendas, hitos cobro en transacción |
| `PresupuestoAutomaticoService` | `app/Services/Almacenes/PresupuestoAutomaticoService.php` | Genera/recalcula `presupuesto_items_proyecto` |
| **`RecalculoFinancieroService`** | **NO EXISTE** | **Pendiente de crear** |

### 1.5 Endpoints actuales (proyectos)

40 rutas bajo `/api/proyectos`. Los **5 endpoints faltantes** para reactividad:

| Endpoint | Método | Estado |
|----------|--------|--------|
| `/api/proyectos/{id}/porcentajes-financieros` | PATCH | **FALTA** |
| `/api/proyectos/{id}/items/{itemId}/producto-contractual` | PATCH | **FALTA** |
| `/api/proyectos/{id}/items/{itemId}/cantidad` | PATCH | **FALTA** |
| `/api/proyectos/{id}/items/asignacion-automatica` | POST | **FALTA** |
| `/api/proyectos/{id}/matriz-items-productos` | GET | **FALTA** |

### 1.6 Frontend — estado actual

| Componente | Archivo | Estado |
|------------|---------|--------|
| `SaludFinancieraCard` | `DetalleProyecto.jsx:168` | Read-only. **Requiere modo edición inline.** |
| `FinanzasSection` | `DetalleProyecto.jsx:259` | Read-only (solo flujo de cobro). **OK por ahora.** |
| `MatrizItemsProductos` | **NO EXISTE** | **Pendiente de crear.** |
| `proyectoService` | `services/proyectoService.js` | No tiene `actualizarPorcentajesFinancieros`, `obtenerMatriz*`, `asignarItemAProducto` |

- **Sin Zustand store.** Estado manejado por React Context + `useState` local. Se mantiene así — Zustand no está en el proyecto y añadirlo solo para este módulo sería exceso.

---

## 2. Análisis de Impacto

### 2.1 Qué NO necesita migración
- `monto_fijo_*` columns: YA EXISTEN como `presupuesto_mano_obra/gastos_generales/utilidad_esperada` (cuando `usa_monto_fijo_*=true` el valor en `presupuesto_*` ES el monto fijo).
- `salud_financiera`: columna añadida en sesión anterior.
- `producto_contractual_id` en `presupuesto_items_proyecto`: YA EXISTE (apunta a legacy).

### 2.2 Qué SÍ necesita migración
- `hito_cobro_id` nullable FK en `presupuesto_items_proyecto` → `hitos_cobro_proyecto`.

### 2.3 Tests pasando antes de empezar
```
Tests: 248 passed (739 assertions) ✅
```
Cero regresiones permitidas al finalizar.

---

## 3. Plan de Implementación

### PASO 2 — Backend
1. Migración `add_hito_cobro_id_to_presupuesto_items_proyecto`
2. Actualizar `PresupuestoItemProyecto` model (fillable + relación)
3. Crear `RecalculoFinancieroService` con 4 métodos
4. Crear `RecalculoFinancieroController` (rutas nuevas)
5. Registrar 5 rutas en `api.php`

### PASO 3 — Frontend
1. `SaludFinancieraCard` → modo edición inline (% / monto fijo toggle)
2. `MatrizItemsProductos.jsx` → nueva vista embebida en DetalleProyecto
3. `proyectoService.js` → 5 nuevos métodos de API

### PASO 4 — Tests
1. `ReactividadFinancieraTest.php` (5 tests)
2. `MatrizItemsProductosTest.php` (6 tests)
3. `ReactividadEndToEndTest.php` (3 tests)
4. Todos verdes + regresión 0

---

## 4. Restricciones No Negociables

- Recálculos < 1 segundo
- Transacciones para cambios multi-tabla
- Permisos integrados (`proyectos.editar`)
- Optimistic UI con rollback en frontend
- Sin N+1 (eager loading agresivo)
- Sin tests pasando → sin cierre
