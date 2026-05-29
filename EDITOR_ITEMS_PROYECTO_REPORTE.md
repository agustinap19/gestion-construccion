# Reporte — Editor de Items del Proyecto

## Diagnóstico inicial

### Problema de consistencia detectado
El modal de Entrega Social leía la receta desde **la biblioteca global** (`recetas_item`), ignorando cualquier override existente. Esto causaba que:
- La tabla Trazabilidad mostrara un "Planificado" diferente al que sugería el modal
- Los porcentajes de sobre-consumo se calculaban contra coeficientes incorrectos
- No existía mecanismo para personalizar recetas a nivel proyecto/vivienda con jerarquía

### Fuentes de verdad antes del fix
| Flujo | Fuente | Respeta overrides |
|---|---|---|
| Consolidado/Trazabilidad | `getRecetaEfectiva()` (privado) | ✅ overrides_recetas_proyecto |
| Modal entrega recetaConStock | receta global directa | ❌ No |
| ValidarConsumo / DetectarModalidad | `getCantidadPlanificadaMaterial` | ❌ No |

---

## Tablas creadas

### `overrides_items_proyecto`
Snapshot editable con jerarquía de 3 niveles:
- `nivel='tipologia'` + `vivienda_id=NULL` → aplica a todas las viviendas del proyecto
- `nivel='vivienda'` + `vivienda_id=X` → aplica solo a esa vivienda
- `UNIQUE(proyecto_id, item_constructivo_id, material_id, vivienda_id)`

### `historial_cambios_items_proyecto`
Auditoría completa: `tipo_cambio`, `pip_id`, `vivienda_id`, `valores_antes`, `valores_despues`, `descripcion`

---

## RecetaResolverService — Jerarquía documentada

```
RecetaResolverService::resolver(itemConstructivoId, proyectoId, viviendaId)

Orden de precedencia:
  1. overrides_items_proyecto WHERE nivel='vivienda' AND vivienda_id=X
     → fuente: 'vivienda'
  2. overrides_items_proyecto WHERE nivel='tipologia' AND vivienda_id=NULL
     → fuente: 'tipologia'
  3. recetas_item (biblioteca global)
     → fuente: 'global'

Retorna: Collection<{material_id, cantidad_por_unidad_base, fuente, unidad_material, material}>
```

**Regla**: Nadie lee `recetas_item` directamente en contexto de proyecto. Todo pasa por `RecetaResolverService`.

---

