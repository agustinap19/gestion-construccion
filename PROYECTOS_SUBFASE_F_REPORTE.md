# Sub-fase F — Modificatorios, Plantillas de Checklist y Cierre de Registros

## Resumen

Cierre del módulo de Proyectos con tres grandes bloques funcionales:
1. **Modificatorios contractuales** — monto (suma cero) y plazo (ampliación)
2. **Administración de plantillas de checklist** — CRUD en Configuración con ponderaciones
3. **Cierre de registros de beneficiarios** — límite = cupo del proyecto + reapertura con OTP

---

## Archivos creados / modificados

### Migraciones

| Archivo | Descripción |
|---|---|
| `database/migrations/2026_05_22_010000_subfase_f_cierre_registros_beneficiarios.php` | Agrega campos a `proyectos` + tabla `codigos_reapertura` |
| `database/migrations/2026_05_22_020000_create_modificatorios_table.php` | Tabla `modificatorios_proyecto` (tipo, estado, flujo de aprobación) |
| `database/migrations/2026_05_22_020001_create_items_modificatorio_table.php` | Tabla `items_modificatorio` (snapshot suma-cero) |
| `database/migrations/2026_05_22_020002_add_activo_to_plantillas_checklist.php` | Agrega `activo` boolean a `plantillas_checklist` |

### Modelos

| Archivo | Descripción |
|---|---|
| `app/Models/Modificatorio.php` | Modelo con estados, relaciones y validación suma-cero |
| `app/Models/ItemModificatorio.php` | Snapshot de ítem con método `recalcular()` |
| `app/Models/CodigoReapertura.php` | OTP de un solo uso para reapertura de registros |
| `app/Models/ItemPresupuesto.php` | Modelo para `items_presupuesto` (FK nullable) |
| `app/Models/Proyecto.php` | + campos cierre registros, + relaciones `modificatorios()`, `codigosReapertura()`, `cerradoRegistrosPor()` |
| `app/Models/PlantillaChecklist.php` | + `activo` en fillable/casts |

### Servicios

| Archivo | Descripción |
|---|---|
| `app/Services/ModificatorioService.php` | CRUD + flujo borrador → pendiente → aprobado → aplicado; validación suma-cero; generador de justificativo legal |
| `app/Services/CierreRegistrosService.php` | Cerrar registros, solicitar OTP de reapertura, verificar y reabrir |

### Mail + Views

| Archivo | Descripción |
|---|---|
| `app/Mail/CodigoReaperturaMail.php` | Email con el código OTP de reapertura |
| `resources/views/emails/codigo-reapertura.blade.php` | Template HTML del email |
| `resources/views/exports/modificatorio_monto.blade.php` | PDF del modificatorio de montos (suma-cero, tabla con deltas) |
| `resources/views/exports/ampliacion_plazo.blade.php` | PDF de la ampliación de plazo (indicadores visuales, firmas) |

### Controladores

| Archivo | Descripción |
|---|---|
| `app/Http/Controllers/Api/ModificatorioController.php` | CRUD + enviar/aprobar/rechazar/aplicar + PDF |
| `app/Http/Controllers/Api/CierreRegistrosBeneficiariosController.php` | Estado, cerrar, solicitar reapertura, verificar OTP |
| `app/Http/Controllers/Api/PlantillaChecklistController.php` | CRUD plantillas + CRUD ítems + reordenar + toggle activo + aplicar a proyecto |

### Rutas (`routes/api.php`)

```
GET/POST  /proyectos/{id}/modificatorios            → index, storeMonto, storePlazo
GET/PUT/POST /modificatorios/{id}/*                 → show, updateItems, justificativo, aprobar, etc.
GET/POST  /proyectos/{id}/cierre-registros/*        → estado, cerrar, solicitar/verificar reapertura
GET/POST/PUT/DELETE /plantillas-checklist/*         → CRUD completo + ítems + reordenar
```

### Frontend

