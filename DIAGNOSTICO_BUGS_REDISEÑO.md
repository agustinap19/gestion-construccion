# Diagnóstico de Bugs — Rediseño de Proyectos
**CA & KANAGF S.R.L. — Sistema de Gestión de Construcción**
**Fecha:** 2026-05-27 | **Branch:** develop

---

## Bug 1 — Materiales muestra 100% del monto contractual (formulario creación)

**Síntoma:** El panel financiero en vivo del Paso 2 muestra "Materiales: Bs. 1.400.000 (100%)" cuando el monto es 1.400.000.

**Causa raíz:**
El campo `presupuesto_materiales` en `ProyectoService::crear()` se lee del payload enviado:
```php
$presupMat = (float) ($datos['presupuesto_materiales'] ?? 0);
```
El frontend nunca envía `presupuesto_materiales` (es un valor calculado, no un input). Por tanto `$presupMat = 0`. Cuando el backend guarda el proyecto, `presupuesto_materiales = 0`.

En el dashboard (`SaludFinancieraCard`), la guarda truthy:
```js
const presupMat = proyecto.presupuesto_materiales ? ... : monto - presupMO - presupGG - presupUtil;
```
`0` es falsy → cae al fallback `monto - 0 - 0 - 0 = monto` → muestra 100%.

**Archivo:** `app/Services/Proyectos/ProyectoService.php:210`

---

## Bug 2 — MO, GG, Utilidad muestran Bs. 0 / 0% en el formulario

**Síntoma:** El panel financiero en vivo muestra 0% para los tres componentes calculados (MO, GG, Utilidad) aunque la config global tiene 30%/12%/15%.

**Causa raíz (formulario):**
El panel usa:
```js
const pctMO = parseFloat(form.porcentaje_mano_obra || cfgActual.porcentaje_mano_obra || 0);
```
`configFinanciera` se inicializa como `null`. En el primer render (antes de que la Promise de la API resuelva), `cfgActual = {}` y `cfgActual.porcentaje_mano_obra = undefined`, resultando en `pctMO = 0`. Si la API falla o tarda, el panel queda en 0%.

**Causa raíz (dashboard - proyectos sin snapshot):**
Para proyectos creados por el seeder (que omite `ProyectoService::crear()`), `porcentaje_mano_obra = null`. El fallback `null || 0 = 0`. `presupMO = 0`, `presupGG = 0`, `presupUtil = 0`. El cálculo de materiales cae en el fallback con monto completo (Bug 1).

**Archivos:** `resources/js/pages/admin/proyectos/CrearProyecto.jsx:313-315`, `DetalleProyecto.jsx:172-179`

---

## Bug 3 — Rentabilidad siempre "Crítico"

**Síntoma:** El badge de salud financiera siempre muestra "Crítico".

**Causa raíz:** Consecuencia directa de Bug 2. Si `pctUtil = 0` y `umbral = 5`, la condición `pctUtil >= umbral` es falsa, resultando siempre en estado "crítico".

**Adicionalmente:** `salud_financiera` nunca se guarda en la BD (no aparece en `$camposProyecto` de `ProyectoService::crear()`). El dashboard usa el fallback `proyecto.salud_financiera ?? (pctUtil >= 15 ? ...)` que también resulta 'critico' con pctUtil=0.

**Archivo:** `app/Services/Proyectos/ProyectoService.php:239-250`

---

## Bug 4 — SaludFinancieraCard del dashboard muestra Materiales 100% y demás en 0

**Síntoma:** Al ver el detalle de un proyecto existente (especialmente seeder), la tarjeta de Salud Financiera muestra todas las barras incorrectas.

**Causa raíz:** Misma que Bugs 1+2+3, pero en el contexto del dashboard. Adicionalmente, el componente usa comprobación de verdad (`proyecto.presupuesto_mano_obra ? ...`) en lugar de comparación con null, por lo que un valor `0` (que es válido) activa el fallback erróneamente.