## Endpoints implementados

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/proyectos/{id}/items-config` | `ver` | Listado con receta resuelta + fuentes |
| POST | `/proyectos/{id}/items-config` | `gestionar` | Agregar ítem (biblioteca o especial) |
| PATCH | `/proyectos/{id}/items-config/{pipId}/cantidad` | `gestionar` | Actualizar cantidad planificada |
| DELETE | `/proyectos/{id}/items-config/{pipId}` | `gestionar` | Quitar ítem (bloqueado si tiene entregas) |
| PUT | `/proyectos/{id}/items-config/override-tipologia` | `overrides_receta.aprobar` | Override a nivel tipología |
| PUT | `/proyectos/{id}/items-config/override-vivienda` | `overrides_receta.aprobar` | Override a nivel vivienda |
| POST | `/proyectos/{id}/items-config/preview-impacto` | `ver` | Preview de impacto antes de confirmar |
| POST | `/proyectos/{id}/items-config/actualizar-recetas` | `bloquear` | Reset tipología → receta global |
| GET | `/proyectos/{id}/items-config/historial` | `ver` | Historial de cambios con auditoría |

---

## Componentes frontend

### `ItemsProyecto.jsx` — `/dashboard/proyectos/:id/items`
- Header con botón "Actualizar recetas" (solo gerente)
- Advertencia de impacto
- Tabs: **Por tipología** | **Por vivienda individual**
- Selector de vivienda en tab "vivienda"
- `FilaItem` con:
  - Cantidad planificada editable inline
  - Receta expandible con `fuente` de cada material
  - Botón editar receta (modal `OverrideRecetaModal`)
  - Botón eliminar (con confirmación)
- Botón "+ Agregar ítem" (modal `AgregarItemModal` con modos biblioteca/especial)
- Modal confirmación "Actualizar recetas"

### `EntregaSocialModal.jsx` — badge fuente
- Campo `fuente` guardado en cada línea al cargar `receta-con-stock`
- Badge "✦ Receta personalizada" (ámbar=vivienda, violeta=tipología) junto al nombre del material
- Informa al almacenero que este proyecto tiene especificaciones propias

### Ruta nueva en `App.jsx`
```jsx
<Route path="/dashboard/proyectos/:id/items" element={<ItemsProyecto />} />
```

### Botón en `DetalleProyecto.jsx`
Botón "Configurar ítems del proyecto" visible para usuarios con `canEdit`, enlaza a `/dashboard/proyectos/:id/items`.

---

## Tests en verde

```
Tests: 23 passed (SnapshotConsistencia + EditorItemsProyecto + PermisosEditor + ActualizarRecetas)
+ 17 passed (tests anteriores: MaterialesConStock + ModalEntregaSocial + ModalidadAutomatica)
= 40 TOTAL en verde (158 assertions)
```

| Suite | Tests |
|---|---|
| `SnapshotConsistenciaTest` | 5 ✅ |
| `EditorItemsProyectoTest` | 10 ✅ |
| `PermisosEditorTest` | 4 ✅ |
| `ActualizarRecetasTest` | 4 ✅ |

---

## Archivos creados/modificados

### Nuevos
- `database/migrations/2026_05_29_032240_create_overrides_items_proyecto_table.php`
- `database/migrations/2026_05_29_032241_create_historial_cambios_items_proyecto_table.php`
- `app/Models/OverrideItemProyecto.php`
- `app/Models/HistorialCambioItem.php`
- `app/Services/Almacenes/RecetaResolverService.php`
- `app/Http/Controllers/Api/ItemsProyectoController.php`
- `resources/js/pages/admin/proyectos/ItemsProyecto.jsx`
- `resources/js/services/itemsProyectoService.js`
- `tests/Feature/Proyectos/EditorItemsTestTrait.php`
- `tests/Feature/Proyectos/SnapshotConsistenciaTest.php`
- `tests/Feature/Proyectos/EditorItemsProyectoTest.php`
- `tests/Feature/Proyectos/PermisosEditorTest.php`
- `tests/Feature/Proyectos/ActualizarRecetasTest.php`

### Modificados
- `routes/api.php` — 9 rutas nuevas del editor
- `app/Http/Controllers/Api/PresupuestoItemsProyectoController.php` — inyectar RecetaResolverService, fix `recetaConStock` + campo `fuente`
- `app/Services/Almacenes/EntregaService.php` — inyectar RecetaResolverService, fix `getCantidadPlanificadaMaterial`
- `app/Services/Almacenes/PresupuestoAutomaticoService.php` — `getRecetaEfectiva` delega al resolver
- `resources/js/components/App.jsx` — ruta `/items`
- `resources/js/pages/admin/proyectos/DetalleProyecto.jsx` — botón "Configurar ítems"
- `resources/js/pages/admin/almacenes/EntregaSocialModal.jsx` — badge fuente

---

## Checklist manual
- [x] Migración aplicada: `php artisan migrate`
- [x] Ruta `/dashboard/proyectos/:id/items` accesible
- [x] Tab "Por tipología" lista ítems con cantidad editable
- [x] Tab "Por vivienda individual" con selector de vivienda
- [x] Override tipología → badge "Receta personalizada" en modal entrega
- [x] Override vivienda → badge "Receta personalizada" (color ámbar) en modal entrega
- [x] Jerarquía vivienda > tipología > global verificada en tests
- [x] Quitar ítem con entregas → error claro
- [x] Ítem especial → aparece en listado de vivienda
- [x] "Actualizar recetas" limpia tipología, conserva vivienda
- [x] Historial registra cada cambio con valores antes/después
- [x] Solo gerente puede actualizar recetas y aprobar overrides
- [x] Admin proyecto puede ver pero no cambiar recetas

## Comando de tests
```bash
php artisan test --filter="SnapshotConsistencia|EditorItemsProyecto|PermisosEditor|ActualizarRecetas"
# Tests: 23 passed (76 assertions) ✅
```
