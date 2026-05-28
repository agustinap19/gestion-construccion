# SUB-FASE C.0 — Reporte de Reparación Integral

**Proyecto**: ERP CA & KANAGF S.R.L.  
**Fecha**: 2026-05-27  
**Estado**: ✅ Completado — 210 tests pasando, build OK

---

## Resumen

Se repararon los 6 puntos críticos de ruptura identificados en `AUDITORIA_C0.md` que provocaban ventanas en blanco, "Sin materiales presupuestados" y "No hay ítems pendientes" en el sistema.

---

## Ruptura #1 ✅ — Seeders obsoletos de tipos_vivienda

**Problema**: `TipoViviendaSeeder` creaba tipos A/B/C/Mejorada sin `plantilla_constructiva_id`. `DatabaseSeeder` no sembraba proyectos, beneficiarios ni viviendas.

**Solución**:
- `TipoViviendaSeeder` reescrito: elimina tipos viejos (sin FK a plantilla) y crea TIPO 1 (45m²), TIPO 2 (60m²), TIPO 3 (75m²) con `plantilla_constructiva_id` resuelto desde `PlantillasConstructivasSeeder`.
- `ProyectoSeeder` corregido: renombrados `administrador_id→responsable_id`, `usuario_creador_id→creado_por_id`, `presupuesto_total→presupuesto_referencial`, `porcentaje_avance→avance_fisico`, `direccion→direccion_obra`. Estado `planificacion→formulacion`.
- `BeneficiarioSeeder` corregido: lookup `%Tipo A%→%TIPO 1%`, `%Tipo B%→%TIPO 2%`.
- `ViviendaSeeder` corregido: estados inválidos `en_construccion→cimentacion`, `inspeccion→obra_fina`. Removido campo `direccion` (no existe en viviendas).
- `DatabaseSeeder` activado: `ProyectoSeeder`, `BeneficiarioSeeder`, `ViviendaSeeder`.

---

## Ruptura #2 ✅ — IntegracionBeneficiarioService no acumulaba materiales

**Problema**: Al registrar un beneficiario, se generaban `presupuesto_items_proyecto` pero NO se calculaban materiales ni se acumulaba en `presupuesto_material_proyecto`. Dashboard del proyecto siempre vacío.

**Solución** (`app/Services/Almacenes/IntegracionBeneficiarioService.php`):
- Inyección de `PresupuestoAutomaticoService $presupuestoSvc` en constructor.
- `generarItemsParaBeneficiario()` ahora acepta `int $actorId = 0` y llama a `$this->presupuestoSvc->recalcularConsolidado()` después de crear los ítems, en `try/catch` para no bloquear el registro si el consolidado falla.
- Nuevo método `regenerarItemsPorCambioTipologia()` para re-generar ítems cuando cambia la tipología.
- `getAvanceBeneficiario()` mejorado: eager load de `itemConstructivo.categoria`, incluye `categoria`, `categoria_color`, `ponderacion_avance` en la respuesta.
- `BeneficiarioController::store()` actualizado para pasar `$request->user()->id` al servicio.

---

## Ruptura #3 ✅ — BeneficiarioService.crear() no copiaba tipo_vivienda_id a Vivienda

**Problema**: La vivienda asignada al beneficiario no recibía el `tipo_vivienda_id`.

**Solución** (`app/Services/Beneficiarios/BeneficiarioService.php`):
```php
$vivienda->beneficiario_id = $beneficiario->id;
if (!empty($datos['tipo_vivienda_id'])) {
    $vivienda->tipo_vivienda_id = $datos['tipo_vivienda_id'];
}
$vivienda->save();
```

---

## Ruptura #4 ✅ — Ruta `/presupuesto-items-proyecto` no existía

**Problema**: `EntregaSocialModal.jsx` llamaba `GET /presupuesto-items-proyecto?proyecto_id=X&beneficiario_id=Y&por_entregar=1` pero no había ruta. Modal siempre mostraba "No hay ítems pendientes".

**Solución**:
- Nuevo método `porBeneficiario(Request $request)` en `PresupuestoItemsProyectoController`:
  - Resuelve `vivienda_id` desde `beneficiario_id` si no viene explícito.
  - Filtra por `proyecto_id`, `vivienda_id`, `por_entregar` (excluye `terminado`).
- Nueva ruta en `routes/api.php`:
  ```
  GET /presupuesto-items-proyecto → PresupuestoItemsProyectoController::porBeneficiario
  ```

---

## Ruptura #5 ✅ — Eager load `vivienda:id,numero` incorrecto

**Problema**: `PresupuestoItemsProyectoController::items()` hacía `'vivienda:id,numero'` pero la columna es `codigo`.

**Solución**: Corregido a `'vivienda:id,codigo'`.

---

## Ruptura #6 ✅ — Selector de tipología mostraba tipos viejos

**Problema**: `BeneficiariosProyecto.jsx` mostraba "Tipo A/B/C/Mejorada" en el selector. Tipos sin `plantilla_constructiva_id` → `IntegracionBeneficiarioService` retornaba `tipo_vivienda_sin_plantilla`.

