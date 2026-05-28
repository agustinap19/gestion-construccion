# Rediseño Profesional — Módulo de Proyectos
**CA & KANAGF S.R.L. — Sistema de Gestión de Construcción**
**Fecha:** 2026-05-27 | **Branch:** develop | **Tests:** 240 passed ✅

---

## 1. Resumen Ejecutivo

Se completó el rediseño completo del módulo de Proyectos, incluyendo:
- Nuevo modelo financiero centrado en `monto_contractual` (ingresos)
- Desglose interno en 4 componentes: Materiales (auto), MO, GG, Utilidad
- Hitos de cobro unificados (`HitoCobro`) para proyectos sociales y privados
- Indicadores de salud financiera con umbral de rentabilidad mínima
- Formulario de 3 pasos con panel financiero en vivo
- Dashboard de detalle con sección Finanzas + flujo de cobro
- Corrección de 3 modales de almacén en blanco (framer-motion v12 compat)

---

## 2. Cambios de Base de Datos

### Nuevas migraciones

| Archivo | Tabla | Descripción |
|---------|-------|-------------|
| `2026_05_27_000001_add_financial_fields_to_proyectos_table.php` | `proyectos` | Campos financieros: `monto_contractual`, `porcentaje_mano_obra`, `porcentaje_gastos_generales`, `porcentaje_utilidad_esperada`, `presupuesto_materiales`, `presupuesto_mano_obra`, `presupuesto_gastos_generales`, `presupuesto_utilidad_esperada`, `salud_financiera`, `justificacion_rentabilidad_baja` |
| `2026_05_27_000002_create_configuracion_porcentajes_presupuesto_table.php` | `configuracion_porcentajes_presupuesto` | Sets de configuración por categoría (social/privado): porcentajes MO, GG, utilidad, umbral mínimo |
| `2026_05_27_000003_create_hitos_cobro_proyecto_table.php` | `hitos_cobro_proyecto` | Hitos de cobro: `nombre`, `porcentaje_contrato`, `monto_calculado`, `fecha_planificada`, `fecha_cobrado`, `tipo` (producto_sicooes / hito_negociado), `estado` (planificado / listo_para_cobro / cobrado) |

### Retrocompatibilidad
- `monto_contrato` y `presupuesto_referencial` conservados en BD
- El frontend cae en cascada: `monto_contractual` → `monto_contrato` → `presupuesto_referencial`

---

## 3. Nuevos Modelos

### `HitoCobro` (`app/Models/HitoCobro.php`)
```
tabla: hitos_cobro_proyecto
relaciones: belongsTo Proyecto, belongsTo FaseProyecto (vinculacion_fase_id)
método: recalcularMonto() — recalcula monto_calculado desde monto_contractual
```

### `ConfiguracionPorcentajesPresupuesto` (`app/Models/ConfiguracionPorcentajesPresupuesto.php`)
```
tabla: configuracion_porcentajes_presupuesto
unique: (categoria, nombre_config)
acceso: GET /api/configuracion/porcentajes-presupuesto
```

---

## 4. Cambios en Modelos Existentes

### `Proyecto` (`app/Models/Proyecto.php`)
- Nuevos `$fillable`: `monto_contractual`, `porcentaje_mano_obra`, `porcentaje_gastos_generales`, `porcentaje_utilidad_esperada`, `presupuesto_materiales`, `presupuesto_mano_obra`, `presupuesto_gastos_generales`, `presupuesto_utilidad_esperada`, `salud_financiera`, `justificacion_rentabilidad_baja`
- Nueva relación: `hitosCobro()` → `hasMany(HitoCobro::class)`
- Retrocompatibilidad con `monto_contrato` vía cast

---

## 5. Cambios en Servicios

### `ProyectoService` (`app/Services/Proyectos/ProyectoService.php`)
- `crear()`: valida hitos de cobro, acepta `hitos_cobro` (nuevo API) y `productos_contractuales` (legado)
- `crear()`: guarda snapshot financiero del `ConfiguracionPorcentajesPresupuesto` al momento de creación
- `crear()`: crea registros `HitoCobro` desde el array enviado
- `obtenerDashboard()`: eager load de `hitosCobro`, retorna `hitos_cobro` en la respuesta
- Suma de porcentajes de hitos validada: debe sumar 100% si se envían

### `ConfiguracionController` (nuevo — `app/Http/Controllers/Api/ConfiguracionController.php`)
```
GET /api/configuracion/porcentajes-presupuesto
→ Devuelve sets agrupados por categoría: { social: {...}, privado: {...} }
```

---

## 6. Cambios en el Frontend

### `CrearProyecto.jsx` (reescritura completa)

**Arquitectura de 3 pasos:**
1. **Paso 1 — Tipo y Contraparte**: Categoría, entidad estatal / cliente, zona, prioridad
2. **Paso 2 — Planificación y Detalles**: Fechas, `monto_contractual` (reemplaza `presupuesto_referencial`), hitos de cobro para AMBOS tipos, panel financiero en vivo con 4 barras
3. **Paso 3 — Revisión Financiera**: Tarjeta de salud financiera, justificación obligatoria si `pctUtil < umbral`

**Panel financiero en vivo (Paso 2):**
- Carga config desde `/api/configuracion/porcentajes-presupuesto` al montar
- Pre-rellena porcentajes MO/GG/Utilidad según categoría seleccionada
- Calcula Materiales = monto − MO − GG − Utilidad (residuo)
- Indicador de salud: `saludable` (≥ umbral+5%), `atencion` (≥ umbral), `critico` (< umbral)
- Alerta visual cuando `pctUtil < umbral`

