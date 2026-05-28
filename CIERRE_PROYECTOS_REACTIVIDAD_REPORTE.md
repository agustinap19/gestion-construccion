# Cierre — Módulo Proyectos: Reactividad Financiera + Matriz Items×Productos
**CA & KANAGF S.R.L. — Sistema de Gestión de Construcción**
**Fecha:** 2026-05-28 | **Branch:** develop | **Tests:** 262 passed ✅

---

## Resumen Ejecutivo

Se implementó la reactividad financiera total del módulo Proyectos y la nueva Matriz Items×Productos. El admin puede ahora editar los porcentajes financieros directamente desde el dashboard, con recálculo automático de todos los campos en cascada. Los ítems constructivos son asignables a los productos de cobro (P1–P4) mediante una interfaz matricial inline.

**Tests:** 248 → 262 (+14 nuevos). 821 assertions. Cero regresiones.

---

## Cambios Implementados

### PASO 1 — Auditoría

**`AUDITORIA_CIERRE_PROYECTOS.md`** — Documenta el estado previo, gaps detectados, decisiones de diseño y plan de implementación. Hallazgo clave: `presupuesto_items_proyecto` ya tenía `producto_contractual_id` (legacy), se decidió agregar `hito_cobro_id` para el sistema nuevo sin romper la compatibilidad.

---

### PASO 2 — Backend

#### Migración nueva
**`database/migrations/2026_05_28_000001_add_hito_cobro_id_to_presupuesto_items_proyecto.php`**
- Agrega `hito_cobro_id` FK nullable → `hitos_cobro_proyecto` en `presupuesto_items_proyecto`
- Index para performance

#### Modelo actualizado
**`app/Models/PresupuestoItemProyecto.php`**
- `hito_cobro_id` añadido a `$fillable`
- Nuevo método `hitoCobro()` → `belongsTo(HitoCobro::class, 'hito_cobro_id')`

#### Nuevo servicio
**`app/Services/Proyectos/RecalculoFinancieroService.php`**

| Método | Responsabilidad |
|--------|----------------|
| `calcularPresupuestoCompleto(Proyecto, array)` | Recalcula todos los campos financieros desde nuevos porcentajes/montos fijos. Valida umbral mínimo. Actualiza `salud_financiera`. Recalcula `monto_calculado` en HitoCobro. Transacción única. |
| `recalcularMontosComponentes(Proyecto)` | Recalcula `monto_calculado` en todos los HitoCobro del proyecto |
| `recalcularPresupuestoPorProducto(Proyecto)` | Alias semántico de `recalcularMontosComponentes` |
| `validarRentabilidadMinima(Proyecto, pctUtil, justificacion)` | Lanza `ValidationException` si `pctUtil < umbral` sin justificación |
| `asignacionAutomaticaPorCategoria(Proyecto)` | Distribuye ítems equitativamente entre los productos disponibles (heurístico por orden) |
| `obtenerMatriz(Proyecto)` | Retorna hitos, ítems, agrupados por producto, totales |

#### Nuevo controlador
**`app/Http/Controllers/Api/RecalculoFinancieroController.php`**

| Método | Endpoint |
|--------|---------|
| `actualizarPorcentajes` | `PATCH /api/proyectos/{id}/porcentajes-financieros` |
| `obtenerMatriz` | `GET /api/proyectos/{id}/matriz-items-productos` |
| `asignarItemAProducto` | `PATCH /api/proyectos/{id}/items/{itemId}/producto-contractual` |
| `actualizarCantidadItem` | `PATCH /api/proyectos/{id}/items/{itemId}/cantidad` |
| `asignacionAutomatica` | `POST /api/proyectos/{id}/items/asignacion-automatica` |

Todos los endpoints validan permisos (`proyectos.editar` / `proyectos.ver`).

#### Rutas registradas
**`routes/api.php`** — 5 nuevas rutas en el grupo `/proyectos`.

---

### PASO 3 — Frontend

#### `app/Services/proyectoService.js` — 5 nuevos métodos:
- `actualizarPorcentajesFinancieros(id, datos)`
- `obtenerMatrizItemsProductos(id)`
- `asignarItemAProducto(proyectoId, itemId, hitoCobro_id)`
- `actualizarCantidadItem(proyectoId, itemId, cantidad)`
- `asignacionAutomatica(proyectoId)`

#### `SaludFinancieraCard` — ahora editable inline

**Modo lectura:** Igual que antes + botón lápiz (visible solo con `canEdit=true`).

**Modo edición:**
- Inputs para `pctMO`, `pctGG`, `pctUtil`
- Toggle "Monto fijo" por componente (checkbox + input Bs.)
- Preview en vivo de todos los presupuestos calculados con barra coloreada
- Indicador de salud financiera en tiempo real
- Campo de justificación aparece automáticamente cuando `rentPct < 5%`
- Botón Guardar → `PATCH /api/proyectos/{id}/porcentajes-financieros`
- Rollback: si el backend rechaza, el usuario ve el error (no se actualiza localmente)

**Signature:** `<SaludFinancieraCard proyecto={proyecto} canEdit={canEdit} onRefresh={cargar} />`

#### `MatrizItemsProductosSection` — nuevo componente inline en DetalleProyecto