| Archivo | Descripción |
|---|---|
| `resources/js/services/modificatorioService.js` | Service para todos los endpoints de modificatorios |
| `resources/js/services/cierreRegistrosService.js` | Service para estado, cerrar y reapertura |
| `resources/js/pages/admin/proyectos/DetalleProyecto.jsx` | + `ModificatoriosSection` con stepper 4-pasos para monto y modal ampliación plazo |
| `resources/js/pages/admin/proyectos/BeneficiariosProyecto.jsx` | + Banner de cierre, botones cerrar/reabrir, modales confirmación + OTP |
| `resources/js/pages/private/Configuracion.jsx` | + Sección "Plantillas de Checklist" con CRUD inline y reordenamiento |

---

## Flujo de Modificatorio de Montos (stepper 4 pasos)

```
Paso 1: Motivo y justificación técnica
Paso 2: Tabla de ítems (cantidad_orig × P.U. vs cantidad_nueva × P.U.)
Paso 3: Validación suma cero — debe sumar exactamente 0.00 Bs.
Paso 4: Justificativo legal (auto-generado o editable)
         → Crear como BORRADOR
             → Enviar a aprobación
                 → Aprobado / Rechazado
                     → Aplicar (solo aprobados)
```

## Flujo de Cierre de Registros

```
Beneficiarios Proyecto → botón "Terminar registros"
  → Modal de confirmación (muestra inscritos / cupo total)
  → POST /cierre-registros/cerrar → proyecto.registros_beneficiarios_cerrados = true

Post-cierre:
  → Banner rojo en página de beneficiarios
  → Botón "Reabrir registros" (solo admin/gerente con permiso)
  → POST /solicitar-reapertura → envía OTP de 8 chars al email del usuario
  → Modal de código: usuario ingresa el código recibido
  → POST /verificar-reapertura → verifica y reabre
```

---

## Tests

**Tests existentes:** ✅ 170/170 pasando (sin regresiones)

**Tests nuevos sugeridos** (pendiente implementar):
- `tests/Feature/Proyectos/Modificatorios/ModificatorioTest.php`
- `tests/Feature/Beneficiarios/CierreRegistrosTest.php`
- `tests/Feature/Proyectos/Plantillas/PlantillaChecklistTest.php`

---

## Comandos

```bash
# Migrar (ya ejecutado)
php artisan migrate

# Ejecutar todos los tests
php artisan test --no-coverage

# Build frontend (ya ejecutado)
npm run build

# Iniciar servidor de desarrollo
php artisan serve
npm run dev

# Cola (para reenvío de emails OTP en producción)
php artisan queue:work --queue=default
```

---

## Checklist manual

### Modificatorios
- [ ] Detalle de proyecto → sección "Modificatorios Contractuales" visible
- [ ] Botón "Nuevo" → dropdown Monto / Plazo
- [ ] Crear modificatorio de montos → stepper 4 pasos → validación suma cero
- [ ] Crear ampliación de plazo → modal con preview días/fecha
- [ ] Enviar a aprobación → estado cambia a "Pendiente"
- [ ] Aprobar → estado "Aprobado" → botón "Aplicar"
- [ ] Aplicar plazo → proyecto actualiza `fecha_fin_planificada` y `plazo_dias`
- [ ] Descargar PDF del modificatorio

### Cierre de registros
- [ ] Página beneficiarios → botón "Terminar registros" visible
- [ ] Modal confirmación muestra inscritos/cupo
- [ ] Tras cerrar → banner amarillo y botón cambia a "Reabrir registros"
- [ ] Reabrir → toast "enviado a correo" → modal OTP
- [ ] Código correcto → registros reabiertos
- [ ] Código incorrecto → mensaje de error sin reabrir

### Plantillas de checklist (Configuración)
- [ ] Sección "Plantillas de Checklist" visible en Configuración
- [ ] Crear nueva plantilla → aparece en lista
- [ ] Expandir plantilla → ver ítems
- [ ] Agregar ítem con ponderación → suma % se actualiza
- [ ] Suma > 100% → error al guardar
- [ ] Reordenar ítems con flechas ↑↓
- [ ] Toggle activo/inactivo
