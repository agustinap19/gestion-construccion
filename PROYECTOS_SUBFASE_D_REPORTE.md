# Sub-fase D — Seguimiento Técnico de Obra: Reporte de Implementación

**Fecha:** 2026-05-21  
**Estado:** ✅ COMPLETADO — 155 tests en verde, build limpio

---

## Resumen Ejecutivo

La Sub-fase D implementa el módulo completo de **seguimiento técnico en campo** para proyectos de construcción. Los técnicos pueden registrar reportes de obra desde el sitio (con GPS), actualizar el avance de cada ítem del checklist, adjuntar fotos georeferenciadas, reportar incidencias, y exportar PDFs de avance y galería fotográfica. El sistema calcula automáticamente el avance en cascada (ítem → vivienda/fase → proyecto) y notifica al responsable del proyecto en cada reporte.

---

## Archivos Creados / Modificados

### Backend — PHP

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `database/migrations/2026_05_21_143827_subfase_d_seguimiento_tecnico.php` | Nueva | 5 tablas: `items_checklist.porcentaje_avance`, `reportes_tecnicos`, `avances_checklist_reporte`, `fotos_reporte`, `incidencias_reporte` |
| `database/migrations/2026_05_21_152819_rename_url_to_url_accion_in_notificaciones_sistema.php` | Nueva | Fix: renombra `url` → `url_accion` y agrega `leida_en` en `notificaciones_sistema` |
| `app/Models/ReporteTecnico.php` | Nuevo | Modelo con relaciones: proyecto, vivienda, fase, usuario, fotos, incidencias, avancesChecklist; softDeletes |
| `app/Models/FotoReporte.php` | Nuevo | Modelo con fillable y relación `reporte()` |
| `app/Models/IncidenciaReporte.php` | Nuevo | Modelo con fillable, casts y relación `reporte()` |
| `app/Models/AvanceChecklistReporte.php` | Nuevo | Registro histórico de cambios de % por ítem |
| `app/Models/ItemChecklist.php` | Modificado | Agrega `porcentaje_avance` a `$fillable` y `$casts` |
| `app/Services/Proyectos/CalculadoraAvanceService.php` | Modificado | Agrega: `recalcularAvanceVivienda()`, `recalcularAvanceFase()`, `recalcularAvanceProyecto()`, `calcularSalud()`; actualiza `avancePorViviendas()` y `avancePorFases()` para incluir `porcentaje_avance` por ítem |
| `app/Services/Proyectos/ReporteTecnicoService.php` | Nuevo | Servicio principal: listar, crear (con GPS Haversine, cascada, notificación), exportar |
| `app/Http/Controllers/Api/ReporteTecnicoController.php` | Nuevo | 6 endpoints: porUnidad, galeriaProyecto, show, store, exportarAvance, exportarFotos |
| `app/Http/Controllers/Api/SubidaArchivoController.php` | Modificado | Agrega `fotoReporte()`: thumbnail 300×300 con GD, ruta organizada por proyecto/unidad/mes |
| `resources/views/exports/avance_individual.blade.php` | Nuevo | PDF de avance de vivienda: KPIs, checklist con barras de progreso, últimos 5 reportes con fotos |
| `resources/views/exports/reporte_fotografico.blade.php` | Nuevo | PDF galería: fotos agrupadas por reporte con fecha, técnico, geolocalización |
| `routes/api.php` | Modificado | 7 rutas nuevas en `/reportes-tecnicos` y `/upload/foto-reporte` |

### Frontend — React / JS

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `resources/js/services/reporteTecnicoService.js` | Nuevo | Servicio: `listarPorUnidad`, `galeriaProyecto`, `obtener`, `crear`, `subirFoto`, `urlExportarAvance`, `urlExportarFotos` |
| `resources/js/pages/admin/proyectos/DetalleProyecto.jsx` | Modificado | Reemplaza placeholder con modal completo; agrega `SaludChip`, `GaleriaModal`, timeline por unidad, exports PDF por vivienda |

### Tests

| Archivo | Tests | Resultado |
|---------|-------|-----------|
| `tests/Feature/Proyectos/Seguimiento/ReporteTecnicoTest.php` | 9 | ✅ Todos en verde |

---

## Diseño del Schema

### `reportes_tecnicos`
```sql
id, proyecto_id→proyectos, vivienda_id→viviendas (nullable),
fase_id→fases_proyecto (nullable), usuario_id→users,
fecha_reporte DATE, descripcion TEXT, observaciones TEXT,
latitud_tecnico DECIMAL(10,7), longitud_tecnico DECIMAL(10,7),
distancia_vivienda_metros DECIMAL(10,2),
alerta_distancia BOOLEAN (si técnico > 500m de la vivienda),
estado ENUM(enviado, aprobado),
timestamps, deleted_at (softDeletes)
```

### `avances_checklist_reporte`
```sql
id, reporte_id→reportes_tecnicos, item_checklist_id→items_checklist,
porcentaje_anterior DECIMAL(5,2), porcentaje_nuevo DECIMAL(5,2),
notas TEXT, timestamps
```

### `fotos_reporte`
```sql
id, reporte_id, url_original VARCHAR, url_thumbnail VARCHAR,
caption VARCHAR(200), orden INT, latitud/longitud DECIMAL, timestamps
```

### `incidencias_reporte`
```sql
id, reporte_id,
tipo ENUM(clima, social, tecnica, seguridad, otro),
gravedad ENUM(baja, media, alta, critica),
descripcion TEXT, timestamps
```

