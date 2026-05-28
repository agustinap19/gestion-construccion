# Reporte de Implementación — Sub-fase B: Dashboard Individual del Proyecto

**Fecha:** 2026-05-21  
**Proyecto:** CA & KANAGF S.R.L. — Sistema ERP de Gestión de Construcción  
**Rama:** develop  
**Estado:** COMPLETADO ✓

---

## Resumen Ejecutivo

Se implementó el **Dashboard Individual del Proyecto** (Sub-fase B), convirtiendo la vista `/proyectos/:id` de una interfaz tabular básica a un workspace completo estilo Linear/Notion con Gantt CSS-only, cards de resumen, acordeones de seguimiento técnico y secciones placeholder para sub-fases futuras.

---

## Archivos Modificados

### Backend

| Archivo | Tipo | Descripción |
|---|---|---|
| `app/Models/FaseProyecto.php` | Modificado | Añadida relación `itemsChecklist()` |
| `app/Models/Vivienda.php` | Modificado | Añadida relación `itemsChecklist()` |
| `app/Models/Proyecto.php` | Modificado | Añadida relación `hitos()` |
| `app/Services/Proyectos/CalculadoraAvanceService.php` | **Nuevo** | Servicio de cálculo de datos del dashboard sin N+1 |
| `app/Services/Proyectos/ProyectoService.php` | Modificado | Inyección de `CalculadoraAvanceService`, método `obtenerDashboard()` |
| `app/Http/Controllers/Api/ProyectoController.php` | Modificado | Métodos `dashboard()` y `exportar()` (PDF + CSV) |
| `resources/views/exports/avance_proyecto.blade.php` | **Nuevo** | Template DomPDF para exportación PDF |
| `routes/api.php` | Modificado | Rutas `GET /{id}/dashboard` y `GET /{id}/exportar` |

### Tests

| Archivo | Tipo | Descripción |
|---|---|---|
| `tests/Feature/Proyectos/Dashboard/ProyectoDashboardTest.php` | **Nuevo** | 16 tests de integración |

### Frontend

| Archivo | Tipo | Descripción |
|---|---|---|
| `resources/js/pages/admin/proyectos/DetalleProyecto.jsx` | **Reescrito** | Workspace dashboard completo |
| `resources/js/pages/admin/proyectos/AlmacenProyecto.jsx` | **Nuevo** | Placeholder Sub-fase C (almacén) |
| `resources/js/pages/admin/proyectos/BeneficiariosProyecto.jsx` | **Nuevo** | Placeholder Sub-fase C (beneficiarios) |
| `resources/js/services/proyectoService.js` | Modificado | Métodos `dashboard()` y `urlExportar()` |
| `resources/js/components/App.jsx` | Modificado | Rutas `:id/almacen` y `:id/beneficiarios` |
| `resources/js/components/icons/Icons.jsx` | Modificado | Añadidos `Table2`, `Layers`, `Wrench`, `Flag` |
| `resources/js/context/AuthContext.jsx` | Modificado | `hasPermission()` respeta `es_admin_central` |

---

## Arquitectura Backend

### `CalculadoraAvanceService`

Servicio dedicado a construir todos los datos del dashboard en una sola pasada, cargando relaciones con eager loading para evitar N+1.

**Método principal:** `calcularDashboard(Proyecto $proyecto): array`

**Estructura de retorno:**
```
avance:
  global                  float   — promedio de avance de unidades
  dias_transcurridos      int     — desde fecha_inicio_planificada hasta hoy
  dias_totales            int|null — duración planificada total
  porcentaje_plazo        float   — posición en el tiempo (%)
  hay_retraso             bool    — avance < porcentaje_plazo
  unidades_completadas    int
  total_unidades          int
  avance_por_unidad[]     array   — cada vivienda/fase con checklist

gantt:
  fecha_inicio            string
  fecha_fin               string|null
  hoy                     string
  pos_hoy                 float   — % para la línea "hoy" en el Gantt
  items[]                 array   — con left/width para CSS absolute

almacen:
  existe                  bool
  codigo                  string|null
  nombre                  string|null
  movimientos_mes         int     — siempre 0 en Sub-fase B

beneficiarios_resumen:   null (privado) | objeto (social)
  total_registrados       int
  cupo_total              int
  cupos_restantes         int
  ultimos[]               array   — últimos 5 registrados

hitos_proximos[]          array   — próximos 5 hitos ordenados por fecha
```

**Lógica de avance:**
- **Social:** `AVG(porcentaje_avance)` de `viviendas` del proyecto
- **Privado:** `AVG(avance_porcentaje)` de `fases_proyecto` del proyecto

**Lógica de Gantt:**
- **Social:** barras posicionadas por acumulación de porcentaje contractual sobre el span total del proyecto
- **Privado:** barras posicionadas por `fecha_inicio_planificada` / `fecha_fin_planificada` relativas al span del proyecto
- `pos_hoy = (dias_transcurridos / dias_totales) * 100` — línea vertical "hoy"

---

## Arquitectura Frontend — `DetalleProyecto.jsx`

### Secciones implementadas

