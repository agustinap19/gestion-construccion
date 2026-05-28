# PROYECTOS SUB-FASE 1 — REPORTE DE IMPLEMENTACIÓN

**Fecha:** 2026-05-20  
**Rama:** develop  
**Estado:** COMPLETADO ✓

---

## Resumen ejecutivo

Se implementó la Sub-fase 1 del módulo de Proyectos bajo el concepto "el proyecto como centro de gravedad". Los proyectos son ahora el eje principal desde el que se gestionan beneficiarios y (en fases futuras) almacén, personal, asistencia, avance, cronograma y reportes. El rediseño sigue el sistema glass-dark establecido en los módulos anteriores.

---

## Cambios de backend

### Migraciones

| Archivo | Cambio |
|---|---|
| `0001_01_01_000402_create_proyectos_table.php` | Añadidos: `categoria` (social/privado), `prioridad` (baja/media/alta/critica), `cantidad_unidades` |
| `0001_01_01_000403_create_beneficiarios_table.php` | CI pasó de unique global a unique compuesto `(proyecto_id, ci)` — permite el mismo CI en proyectos distintos |
| `0001_01_01_000700_create_fases_proyecto_table.php` | Añadido `softDeletes()` para sincronizar con el trait `SoftDeletes` del modelo `FaseProyecto` |

### Modelos

**`app/Models/Proyecto.php`**
- Añadido a `$fillable`: `categoria`, `prioridad`, `cantidad_unidades`
- Nuevo accessor `getEsSocialAttribute(): bool` — `$proyecto->es_social`
- Nuevo accessor `getPorcentajeAvanceAttribute(): float` — `$proyecto->porcentaje_avance`
- Accessors adicionales: `getEstaActivoAttribute`, `getEstaFinalizadoAttribute`, `getEsCanceladoAttribute`
- Scope `scopeActivos`, `scopeEnEjecucion`, `scopePorEstado`, `scopeBuscar`

**`app/Models/User.php`**
- Añadido `hasRole(string $rolNombre): bool`
- Añadido `hasPermissionTo(string $codigo): bool` (respeta `es_admin_central`)

### Form Requests

**`CrearProyectoRequest` / `ActualizarProyectoRequest`**
- Corregidos nombres de campo: `administrador_id` → `responsable_id`, `presupuesto_total` → `presupuesto_referencial`, `monto_garantia` → `monto_contrato`
- Añadidos: `categoria` (required), `prioridad` (nullable), `cantidad_unidades` (nullable)

**`CambiarEstadoProyectoRequest`**
- Estados corregidos para coincidir con la máquina de estados del modelo: `formulacion, licitacion, adjudicado, en_ejecucion, pausado, finalizado, cancelado` (antes tenía `borrador, planificacion` que no existían)

**`ActualizarBeneficiarioRequest`**
- Campos `nombre`, `apellido_paterno`, `ci` cambiados a `sometimes|required` para permitir actualizaciones parciales

### Servicios

**`app/Services/Proyectos/ProyectoService.php`**
- Filtros `categoria` y `prioridad` añadidos a `listarConFiltros()`
- Estadísticas generales añaden breakdown `por_categoria` (social/privado)
- Método `cambiarAdministrador()` añadido como alias de `cambiarResponsable()` (el controlador lo llamaba pero no existía)

**`app/Services/Beneficiarios/BeneficiarioService.php`**
- Guard nulo corregido: `if ($proyecto->tipoProyecto && !$proyecto->tipoProyecto->requiere_beneficiarios)` (antes lanzaba NPE si `tipoProyecto` era null)

---

## Cambios de frontend

### Nuevo utilitario

**`resources/js/utils/gps.js`**

Conversión GPS GMS ↔ decimal, no negociable según spec:

```js
decimalToGMS(decimal, isLat)   // -16.5 → "16°30'00\"S"
gmsToDecimal(gms)              // acepta GMS o decimal directo
parseGPSInput(value, isLat)    // → { decimal, gms, error }
isValidLatitude(v)
isValidLongitude(v)
```

### Nuevos iconos