### `items_checklist` — columna agregada
```sql
porcentaje_avance DECIMAL(5,2) DEFAULT 0
```

---

## Lógica de Negocio

### Recálculo en Cascada
Cada reporte actualiza el `porcentaje_avance` de los ítems de checklist mediante **promedio ponderado**:
```
avance_vivienda = Σ(avance_item × ponderacion) / Σ(ponderaciones)
avance_proyecto = AVG(porcentaje_avance) de todas las viviendas del proyecto
```

### Indicador de Salud
```
diff = porcentaje_plazo - avance_real
al_dia:          diff ≤ 10%  (verde)
retraso_menor:   diff ≤ 25%  (amarillo)
retraso_critico: diff > 25%  (rojo)
```

### Alerta GPS
Fórmula Haversine calcula distancia entre técnico y vivienda. Si `distancia > 500m` → `alerta_distancia = true`. El reporte **no se bloquea**, solo se marca con alerta visible.

### Thumbnail GD
Generación automática de miniatura 300×300 (crop centrado) usando la extensión PHP GD nativa. Si GD no está disponible, solo se guarda el original.

---

## Rutas API

| Método | Endpoint | Acción |
|--------|----------|--------|
| GET | `/api/reportes-tecnicos/unidad/{tipo}/{id}` | Listar reportes por vivienda o fase (paginado) |
| GET | `/api/reportes-tecnicos/proyecto/{id}/galeria` | Fotos del proyecto (filtrable por vivienda, fase, fecha) |
| GET | `/api/reportes-tecnicos/vivienda/{id}/exportar-avance` | Descargar PDF avance individual |
| GET | `/api/reportes-tecnicos/vivienda/{id}/exportar-fotos` | Descargar PDF reporte fotográfico |
| GET | `/api/reportes-tecnicos/{id}` | Obtener reporte completo |
| POST | `/api/reportes-tecnicos` | Crear reporte con fotos, checklist, incidencias |
| POST | `/api/upload/foto-reporte` | Subir foto y generar thumbnail |

---

## Frontend: DetalleProyecto.jsx

### Componentes nuevos / actualizados
- **`SALUD_META` + `SaludChip`**: chip de color en cada unidad con indicador al_dia / retraso_menor / retraso_critico
- **`ReporteTecnicoModal`**: modal scrollable con fecha, GPS, descripción, sliders de % por ítem, subida de fotos (thumbnails en grid), incidencias con tipo/gravedad
- **`UnidadCard`**: timeline lazy-load de reportes, botones "Avance PDF" y "Fotos PDF" para viviendas
- **`GaleriaModal`**: galería fotográfica del proyecto con filtro por fechas, grid con lightbox y lazy load
- **`SeguimientoSection`**: botón "Galería" en header, pasa `pctPlazo` a las cards

### Placeholder removido
El placeholder "Asistencia Técnica / Sub-fase D" fue eliminado del panel "Próximas Funcionalidades".

---

## Tests — Cobertura

| # | Test | Descripción |
|---|------|-------------|
| 1 | `test_registrar_reporte_actualiza_porcentaje_items_checklist` | El POST actualiza `porcentaje_avance` del ítem y crea registro histórico en `avances_checklist_reporte` |
| 2 | `test_recalculo_cascada_actualiza_vivienda_y_proyecto` | Recálculo ponderado actualiza `vivienda.porcentaje_avance` y `proyecto.avance_fisico` |
| 3 | `test_subida_foto_reporte_retorna_url_original_y_thumbnail` | `POST /upload/foto-reporte` retorna `url_original` y genera thumbnail en Storage::fake |
| 4 | `test_gps_lejos_de_vivienda_activa_alerta_sin_bloquear` | Técnico a >500m → `alerta_distancia=1` pero reporte creado con 201 |
| 5 | `test_notificacion_enviada_al_responsable_del_proyecto` | `NotificacionSistema` creada para `responsable_id` con título "Nuevo reporte técnico" |
| 6 | `test_exportar_avance_individual_retorna_pdf` | GET exportar-avance retorna 200 con Content-Type: application/pdf |
| 7 | `test_exportar_reporte_fotografico_retorna_pdf` | GET exportar-fotos retorna 200 con Content-Type: application/pdf |
| 8 | `test_calculo_indicador_de_salud_coincide` | `CalculadoraAvanceService::calcularSalud()` retorna al_dia / retraso_menor / retraso_critico según diff |
| 9 | `test_usuario_no_autenticado_no_puede_registrar_reporte` | Sin token → 401 Unauthorized |

**Resultado:** 155/155 tests en verde (9 nuevos + 146 existentes)

---

## Bug Fix Incluido: `notificaciones_sistema`

Se descubrió una inconsistencia pre-existente: la columna de la tabla era `url` pero el modelo y servicios usaban `url_accion`. También faltaba la columna `leida_en`.

**Fix:** Migración `2026_05_21_152819_rename_url_to_url_accion_in_notificaciones_sistema.php` renombra `url` → `url_accion` y agrega `leida_en TIMESTAMP NULL`.

---

## Próximos pasos sugeridos

- **Sub-fase E:** Planillas de pago y desglose financiero por vivienda
- **Sub-fase F:** Órdenes de cambio y modificatorios al contrato
- **Sub-fase B2:** Asignación de personal específico a proyectos con roles y turnos