1. **Hero Header** (sticky)
   - Nombre del proyecto, chip de estado, código
   - Barra de progreso de avance global con porcentaje
   - Timeline bar (días transcurridos vs total)
   - Botones: Cambiar estado, Exportar (dropdown PDF/CSV), Editar
   - Metadatos: contraparte, responsable, zona, fechas

2. **Gantt CSS-Only**
   - Barras `position: absolute` con `left` y `width` en % calculados en backend
   - Línea "hoy" vertical en `pos_hoy`%
   - Click en barra → `EditarFaseModal`
   - Botones de exportar dentro del panel

3. **Dos columnas (lg)**
   - Izquierda: `AlmacenCard` → navega a `/dashboard/proyectos/:id/almacen`
   - Derecha: `BeneficiariosCard` (social) o `HitosCard` (privado)

4. **Seguimiento Técnico**
   - `UnidadCard` con acordeón por vivienda (social) o fase (privado)
   - Barra de avance por unidad
   - Checklist items con estado (completado/pendiente/en_progreso)

5. **Placeholders Sub-fases**
   - Personal asignado (Sub-fase B2)
   - Asistencia / Parte diario (Sub-fase D)
   - Modificatorios contractuales (Sub-fase F)

### Modales implementados

- `CambiarEstadoModal` — PATCH `/api/proyectos/:id/estado`
- `EditarFaseModal` — PUT `/api/fases/:id` (nombre/fechas) + PATCH `/api/fases/:id/avance`
- `ReporteTecnicoModal` — Placeholder Sub-fase E

### Exportación

- `ExportarDropdown` abre `window.open('/api/proyectos/:id/exportar?tipo=pdf|excel', '_blank')`
- El endpoint devuelve PDF real (DomPDF) o CSV válido
- Layout del PDF marcado como "borrador Sub-fase E" — el layout definitivo se construye en Sub-fase E

---

## Rutas API Añadidas

```
GET  /api/proyectos/{id}/dashboard    → ProyectoController@dashboard
GET  /api/proyectos/{id}/exportar     → ProyectoController@exportar
                                        ?tipo=pdf  → application/pdf
                                        ?tipo=excel → text/csv
```

Ambas bajo `auth:sanctum` + `ForzarCambioPassword`.

---

## Rutas SPA Añadidas

```
/dashboard/proyectos/:id/almacen         → AlmacenProyecto.jsx
/dashboard/proyectos/:id/beneficiarios   → BeneficiariosProyecto.jsx
```

---

## Resultados de Verificación

| Verificación | Resultado |
|---|---|
| `php artisan migrate:fresh --seed` | ✓ DONE — todas las migraciones y seeders |
| `npm run build` | ✓ built in 5.99s — 1887 modules |
| `php artisan test --filter=ProyectoDashboardTest` | ✓ 16/16 passed (56 assertions) |

### Tests del dashboard (16/16)

1. ✓ `dashboard_endpoint_requiere_autenticacion`
2. ✓ `dashboard_endpoint_retorna_estructura_correcta`
3. ✓ `avance_global_calcula_correctamente_desde_fases`
4. ✓ `avance_global_calcula_correctamente_desde_viviendas`
5. ✓ `beneficiarios_resumen_presente_en_proyecto_social`
6. ✓ `proyecto_privado_no_tiene_beneficiarios_resumen`
7. ✓ `gantt_privado_retorna_fases_con_posiciones`
8. ✓ `almacen_presente_cuando_existe`
9. ✓ `almacen_ausente_cuando_no_existe`
10. ✓ `checklist_items_incluidos_en_avance_por_unidad`
11. ✓ `hitos_proximos_incluidos_y_ordenados`
12. ✓ `usuario_sin_permiso_puede_ver_dashboard`
13. ✓ `editar_fase_actualiza_fechas`
14. ✓ `exportar_pdf_retorna_archivo`
15. ✓ `exportar_excel_retorna_csv`
16. ✓ `conteo_viviendas_y_fases_preciso`

---

## Restricciones Técnicas Respetadas

- **Avance calculado solo en backend** — `CalculadoraAvanceService`, nunca en el frontend
- **Zero N+1** — todas las relaciones cargadas con `with()` en `obtenerDashboard()`
- **Gantt CSS-only** — sin librerías externas, barras con `position: absolute` y porcentajes del backend
- **`hasPermission()` respetado** — acciones de edición solo visibles con permiso `proyectos.editar`
- **Tokens de diseño** — rgba sin clases Tailwind de color crudo, glass premium pattern
- **Rutas placeholder elegantes** — `/almacen` y `/beneficiarios` con diseño "Próximamente" consistente

---

## Pendiente para Sub-fases Futuras

| Sub-fase | Descripción |
|---|---|
| B2 | Personal asignado al proyecto (sección placeholder implementada) |
| C | Gestión completa de beneficiarios con ficha social y mapa |
| C | Gestión de almacén con stock y movimientos |
| D | Asistencia diaria / parte de obra |
| E | Export PDF con layout definitivo (DomPDF + diseño completo) |
| F | Modificatorios contractuales |