- Se carga con `GET /api/proyectos/{id}/matriz-items-productos`
- Se renderiza solo si hay ítems presupuestados
- Auto-expande si hay ítems sin asignar
- Header colapsable con indicador `X/Y asignados (N%)`
- Botón "Auto-asignar" → `POST /api/proyectos/{id}/items/asignacion-automatica`
- Legend de productos con colores
- Tabla de ítems: nombre, categoría (dot), unidad, cantidad, dropdown de producto
- Dropdown desactivado para usuarios sin `proyectos.editar`
- Posición: entre SeguimientoSection y PresupuestoMaterialesSection

**En DetalleProyecto.jsx:**
```jsx
<MatrizItemsProductosSection proyectoId={id} canEdit={canEdit} />
```

---

### PASO 4 — Tests

| Archivo | Tests | Assertions |
|---------|-------|-----------|
| `ReactividadFinancieraTest.php` | 5 | 12 |
| `MatrizItemsProductosTest.php` | 6 | 17 |
| `ReactividadEndToEndTest.php` | 3 | 12 |
| **Total nuevos** | **14** | **41** |

**Suite completa:** 262 tests, 821 assertions ✅

#### ReactividadFinancieraTest (5 tests)
- `patch_porcentajes_recalcula_presupuesto` — MO/GG/Util/Mat calculados correctamente
- `patch_porcentajes_recalcula_hitos_cobro` — monto_calculado de HitoCobro recalculado
- `patch_porcentajes_actualiza_salud_financiera` — salud_financiera = 'critico' cuando util < umbral
- `patch_porcentajes_baja_rentabilidad_sin_justificacion_retorna_422` — validación umbral
- `patch_monto_fijo_mo_usa_monto_absoluto` — modo monto fijo MO

#### MatrizItemsProductosTest (6 tests)
- `get_matriz_retorna_estructura_correcta` — estructura hitos/items/totales
- `patch_asignar_item_a_producto` — asignación de hito_cobro_id
- `patch_desasignar_item` — null-assignment
- `patch_cantidad_actualiza_item` — update cantidad_planificada
- `post_asignacion_automatica_distribuye_items` — distribución heurística
- `get_matriz_despues_de_asignacion_automatica` — 0 items sin asignar

#### ReactividadEndToEndTest (3 tests)
- `e2e_crear_proyecto_editar_porcentajes_verificar_todo` — flujo completo con verificación downstream
- `e2e_crear_proyecto_asignar_items_verificar_matriz` — ciclo crear→asignar→verificar
- `e2e_toggle_monto_fijo_y_back_a_porcentaje` — toggle MO fijo ↔ porcentaje

---

### PASO 5 — Checklist Manual

| # | Verificación | Mecanismo |
|---|-------------|-----------|
| 1 | Abrir DetalleProyecto de proyecto con datos financieros | Visual |
| 2 | SaludFinancieraCard muestra badge Saludable/Atención/Crítico correcto | Visual |
| 3 | Click lápiz → modo edición inline abre sin recarga de página | Visual |
| 4 | Cambiar porcentaje MO → barra coloreada actualiza en <1 segundo | Visual |
| 5 | Toggle "Monto fijo" → input cambia de % a Bs. | Visual |
| 6 | Rentabilidad < 5% → campo justificación aparece | Visual |
| 7 | Guardar → toast "Presupuesto actualizado" + modo lectura | Visual |
| 8 | MatrizItemsProductosSection aparece si hay ítems presupuestados | Visual |
| 9 | Header colapsable muestra "X/Y asignados" | Visual |
| 10 | Dropdown de producto asigna al guardar | Visual |
| 11 | Botón Auto-asignar distribuye todos los ítems | Visual |
| 12 | Sin permiso `proyectos.editar` → lápiz y dropdowns no aparecen | Visual |

---

## Archivos Modificados / Creados

### Backend
- `app/Models/PresupuestoItemProyecto.php` — `hito_cobro_id` en fillable + relación
- `app/Services/Proyectos/RecalculoFinancieroService.php` *(nuevo)*
- `app/Http/Controllers/Api/RecalculoFinancieroController.php` *(nuevo)*
- `routes/api.php` — 5 nuevas rutas

### Base de datos
- `database/migrations/2026_05_28_000001_add_hito_cobro_id_to_presupuesto_items_proyecto.php` *(nuevo)*

### Frontend
- `resources/js/services/proyectoService.js` — 5 nuevos métodos
- `resources/js/pages/admin/proyectos/DetalleProyecto.jsx` — `SaludFinancieraCard` editable + `MatrizItemsProductosSection` nueva

### Tests
- `tests/Feature/Proyectos/ReactividadFinancieraTest.php` *(nuevo)*
- `tests/Feature/Proyectos/MatrizItemsProductosTest.php` *(nuevo)*
- `tests/Feature/Proyectos/ReactividadEndToEndTest.php` *(nuevo)*

### Documentación
- `AUDITORIA_CIERRE_PROYECTOS.md` *(nuevo)*
- `CIERRE_PROYECTOS_REACTIVIDAD_REPORTE.md` *(este archivo)*

---

## Estado Final de Tests

```
Tests:    262 passed (821 assertions)
```

Todos los módulos mantienen su estado PASS. Cero regresiones. El módulo Proyectos queda completamente funcional. Se puede avanzar al módulo Almacenes.