**`resources/js/components/icons/Icons.jsx`**
- `ClipboardList` — icono para tab Reportes
- `BarChart2` — icono para tab Avance

### Páginas rediseñadas

#### `ListaProyectos.jsx`
- Diseño glass dark completo: fondo `rgba(255,255,255,0.03)`, bordes `white/[0.09]`
- `ESTADO_META` con colores por estado: formulacion (slate), licitacion (blue), adjudicado (indigo), en_ejecucion (emerald), pausado (amber), finalizado (teal), cancelado (red)
- `PRIORIDAD_META` con dot de color para baja/media/alta/critica
- Barras de progreso para `avance_fisico`
- Modal "Archivar" (soft delete) con campo de razón
- Stats correctos: `por_categoria.social`, `por_categoria.privado`, `por_estado.en_ejecucion`
- Paginación con `ChevronLeft` / `ChevronRight`

#### `CrearProyecto.jsx`
- Stepper de 3 pasos: Categoría & Contraparte → Planificación & Finanzas → Resumen
- Selector de categoría social/privado como botones estilizados
- Campos correctos: `presupuesto_referencial`, `monto_contrato`, `responsable_id`
- Helpers inline: `GF`, `gI`, `GlassSelect`, `GlassCard`

#### `EditarProyecto.jsx`
- Glass dark con 4 secciones: Referencia (readonly), Identidad, Finanzas, Cronograma + Ubicación
- Mismos nombres de campo que la creación

#### `DetalleProyecto.jsx` — Dashboard principal

El archivo más grande y central de esta sub-fase. Implementa el concepto de proyecto como centro de gravedad.

**Hero header**
- Glow de color dinámico según `ESTADO_META[estado].glow`
- Código + nombre + estado + prioridad en una línea
- Progreso de avance físico y financiero
- Botones de acción: Editar, Cambiar Estado, Archivar

**Tabs (8)**

| Tab | Estado | Descripción |
|---|---|---|
| Resumen | Implementado | Datos completos del proyecto: cliente/entidad, finanzas, cronograma, GPS, observaciones |
| Beneficiarios | Implementado | Solo visible en proyectos `categoria=social` |
| Personal | Placeholder | Próximamente (Sub-fase 2) |
| Almacén | Placeholder | Próximamente |
| Asistencia | Placeholder | Próximamente |
| Avance | Placeholder | Próximamente |
| Cronograma | Placeholder | Próximamente |
| Reportes | Placeholder | Próximamente |

**Tab Beneficiarios (completamente implementado)**
- Grid de estadísticas por estado: candidato / aceptado / en_construccion / vivienda_entregada / retirado / rechazado
- Tabla con búsqueda y filtro por estado
- Modal Crear/Editar con formulario completo:
  - Datos personales (nombre, apellidos, CI, fecha nacimiento, estado civil, género)
  - Contacto (teléfono, email)
  - Familia (cantidad_familiares, personas_dependientes, ingreso_mensual)
  - Domicilio actual y del terreno
  - Coordenadas GPS con `GpsField`: acepta entrada GMS o decimal, muestra preview del valor decimal convertido
  - Tipo de vivienda
  - Observaciones
- Modal Cambiar Estado con campo razón obligatorio para retirado/rechazado
- `BENEF_ESTADO_META` con colores por estado

---

## Tests

### `tests/Feature/Proyectos/ProyectosCrudTest.php`

| Test | Estado |
|---|---|
| listar_proyectos_requiere_autenticacion | PASS |
| listar_proyectos_retorna_paginador | PASS |
| crear_proyecto_social | PASS |
| crear_proyecto_requiere_nombre | PASS |
| crear_proyecto_requiere_presupuesto_referencial | PASS |
| crear_proyecto_categoria_requerida | PASS |
| ver_detalle_proyecto | PASS |
| actualizar_proyecto | PASS |
| cambiar_estado_formulacion_a_licitacion | PASS |
| cambiar_estado_invalido_falla | PASS |
| archivar_proyecto | PASS |
| estadisticas_generales | PASS |
| filtrar_por_categoria | PASS |
| codigo_generado_automaticamente | PASS |
| **Total** | **14/14** |