**Hitos de cobro (`hitos_cobro`):**
- Reemplaza `productos_contractuales` (campo legacy)
- Campos: `nombre`, `porcentaje` (% del monto contractual), `fecha_planificada`
- Label cambia según categoría: "Producto SICOOES" (social) / "Hito de cobro" (privado)
- Validación: suma debe ser 100% si se agregan hitos

### `DetalleProyecto.jsx` (ediciones dirigidas)

**`SaludFinancieraCard` (nuevo componente):**
- Muestra 4 barras horizontales: Materiales (azul), MO (violeta), GG (ámbar), Utilidad (color según salud)
- Badge de estado: Saludable / Atención / Crítico
- Justificación de baja rentabilidad si `proyecto.justificacion_rentabilidad_baja` presente

**`FinanzasSection` (nuevo componente):**
- Barra acumulada tricolor: Cobrado (verde) / Listo para cobrar (azul) / Pendiente (gris)
- Lista de `HitoCobro` con estado, monto calculado, fechas planificada/cobrado
- Solo se renderiza si hay `monto_contractual > 0` o hitos registrados
- Data: `hitos_cobro` inyectado desde el endpoint `/api/proyectos/{id}/dashboard`

**Hero actualizado:**
- Muestra `monto_contractual` con fallback a `presupuesto_referencial`

### Corrección de modales en blanco (`almacenes/`)

**Causa raíz:** framer-motion v12 + React 19 — `AnimatePresence` sin `key` props no completa la transición `initial → animate`, dejando los `motion.div` en `opacity: 0`.

**Archivos corregidos:**
- `EntradaCompraModal.jsx`: `motion.div` externo → `div`, `motion.div` interno → `div.animate-modal-in`
- `EntregaSocialModal.jsx`: ídem (mantiene `AnimatePresence mode="wait"` interno para el stepper)
- `TransferenciaModal.jsx`: ídem
- `AlmacenDetalle.jsx`: se agregaron `key` props a todos los modales dentro de `AnimatePresence`

**Animación de reemplazo:** CSS keyframe `modalIn` definido en `app.css`:
```css
@keyframes modalIn {
    from { opacity: 0; transform: scale(0.92) translateY(10px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
}
```
Clase Tailwind v4: `animate-modal-in`

---

## 7. Nuevas Rutas de API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/configuracion/porcentajes-presupuesto` | Sets de porcentajes por categoría |
| `GET` | `/api/proyectos/{id}/dashboard` | Dashboard enriquecido con `hitos_cobro` |

---

## 8. Tests — Estado Final

```
Tests: 240 passed (707 assertions)
```

### Suite de Proyectos (`tests/Feature/Proyectos/`)

| Test | Estado |
|------|--------|
| `ProyectosCrudTest` (14 tests) | ✅ PASS |
| `ProyectoDashboardTest` (14 tests) | ✅ PASS |
| `ProyectosCascadaTest` | ✅ PASS |

### Tests de regresión
Todos los demás módulos (Auth, Personal, Roles, Usuarios, Beneficiarios, etc.) mantienen su estado de PASS.

---

## 9. Decisiones de Arquitectura

### ¿Por qué `monto_contractual` y no `monto_contrato`?
`monto_contrato` ya existía con semántica ambigua (¿presupuesto o ingreso?). El nuevo campo `monto_contractual` tiene semántica clara: es el ingreso que el cliente pagará. Se mantiene retrocompatibilidad.

### ¿Por qué `HitoCobro` unifica social y privado?
Los proyectos sociales tenían `productos_contractuales` (entregables SICOOES) y los privados `hitos_negociados`. Ambos son conceptualmente lo mismo: un % del monto que se cobra al completar algo. Unificar simplifica el modelo de datos y el formulario.

### ¿Por qué snapshot de porcentajes?
Los porcentajes configurados globalmente pueden cambiar con el tiempo. Al guardar el snapshot (`porcentaje_mano_obra`, etc.) en el proyecto al momento de su creación, las métricas del proyecto son estables a lo largo de su ciclo de vida.

### ¿Por qué CSS `animate-modal-in` en lugar de framer-motion?
framer-motion v12 + React 19 tiene incompatibilidades conocidas con `AnimatePresence` cuando los hijos no tienen `key` props. La animación CSS es más robusta y ya estaba definida en `app.css`.

---

## 10. Archivos Modificados

### Backend
- `app/Models/HitoCobro.php` *(nuevo)*
- `app/Models/ConfiguracionPorcentajesPresupuesto.php` *(nuevo)*
- `app/Models/Proyecto.php`
- `app/Services/Proyectos/ProyectoService.php`
- `app/Http/Controllers/Api/ProyectoController.php`
- `app/Http/Controllers/Api/ConfiguracionController.php` *(nuevo)*
- `app/Http/Requests/Proyectos/CrearProyectoRequest.php`
- `app/Http/Requests/Proyectos/ActualizarProyectoRequest.php`
- `database/migrations/2026_05_27_000001_*.php` *(nuevo)*
- `database/migrations/2026_05_27_000002_*.php` *(nuevo)*
- `database/migrations/2026_05_27_000003_*.php` *(nuevo)*
- `routes/api.php`

### Frontend
- `resources/js/pages/admin/proyectos/CrearProyecto.jsx` *(reescritura)*
- `resources/js/pages/admin/proyectos/DetalleProyecto.jsx`
- `resources/js/pages/admin/almacenes/EntradaCompraModal.jsx`
- `resources/js/pages/admin/almacenes/EntregaSocialModal.jsx`
- `resources/js/pages/admin/almacenes/TransferenciaModal.jsx`
- `resources/js/pages/admin/almacenes/AlmacenDetalle.jsx`

### Tests
- `tests/Feature/Proyectos/ProyectosCrudTest.php`
- `tests/Feature/Proyectos/ProyectosDashboardTest.php`
- `tests/Feature/Proyectos/ProyectosCascadaTest.php`
