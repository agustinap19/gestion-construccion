# Fix: Reporte de Avance Conectado a Items Reales

## Diagnóstico

| Problema | Detalle |
|---|---|
| Formulario de reporte | `ReporteTecnicoModal` usaba `items_checklist` (categorías genéricas) |
| Selector de items | Cargaba `unidad.items_checklist` no `presupuesto_items_proyecto` |
| Botones de avance en checklist | `BOTONES_RAPIDOS = [0,25,50,75,100]` — PATCH directo sin foto |
| Tabla de reportes | No existía tabla vinculada a PIP |

## Cascada implementada

```
POST /viviendas/{id}/reportes-avance (multipart/form-data, foto obligatoria)
    │
    ├─► ReporteAvance.create (registros_avance table)
    ├─► PresupuestoItemProyecto.update (porcentaje_avance, estado_ejecucion)
    ├─► HistorialCambioItem.create (auditoría con valores anterior/nuevo)
    ├─► Vivienda.porcentaje_avance ← suma ponderada de todos sus PIPs
    ├─► Proyecto.avance_fisico ← promedio de avances de viviendas
    ├─► ProductoContractual.estado ← 'listo_para_cobro' si todos sus items al 100%
    └─► NotificacionSistema → responsable del proyecto
```

## Endpoints creados/modificados

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/viviendas/{id}/checklist` | GET | Solo lectura — items reales |
| `/api/viviendas/{id}/reportes-avance` | POST | Registrar avance (foto obligatoria) |
| `/api/viviendas/{id}/reportes-avance` | GET | Historial de reportes por vivienda/item |
| ~~`/api/viviendas/{id}/checklist/{itemId}/avance`~~ | ~~PATCH~~ | **Eliminado** |

## Archivos creados/modificados

| Archivo | Acción |
|---|---|
| `database/migrations/2026_05_29_175138_create_reportes_avance_table.php` | CREADO |
| `database/migrations/2026_05_29_202831_add_listo_para_cobro_to_productos_contractuales.php` | CREADO |
| `app/Models/ReporteAvance.php` | CREADO |
| `app/Services/Proyectos/ReporteAvanceService.php` | CREADO |
| `app/Http/Controllers/Api/ReporteAvanceController.php` | CREADO |
| `resources/js/pages/admin/proyectos/FormularioReporteAvance.jsx` | CREADO |
| `resources/js/pages/admin/proyectos/ChecklistVivienda.jsx` | REESCRITO (solo lectura + drawer historial) |
| `routes/api.php` | MODIFICADO (ruta PATCH eliminada, POST/GET nuevas) |
| `resources/js/pages/admin/proyectos/DetalleProyecto.jsx` | MODIFICADO (viviendaCodigo prop) |
| `tests/Feature/Proyectos/ReporteAvanceTest.php` | CREADO |
| `tests/Feature/Proyectos/ChecklistViviendaTest.php` | ACTUALIZADO |

## Tests — 16/16 verde

```
PASS  Tests\Feature\Proyectos\ChecklistViviendaTest
✓ endpoint retorna items reales de la vivienda no categorias genericas     16.38s
✓ avance total es suma ponderada no promedio simple                          0.08s
✓ checklist es solo lectura patch directo no existe                          0.08s
✓ checklist retorna puede marcar avance segun rol                            0.10s
✓ historial de reportes disponible por vivienda                              0.06s

PASS  Tests\Feature\Proyectos\ReporteAvanceTest
✓ registrar reporte sin foto es rechazado                                    0.11s
✓ registrar reporte con foto actualiza avance del item                       0.19s
✓ registrar reporte al 100 marca item terminado                              0.13s
✓ cascada actualiza avance vivienda                                          0.14s
✓ cascada actualiza avance proyecto                                          0.12s
✓ producto se marca listo si todos sus items al 100                          0.21s
✓ retrogradar sin justificacion es rechazado                                 0.10s
✓ retrogradar con justificacion funciona                                     0.12s
✓ historial retorna reportes del item ordenados                              0.25s
✓ checklist dashboard no tiene endpoint para marcar avance directo           0.10s
✓ auditoria registra reporte con usuario fecha y valores                     0.14s

Tests:   16 passed (51 assertions)
Duration: 18.57s
```

## Comportamiento del nuevo flujo

1. **Técnico abre la vivienda** → ve checklist con barras de progreso (solo lectura)
2. **Click "+ Registrar avance"** → modal flotante
3. **Selecciona ítem** (selector carga desde `/checklist` con items reales: ITM-001, ITM-002...)
4. **Ajusta porcentaje** con slider + input
5. **Sube foto** (obligatoria, `capture="environment"` para cámara móvil)
6. **Agrega observación** (obligatoria si retrograda)
7. **Guarda** → cascada atómica en transacción
8. **Checklist actualiza en tiempo real** sin recargar página
9. **"Ver N reportes"** en cada item → drawer con historial fotográfico

## Reglas de negocio implementadas

- ❌ Sin foto → no hay reporte (422 con mensaje claro)
- ⚠ Retrogradar sin observación → rechazado (422)
- ✅ Retrogradar con observación → permitido
- 🏷 100% → estado "terminado"; 1-99% → "en_proceso"; 0% → "pendiente"
- 🔔 Todos items de producto al 100% → producto "listo_para_cobro" + notificación
- 🔒 Sin rol técnico/admin/gerente → 403
