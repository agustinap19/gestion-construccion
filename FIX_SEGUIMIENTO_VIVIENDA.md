# Fix: Seguimiento de Vivienda — Items Reales desde presupuesto_items_proyecto

## Diagnóstico

**Archivo con categorías genéricas hardcodeadas:**
- `resources/js/pages/admin/proyectos/DetalleProyecto.jsx` — líneas 1282-1313
- Consumía `unidad.items_checklist` construido en backend desde tabla `items_checklist`

**Backend responsable del problema:**
- `app/Services/Proyectos/CalculadoraAvanceService.php:265` — método `avancePorViviendas()`
- Usaba `$v->itemsChecklist` → relación `hasMany(ItemChecklist::class, 'vivienda_id')`
- Tabla `items_checklist`: 90 registros con 9 categorías genéricas por vivienda (11.11% cada una)

**Items reales en BD:**
- Tabla `presupuesto_items_proyecto`: 90 registros para viviendas 9, 10, 11
- 30 items reales por vivienda con nombres como "Replanteo y trazado de obra", "Excavación manual de zapatas"
- Ponderaciones reales (1%–5%) en lugar de uniforme 11.11%

## Endpoints creados

### GET `/api/viviendas/{id}/checklist`
- Lee de `presupuesto_items_proyecto WHERE vivienda_id = X`
- Eager loading completo: `itemConstructivo.categoria`, `productoContractual`
- `avance_total` = suma ponderada: `SUM(avance × ponderacion) / SUM(ponderacion)`
- `material_entregado_porcentaje` = ratio avg de materiales entregados vs receta (desde `movimientos_almacen + overrides_items_proyecto`)
- `puede_marcar_avance` basado en roles: tecnico, admin_proyecto, gerente, super_admin, admin_central

### PATCH `/api/viviendas/{viviendaId}/checklist/{itemId}/avance`
- Valida roles con permiso de marcar avance → 403 si no autorizado
- Valida `porcentaje_avance: 0–100`
- Actualiza `estado_ejecucion`: 100→terminado, 1-99→en_proceso, 0→pendiente
- Si avance=100 y material entregado < 80%: incluye `advertencia` en respuesta (no bloqueante)
- Recalcula `porcentaje_avance` de la vivienda (suma ponderada desde PIPs)
- Recalcula `avance_fisico` del proyecto (promedio de viviendas)
- Registra auditoría en `historial_cambios_items_proyecto` con valor anterior y nuevo

## Componente reemplazado

**Archivo creado:** `resources/js/pages/admin/proyectos/ChecklistVivienda.jsx`

- Carga `GET /api/viviendas/{id}/checklist` al montar
- Lista plana ordenada por `orden`, sin agrupación por categoría
- Cada item muestra: código, nombre, chip de categoría, cantidad+unidad, ponderación, barra de progreso animada (framer-motion), chip de estado, % material entregado
- Marcar avance: botones rápidos (0/25/50/75/100%) + input numérico → PATCH inmediato
- Avance total de la vivienda se actualiza en tiempo real
- Advertencia de material insuficiente inline bajo el item (⚠)
- Controles deshabilitados si `puede_marcar_avance = false`
- Skeleton durante carga

**Integración en:** `resources/js/pages/admin/proyectos/DetalleProyecto.jsx`
- Condición: si `esSocial` → `<ChecklistVivienda viviendaId={unidad.id} />`
- Si no es social (fases) → mantiene el checklist de `items_checklist` original

## Tests — 10/10 verde

```
PASS  Tests\Feature\Proyectos\ChecklistViviendaTest
✓ endpoint retorna items reales de la vivienda no categorias genericas         15.62s
✓ avance total es suma ponderada no promedio simple                             0.07s
✓ marcar item al 100 cambia estado a terminado                                  0.11s
✓ marcar item entre 1 y 99 cambia estado a en proceso                          0.08s
✓ marcar item a 0 cambia estado a pendiente                                     0.08s
✓ marcar avance recalcula avance vivienda                                       0.08s
✓ marcar avance recalcula avance proyecto                                       0.12s
✓ advertencia si avance 100 con material insuficiente                           0.19s
✓ usuario sin permiso no puede marcar avance                                    0.06s
✓ auditoria registra cambio de avance                                           0.08s

Tests:   10 passed (32 assertions)
Duration: 16.77s
```

## Archivos modificados / creados

| Archivo | Acción |
|---|---|
| `app/Http/Controllers/Api/ChecklistViviendaController.php` | CREADO |
| `resources/js/pages/admin/proyectos/ChecklistVivienda.jsx` | CREADO |
| `tests/Feature/Proyectos/ChecklistViviendaTest.php` | CREADO |
| `routes/api.php` | MODIFICADO (2 rutas nuevas) |
| `resources/js/pages/admin/proyectos/DetalleProyecto.jsx` | MODIFICADO (import + reemplazo checklist) |