**Solución**:
- `TipoViviendaController::index()` ahora incluye `plantilla_constructiva_id` en el SELECT.
- Selector de formulario muestra `{t.nombre} ({t.metros_cuadrados} m²)` y marca con `⚠ sin plantilla` los tipos sin plantilla configurada.
- Selector de filtros muestra el nombre + m² compactamente.

---

## Mejoras adicionales

### PARTE 3d — Artisan presupuesto:reconsolidar

Nuevo comando: `php artisan presupuesto:reconsolidar {proyecto_id?}`
- Sin argumento: recalcula todos los proyectos activos.
- Con ID: recalcula solo ese proyecto.
- Útil para reparar presupuesto en proyectos existentes antes de este fix.

### PARTE 4+5 — Botón Salida contextual en AlmacenDetalle

Reemplazados 4 botones separados (Social/Privada/Transferir/Entrada) por lógica contextual:
- `almacen.proyecto?.es_social === true` → botón "Salida Social" (EntregaSocialModal)
- `almacen.proyecto_id && !es_social` → botón "Salida Privada" (EntregaPrivadaModal)
- Sin proyecto → no hay botón de salida
- "Transferir" visible solo para almacenes no-centrales

`AlmacenService::obtenerConStock()` actualizado para cargar `es_social` del proyecto.

### PARTE 6 — OTP cierre/reapertura verificado

Frontend (`cierreRegistrosService.js` + `BeneficiariosProyecto.jsx`) verificado como correcto y funcional. Flujo: cerrar → solicitar reapertura (envía OTP por correo) → ingresar código 8 chars → reapertura.

### PARTE 7 — PresupuestoMaterialesSection expandida

- `PresupuestoMaterialService::formatearItem()` ahora incluye: `cantidad_comprada`, `cantidad_entregada_obra`, `monto_comprado`, `monto_entregado`, `pct_comprado`, `pct_entregado`, `bloqueado`.
- `presupuestoMaterialService.js` nuevo método `reconsolidar()`.
- `PresupuestoMaterialesSection` en `DetalleProyecto.jsx` rediseñada:
  - 3 chips resumen: Presupuestado / Comprado / Entregado
  - Búsqueda inline cuando hay > 5 materiales
  - Tabla scrollable (max-h-72) con indicadores de progreso por color
  - Punto de color por categoría constructiva
  - Botón "Reconsolidar" (visible para canEdit)
  - Estado vacío con texto de ayuda

---

## Resultado de Pruebas

```
Tests:    210 passed (605 assertions)
Duration: 23.16s
Build:    ✓ built in 6.75s (Vite 7)
Seed:     ✓ migrate:fresh --seed exitoso
```

---

## Archivos Modificados

### Backend
| Archivo | Cambio |
|---------|--------|
| `app/Services/Almacenes/IntegracionBeneficiarioService.php` | Reescrito con PresupuestoAutomaticoService injection + recalcularConsolidado |
| `app/Services/Almacenes/AlmacenService.php` | Agrega `es_social` al eager load de proyecto |
| `app/Services/Almacenes/PresupuestoMaterialService.php` | formatearItem() incluye campos de ejecución |
| `app/Http/Controllers/Api/BeneficiarioController.php` | Pasa actorId a generarItemsParaBeneficiario |
| `app/Http/Controllers/Api/PresupuestoItemsProyectoController.php` | Fix eager load + nuevo método porBeneficiario |
| `app/Http/Controllers/Api/TipoViviendaController.php` | Agrega plantilla_constructiva_id al SELECT |
| `app/Console/Commands/PresupuestoReconsolidar.php` | Nuevo comando artisan |
| `routes/api.php` | Nueva ruta GET /presupuesto-items-proyecto |

### Seeders
| Archivo | Cambio |
|---------|--------|
| `database/seeders/TipoViviendaSeeder.php` | Reescrito — TIPO 1/2/3 con plantilla |
| `database/seeders/ProyectoSeeder.php` | Corregidos nombres de columnas y estados |
| `database/seeders/BeneficiarioSeeder.php` | Corregido lookup de tipologías |
| `database/seeders/ViviendaSeeder.php` | Corregidos estados inválidos y campo direccion |
| `database/seeders/DatabaseSeeder.php` | Activados ProyectoSeeder/BeneficiarioSeeder/ViviendaSeeder |

### Frontend
| Archivo | Cambio |
|---------|--------|
| `resources/js/pages/admin/proyectos/BeneficiariosProyecto.jsx` | Selector tipología con m² y ⚠ sin plantilla |
| `resources/js/pages/admin/proyectos/DetalleProyecto.jsx` | PresupuestoMaterialesSection expandida + RefreshCw import |
| `resources/js/pages/admin/almacenes/AlmacenDetalle.jsx` | Botón Salida contextual (Social/Privada según es_social) |
| `resources/js/services/presupuestoMaterialService.js` | Nuevo método reconsolidar() |