**Archivo:** `resources/js/pages/admin/proyectos/DetalleProyecto.jsx:176-179`

---

## Bug 5 — "Avance General 0.0%" sin comparación contra avance esperado

**Síntoma:** El dashboard muestra el avance real pero no hay indicador de si ese avance está adelantado o atrasado respecto al tiempo transcurrido.

**Causa raíz:** El servicio `CalculadoraAvanceService` ya calcula `porcentaje_plazo` (tiempo transcurrido %). El dashboard tiene los datos pero no los expone como comparación "esperado vs. real".

**Archivo:** `resources/js/pages/admin/proyectos/DetalleProyecto.jsx:2210-2225`

---

## Bug 6 — "Flujo de Cobro" muestra "Sin hitos" aunque el Gantt muestra productos

**Síntoma:** La sección `FinanzasSection` muestra "Sin hitos" mientras el Gantt muestra 4 ítems de cobro.

**Causa raíz:** `CascadaProyectoService::crearHitosCobro()` solo crea hitos si `$hitosData` es no vacío:
```php
foreach ($hitosData as $idx => $hito) { ... }
```
Si el usuario no agrega hitos en el formulario, `form.hitos_cobro = []` → `hitos_cobro` vacío en el payload → no se crean registros en `hitos_cobro_proyecto`.

El Gantt muestra hitos del tipo `Hito` (tabla `hitos`), no `HitoCobro`. Los "4 productos" del Gantt son `ProductoContractual` legacy de proyectos sembrados, o bien hitos de cronograma — no están vinculados al flujo de cobro.

**Archivo:** `app/Services/Proyectos/CascadaProyectoService.php:149-183`

---

## Bug 7 — Productos nombrados "prod1, prod2" en lugar de "Producto 1, Producto 2"

**Síntoma:** Los hitos de cobro tienen nombres genéricos ingresados por el usuario en lugar de nombres automáticos con el patrón correcto.

**Causa raíz:** El formulario inicia cada hito con `{ nombre: '', porcentaje: '', fecha_planificada: '' }` y el campo `nombre` es libre. El usuario debe escribir manualmente el nombre. No hay llenado previo con "Producto N".

**Archivo:** `resources/js/pages/admin/proyectos/CrearProyecto.jsx:424`

---

## Bug 8 — 5 beneficiarios declarados, solo 2 viviendas creadas

**Síntoma:** Un proyecto social con `cantidad_beneficiarios = 5` tiene solo 2 viviendas.

**Causa raíz:** Para proyectos creados por el `ProyectoSeeder`, las viviendas se crean directamente en `ViviendaSeeder` (hardcoded). No pasan por `CascadaProyectoService`.

Para proyectos creados vía el formulario: el frontend envía `cantidad_beneficiarios` con la función `append()`, que omite valores vacíos `''`. Si el campo está en blanco, el backend recibe `null`, que cae a `0` en opciones de cascada, resultando en `max(1, 0) = 1` vivienda.

**Archivos:** `database/seeders/ProyectoSeeder.php`, `resources/js/pages/admin/proyectos/CrearProyecto.jsx:549`

---

## Resumen de Correcciones Requeridas

| Bug | Tipo | Archivo | Severidad |
|-----|------|---------|-----------|
| 1 | Backend | `ProyectoService.php:210` | Alta |
| 2 | Backend + Frontend | `ProyectoService.php`, `CrearProyecto.jsx` | Alta |
| 3 | Backend | `ProyectoService.php:239-250` | Alta |
| 4 | Frontend | `DetalleProyecto.jsx:176-179` | Media |
| 5 | Frontend | `DetalleProyecto.jsx:2210-2225` | Media |
| 6 | Backend | `CascadaProyectoService.php:26-30` | Alta |
| 7 | Frontend | `CrearProyecto.jsx:424` | Baja |
| 8 | Backend/Seeder | `CascadaProyectoService.php:129` | Media |
