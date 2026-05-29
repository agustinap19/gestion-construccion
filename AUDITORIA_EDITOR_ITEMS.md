# Auditoría — Editor de Items del Proyecto

## 1. Tabla overrides_items_proyecto

**NO EXISTE** con ese nombre. Existe `overrides_recetas_proyecto` con estructura diferente:
- `presupuesto_item_proyecto_id` (FK — por pip específico, no por proyecto+item)
- `material_id`, `cantidad_por_unidad_base`, `justificacion`, `usuario_autorizador_id`
- **Limitación**: solo puede sobreescribir por pip específico, no a nivel tipología (todas las viviendas)
- **NO tiene** campo `nivel` ni `vivienda_id` ni `proyecto_id`

**Lo que hay que crear**: tabla `overrides_items_proyecto` nueva con `proyecto_id`, `item_constructivo_id`, `material_id`, `vivienda_id` (nullable), `nivel` ENUM('tipologia','vivienda').

## 2. Dónde lee la receta el endpoint del modal

**Endpoint**: `GET /presupuesto-items-proyecto/{pipId}/receta-con-stock/{almacenId}`
**Controller**: `PresupuestoItemsProyectoController::recetaConStock()` (línea ~170)

**Lectura directa de receta global (BUG):**
```php
// Línea ~181 — lee SIEMPRE la receta global, nunca checa overrides
$receta = $pip->itemConstructivo?->receta ?? collect();
```

**Segundo lugar con el mismo bug:**
`EntregaService::getCantidadPlanificadaMaterial()` (línea ~550):
```php
// Lee recetas_item directamente, nunca overrides_recetas_proyecto
$receta = $itemPpto->itemConstructivo?->receta()
    ->where('material_id', $materialId)
    ->first();
```

## 3. ¿Existe RecetaResolverService?

**NO EXISTE**. Hay `PresupuestoAutomaticoService::getRecetaEfectiva()` (método privado, línea ~291) que mezcla receta global + `overrides_recetas_proyecto`. Pero:
- Es **privado** — no reutilizable
- Solo maneja `overrides_recetas_proyecto` (por pip) — no el nuevo esquema de jerarquía tipología/vivienda
- Solo se usa para el consolidado, NO para el modal ni la validación

## 4. Vista /proyectos/{id}/items

**NO EXISTE**. Rutas existentes en `routes/api.php`:
```
/proyectos/{id}/presupuesto-items         ← GET lista, POST/generar
/presupuesto-items/{id}/override          ← POST override por pip
/presupuesto-items-proyecto/{pipId}/receta-con-stock/{almacenId}  ← GET
```
No hay ruta para un editor visual completo.

## 5. Rutas protegidas por rol

**Permisos existentes** relacionados con items:
- `presupuesto_materiales.ver` — GET items (gerente, admin_proyecto, almacenero, finanzas)
- `presupuesto_materiales.gestionar` — generar/recalcular (gerente, admin_proyecto)
- `presupuesto_materiales.bloquear` — solo gerente
- `overrides_receta.aprobar` — aplicar overrides (gerente, admin_proyecto)

**Falta**: permiso de edición granular dentro del editor (admin puede ver pero no cambiar recetas).

## 6. Diagnóstico de inconsistencia

| Flujo | Fuente de receta | ¿Respeta overrides? |
|---|---|---|
| Consolidado/Trazabilidad | `getRecetaEfectiva()` | ✅ Sí (overrides_recetas_proyecto) |
| Modal entrega (recetaConStock) | receta global directa | ❌ No |
| ValidarConsumo | `getCantidadPlanificadaMaterial` | ❌ No |
| DetectarModalidad | `getCantidadPlanificadaMaterial` | ❌ No |

## 7. Plan de implementación

1. Migración `overrides_items_proyecto` (nueva tabla con nivel/vivienda)
2. Modelo `OverrideItemProyecto`
3. `RecetaResolverService` — jerarquía 3 niveles
4. Migración `historial_cambios_items_proyecto` (auditoría)
5. Fix `PresupuestoItemsProyectoController::recetaConStock()` → usar resolver
6. Fix `EntregaService::getCantidadPlanificadaMaterial()` → usar resolver
7. `ItemsProyectoController` — editor CRUD
8. Rutas nuevas
9. React: `ItemsProyecto.jsx` (editor con tabs)
10. Fix badge "Receta personalizada" en modal
