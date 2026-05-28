# Sub-fase E — Sistema Transversal de Exportación

## Filosofía

El usuario nunca va a un "módulo de reportes". Cada lista tiene su propio botón de exportación embebido. El botón lleva los filtros activos: lo que ves en pantalla es exactamente lo que se exporta.

---

## Arquitectura

```
┌─────────────────────────────────────────────┐
│  React Page  (ListaProyectos, etc.)         │
│      ↓  usa                                  │
│  <BotonExportar url params formatos />      │
│      ↓  llama                               │
│  GET /api/exportar/{recurso}?formato=...    │
│      ↓  enruta a                            │
│  ExportacionController (9 métodos)         │
│      ↓  delega a                            │
│  ExportacionService  (pdf | excel)         │
│        ↙              ↘                    │
│  DomPDF (Blade views)  maatwebsite/excel   │
│        ↘              ↙                    │
│  LogExportacion  (auditoría)               │
└─────────────────────────────────────────────┘
```

**Async ZIP** (actas masivas):
```
POST /api/exportar/proyectos/{id}/actas-zip
    → GenerarZipActasJob::dispatch()
        → genera PDFs por vivienda
        → empaqueta ZIP en storage/app/exports/actas/{jobId}/
        → NotificacionSistema con link de descarga
```

---

## Archivos creados / modificados

### Backend

| Archivo | Descripción |
|---|---|
| `database/migrations/2026_05_21_170000_create_logs_exportacion_table.php` | Tabla audit de exportaciones |
| `app/Models/LogExportacion.php` | Modelo del log |
| `app/Exports/BaseExport.php` | Clase base abstracta para todos los exports Excel |
| `app/Exports/ProyectosExport.php` | Excel proyectos (12 columnas) |
| `app/Exports/BeneficiariosExport.php` | Excel beneficiarios (13 columnas) |
| `app/Exports/PersonalExport.php` | Excel personal (15 columnas) |
| `app/Exports/UsuariosExport.php` | Excel usuarios (11 columnas) |
| `app/Exports/AvanceProyectoExport.php` | Excel avance por unidad (8 columnas) |
| `app/Services/ExportacionService.php` | Dispatcher unificado PDF + Excel + audit |
| `app/Http/Controllers/Api/ExportacionController.php` | 9 endpoints de exportación |
| `app/Jobs/GenerarZipActasJob.php` | Job asíncrono para ZIP de actas masivas |
| `routes/api.php` | 9 rutas bajo prefijo `/exportar` |

### Vistas Blade (PDF)

| Vista | Descripción |
|---|---|
| `resources/views/exports/_base_styles.blade.php` | CSS compartido: header, KPIs, badges, footer |
| `resources/views/exports/lista_proyectos.blade.php` | Lista paginada de proyectos con indicadores |
| `resources/views/exports/lista_personal.blade.php` | Lista de personal con estado laboral |
| `resources/views/exports/lista_usuarios.blade.php` | Lista de usuarios con 2FA y roles |
| `resources/views/exports/ficha_beneficiario.blade.php` | Ficha individual + foto + firma |
| `resources/views/exports/acta_entrega_vivienda.blade.php` | Acta oficial con checklist y 2 firmas |
| `resources/views/exports/matriz_roles_permisos.blade.php` | Matriz landscape agrupada por módulo |
| `resources/views/exports/avance_proyecto.blade.php` | Planilla de avance con progreso por unidad |
| `resources/views/exports/lista_beneficiarios.blade.php` | Lista de beneficiarios por proyecto |

### Frontend

| Archivo | Descripción |
|---|---|
| `resources/js/components/ui/BotonExportar.jsx` | Componente reusable (glass, dropdown, spinner) |
| `resources/js/pages/admin/proyectos/ListaProyectos.jsx` | + BotonExportar (PDF + Excel) en toolbar |
| `resources/js/pages/admin/proyectos/DetalleProyecto.jsx` | ExportarDropdown migrado a BotonExportar |
| `resources/js/pages/admin/proyectos/BeneficiariosProyecto.jsx` | Export manual reemplazado por BotonExportar |
| `resources/js/pages/admin/personal/ListaPersonal.jsx` | + BotonExportar en header actions |
| `resources/js/pages/admin/Usuarios/ListaUsuarios.jsx` | + BotonExportar en header actions |
| `resources/js/pages/admin/roles/ListaRoles.jsx` | + BotonExportar "Matriz PDF" en header |

---

## Reportes implementados

| Endpoint | Formatos | Filtros |
|---|---|---|
| `GET /api/exportar/proyectos` | PDF, Excel | estado, categoría |
| `GET /api/exportar/proyectos/{id}/avance` | PDF, Excel | — |
| `GET /api/exportar/proyectos/{id}/beneficiarios` | PDF, Excel | estado_seleccion, comunidad |
| `POST /api/exportar/proyectos/{id}/actas-zip` | ZIP async | — (todas las entregadas) |
| `GET /api/exportar/beneficiarios/{id}/ficha` | PDF | — |
| `GET /api/exportar/viviendas/{id}/acta` | PDF | — |
| `GET /api/exportar/personal` | PDF, Excel | estado_laboral, tipo |
| `GET /api/exportar/usuarios` | PDF, Excel | estado, rol_id |
| `GET /api/exportar/roles/matriz` | PDF | — |

---

## Uso del componente `<BotonExportar />`

### Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `url` | `string` | — | Endpoint relativo, ej: `'/exportar/proyectos'` |
| `params` | `object` | `{}` | Query params adicionales (filtros activos) |
| `formatos` | `Array<{tipo, label}>` | `[{tipo:'pdf', label:'PDF'}]` | Formatos disponibles |
| `label` | `string` | `'Exportar'` | Texto del botón |
| `className` | `string` | `''` | Clases extra |

### Ejemplos

```jsx
// Botón simple (un solo formato — click directo)
<BotonExportar
    url="/exportar/personal"
    formatos={[{ tipo: 'pdf', label: 'PDF' }]}
/>

// Dropdown con dos formatos, pasando filtros activos
<BotonExportar
    url="/exportar/proyectos"
    params={{
        ...(filtros.estado !== 'todos' && { estado: filtros.estado }),
        ...(filtros.categoria !== 'todos' && { categoria: filtros.categoria }),
    }}
    formatos={[
        { tipo: 'pdf',   label: 'Lista PDF'   },
        { tipo: 'excel', label: 'Lista Excel' },
    ]}
/>

// ZIP asíncrono (POST)
<BotonExportar
    url={`/exportar/proyectos/${id}/actas-zip`}
    formatos={[{ tipo: 'zip', label: 'Generar ZIP' }]}
    label="Actas ZIP"
/>

// Acta individual de vivienda
<BotonExportar
    url={`/exportar/viviendas/${viviendaId}/acta`}
    formatos={[{ tipo: 'pdf', label: 'Acta PDF' }]}
    label="Acta"
/>
```

---

## Decisiones técnicas

| Decisión | Razón |
|---|---|
| `maatwebsite/excel` v3.1 | Estándar de facto en Laravel. Interfaces `WithHeadings`, `WithMapping`, `WithStyles`. |
| `BaseExport` abstracto | DRY: encabezado azul, estilos, helpers `formatCurrency/Date/Pct` definidos una vez. |
| `ExportacionService` unificado | Un solo punto para audit log; aislado del controller. |
| PDF con DomPDF + Blade | Ya instalado; Blade permite HTML/CSS familiar. `DejaVu Sans` para caracteres especiales. |
| ZIP asíncrono con Queue | Los PDFs individuales pueden tardar; no bloquear la UI. Notificación push cuando listo. |
| Filtros como query params | El frontend pasa exactamente el estado actual de filtros → exportación coherente con la vista. |
| `_landscape` como flag en `$datos` | Permite orientación landscape sin un método extra en el service. |
| Reemplazo de `ExportarDropdown` inline | La página `DetalleProyecto` tenía su propio dropdown ad-hoc; migrado a `BotonExportar`. |

---

## Tests

**Archivo:** `tests/Feature/Reportes/ExportacionTest.php`

| # | Test | Qué verifica |
|---|---|---|
| 1 | `exportar_proyectos_pdf_retorna_200_y_content_type_pdf` | Response 200, Content-Type application/pdf |
| 2 | `exportar_proyectos_excel_retorna_200_y_content_type_excel` | Response 200, Content-Type spreadsheetml |
| 3 | `exportar_avance_proyecto_pdf_retorna_200` | PDF de avance generado correctamente |
| 4 | `exportar_beneficiarios_proyecto_pdf_retorna_200` | Lista PDF de beneficiarios OK |
| 5 | `ficha_beneficiario_retorna_pdf` | Ficha individual PDF OK |
| 6 | `exportar_sin_autenticacion_retorna_401` | Protección de auth |
| 7 | `exportar_crea_log_de_exportacion` | Audit trail en `logs_exportacion` |
| 8 | `actas_zip_encola_job_y_retorna_queued` | Job encolado, respuesta `{status: 'queued'}` |

**Resultado:** ✅ 8/8 — 170/170 total (sin regresiones)

---

## Comandos

```bash
# Migrar (crea logs_exportacion)
php artisan migrate

# Ejecutar tests del módulo
php artisan test tests/Feature/Reportes/ExportacionTest.php

# Ejecutar todos los tests
php artisan test --no-coverage

# Build frontend
npm run build

# Para el ZIP asíncrono en desarrollo (necesita queue worker)
php artisan queue:work --queue=default
```

---

## Checklist manual

- [ ] Abrir Lista de Proyectos → botón Exportar visible en toolbar derecho
- [ ] Exportar proyectos PDF → descarga con nombre `lista_proyectos_YYYYMMDD.pdf`
- [ ] Exportar proyectos Excel → descarga con nombre `lista_proyectos_YYYYMMDD.xlsx`
- [ ] Aplicar filtro de estado → exportar → PDF/Excel refleja solo el filtro
- [ ] Detalle de Proyecto → botón "Exportar" → dropdown PDF / Excel de avance
- [ ] Lista de Beneficiarios de proyecto → botón exportar (PDF + Excel)
- [ ] Ficha beneficiario individual: `GET /api/exportar/beneficiarios/{id}/ficha` → PDF
- [ ] Acta de entrega individual: `GET /api/exportar/viviendas/{id}/acta` → PDF con checklist y firmas
- [ ] ZIP asíncrono: `POST /api/exportar/proyectos/{id}/actas-zip` → respuesta `{status: 'queued'}` → notificación con link
- [ ] Lista de Personal → botón exportar (PDF + Excel)
- [ ] Lista de Usuarios → botón exportar (PDF + Excel)
- [ ] Roles y Permisos → botón "Matriz PDF" → descarga en landscape con todos los módulos
- [ ] Verificar tabla `logs_exportacion` registra usuario, recurso, formato, ip, filas