### `tests/Feature/Beneficiarios/BeneficiariosCrudTest.php`

| Test | Estado |
|---|---|
| listar_beneficiarios_requiere_autenticacion | PASS |
| crear_beneficiario | PASS |
| crear_beneficiario_requiere_nombre | PASS |
| crear_beneficiario_requiere_ci | PASS |
| ci_unico_dentro_del_proyecto | PASS |
| mismo_ci_en_diferente_proyecto_permitido | PASS |
| ver_detalle_beneficiario | PASS |
| actualizar_beneficiario | PASS |
| archivar_beneficiario | PASS |
| estadisticas_por_proyecto | PASS |
| filtrar_beneficiarios_por_proyecto | PASS |
| **Total** | **11/11** |

**Total general: 25/25 tests verdes.**

---

## Comandos de verificación

```bash
php artisan migrate:fresh --seed   # OK — todas las migraciones pasan
npm run build                      # OK — 1905 módulos transformados (933 kB JS, 166 kB CSS)
php artisan test tests/Feature/Proyectos/ tests/Feature/Beneficiarios/
# Tests: 25 passed (67 assertions) — Duration: ~12s
```

---

## Reglas de negocio implementadas

1. Solo proyectos `categoria=social` pueden tener beneficiarios
2. El tab "Beneficiarios" en DetalleProyecto solo se muestra si `proyecto.categoria === 'social'`
3. CI del beneficiario es único por proyecto (no global) — índice compuesto `(proyecto_id, ci)`
4. Proyectos en estado `cancelado` o `finalizado` no admiten nuevos beneficiarios
5. Transiciones de estado validadas en backend (`TRANSICIONES_PERMITIDAS` en `Proyecto.php`)
6. Beneficiario con estado `en_construccion` o `vivienda_entregada` no puede ser archivado
7. Archivar un beneficiario requiere una razón obligatoria
8. Cambio de estado a `retirado` o `rechazado` requiere razón
9. Reactivar un beneficiario `retirado → aceptado` solo puede hacerlo un gerente

---

## Archivos modificados / creados

### Backend
- `database/migrations/0001_01_01_000402_create_proyectos_table.php`
- `database/migrations/0001_01_01_000403_create_beneficiarios_table.php`
- `database/migrations/0001_01_01_000700_create_fases_proyecto_table.php`
- `app/Models/Proyecto.php`
- `app/Models/User.php`
- `app/Http/Requests/Proyectos/CrearProyectoRequest.php`
- `app/Http/Requests/Proyectos/ActualizarProyectoRequest.php`
- `app/Http/Requests/Proyectos/CambiarEstadoProyectoRequest.php`
- `app/Http/Requests/Beneficiarios/ActualizarBeneficiarioRequest.php`
- `app/Services/Proyectos/ProyectoService.php`
- `app/Services/Beneficiarios/BeneficiarioService.php`

### Frontend
- `resources/js/utils/gps.js` _(nuevo)_
- `resources/js/components/icons/Icons.jsx` _(ClipboardList, BarChart2 añadidos)_
- `resources/js/pages/admin/proyectos/ListaProyectos.jsx`
- `resources/js/pages/admin/proyectos/CrearProyecto.jsx`
- `resources/js/pages/admin/proyectos/EditarProyecto.jsx`
- `resources/js/pages/admin/proyectos/DetalleProyecto.jsx`

### Tests
- `tests/Feature/Proyectos/ProyectosCrudTest.php` _(nuevo)_
- `tests/Feature/Beneficiarios/BeneficiariosCrudTest.php` _(nuevo)_

---

## Pendiente para Sub-fases siguientes

| Módulo | Tab en DetalleProyecto | Estado |
|---|---|---|
| Personal de obra | Personal | Pendiente Sub-fase 2 |
| Almacén / inventario | Almacén | Pendiente |
| Registro de asistencia | Asistencia | Pendiente |
| Avance físico / fotos | Avance | Pendiente |
| Cronograma Gantt | Cronograma | Pendiente |
| Exportación PDF/Excel | Reportes | Pendiente |
