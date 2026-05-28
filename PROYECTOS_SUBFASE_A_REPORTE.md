# Módulo de Proyectos — Sub-fase A: Reporte de Implementación

**Fecha:** 2026-05-21  
**Rama:** develop  
**Estado:** COMPLETADO ✓  

---

## 1. Resumen Ejecutivo

Se implementó la Sub-fase A del Módulo de Proyectos del ERP de CA & KANAGF S.R.L., cubriendo: limpieza del sidebar, creación en cascada de proyectos (almacén + fases/viviendas + checklist + productos contractuales + hitos), formulario de creación con soporte multipart/PDF, listado con filtros y estadísticas, y vista de detalle con tabs.

---

## 2. Cambios por Capa

### 2.1 Base de Datos — Nuevas Migraciones

| Archivo | Tabla creada |
|---|---|
| `0001_01_01_000404_create_viviendas_table.php` | `viviendas` — representa unidades habitacionales en proyectos sociales |
| `0001_01_01_000405_create_productos_contractuales_table.php` | `productos_contractuales` — cobros programados en proyectos sociales |
| `0001_01_01_000406_create_plantillas_checklist_table.php` | `plantillas_checklist` + `items_plantilla` — plantillas de control de calidad |
| `0001_01_01_000701_create_items_checklist_table.php` | `items_checklist` — ítems instanciados por fase o vivienda |
| `0001_01_01_000408_add_contrato_fields_to_proyectos.php` | Agrega `contrato_url`, `cantidad_beneficiarios`, `tipo_obra`, `plazo_dias` a `proyectos` |

**Nota:** La migración de `items_checklist` fue numerada 000701 para ejecutarse después de `fases_proyecto` (000700), evitando error de FK.

### 2.2 Modelos Nuevos/Actualizados

| Modelo | Estado | Descripción |
|---|---|---|
| `Almacen` | **Nuevo** | Mapea tabla existente `almacenes`; relaciones con `Proyecto` y `Personal` |
| `Hito` | **Nuevo** | Mapea tabla existente `hitos`; relaciones con `Proyecto` y `FaseProyecto` |
| `Vivienda` | **Nuevo** | Mapea nueva tabla `viviendas`; estados: planificada → entregada |
| `ProductoContractual` | **Nuevo** | Cobros programados con porcentaje y monto calculado |
| `PlantillaChecklist` | **Nuevo** | 5 plantillas: `vivienda_social`, `casa_privada`, `edificio`, `remodelacion`, `generica` |
| `ItemPlantilla` | **Nuevo** | Ítems base de plantilla con orden y ponderación |
| `ItemChecklist` | **Nuevo** | Ítems instanciados ligados a `fase_id` o `vivienda_id` |
| `Proyecto` | **Actualizado** | Nuevos campos en `$fillable`: `tipo_obra`, `cantidad_beneficiarios`, `plazo_dias`, `contrato_url`; nuevas relaciones: `viviendas()`, `almacen()`, `productosContractuales()` |

### 2.3 Seeders

| Seeder | Contenido |
|---|---|
| `PlantillaChecklistSeeder` | 5 plantillas con ítems equiponderados: vivienda_social (9 ítems), casa_privada (7), edificio (10), remodelacion (7), generica/predeterminada (6) |
| `DatabaseSeeder` | Añadida invocación de `PlantillaChecklistSeeder` tras `TipoViviendaSeeder` |

### 2.4 Servicios

#### `CascadaProyectoService` (Nuevo)

Servicio dedicado para la generación en cascada al crear un proyecto. Llamado dentro del `DB::transaction()` de `ProyectoService.crear()`.

```
ejecutar(Proyecto, opciones)
  ├── crearAlmacen()           → ALM-{año}-{seq}
  ├── crearHitosCronograma()   → 2 hitos es_critico=true (inicio + fin)
  ├── [privado] crearFasesPrivado()
  │     ├── N FaseProyecto con fechas proporcionales
  │     └── ItemChecklist por fase (desde plantilla tipo_obra)
  └── [social] crearViviendasSocial() + crearProductosContractuales()
        ├── N Vivienda → código VIV-{proyecto.codigo}-{seq}
        ├── ItemChecklist por vivienda (desde plantilla vivienda_social)
        └── M ProductoContractual + Hito(tipo=pago) por producto
```

#### `ProyectoService.crear()` (Reescrito)

- Validación de contraparte por categoría (social → entidad_estatal_id; privado → cliente_id)
- Validación de suma 100% en fases_config y productos_contractuales
- Validación de fechas de productos dentro del rango del proyecto
- Separación de opciones de cascada antes del create
- Cálculo de `plazo_dias` desde fechas
- Generación de código `PRJ-{año}-{seq padded 4}`
- Todo en `DB::transaction()` — rollback total en error

### 2.5 Controladores

**`ProyectoController`** — Cambios:
- `store()`: Manejo de PDF (`$request->hasFile('contrato_pdf')` → `Storage::url()`), eliminación de `contrato_pdf` del array de datos antes de pasar al servicio, **verificación de permiso** `proyectos.crear`
- `update()`: Mismo manejo de PDF usando código existente del proyecto
- `sociales()`: Estado corregido de `planificacion` a `formulacion`

### 2.6 Form Requests

**`CrearProyectoRequest`** — Nuevas reglas:
- `tipo_obra` (in:vivienda_unifamiliar,edificio,remodelacion,ampliacion,otro)
- `contrato_pdf` (file|mimes:pdf|max:10240)
- `cantidad_fases` (int|max:50)
- `fases_config[*].nombre/porcentaje`
- `cantidad_beneficiarios` (int|max:5000)
- `productos_contractuales[*].nombre/porcentaje/fecha_planificada_cobro`

### 2.7 Frontend

#### Sidebar.jsx
- Eliminados grupos "Clientes" (Clientes Privados + Entidades Estatales) y "Social" (Beneficiarios)
- Eliminadas importaciones de iconos `Building` y `Landmark` que solo se usaban en esos grupos

#### App.jsx
- Eliminados imports de 8 páginas: `ListaClientes`, `DetalleCliente`, `CrearCliente`, `EditarCliente`, `ListaEntidadesEstatales`, `DetalleEntidadEstatal`, `CrearEntidadEstatal`, `EditarEntidadEstatal`, `ListaBeneficiarios`, `CrearBeneficiario`, `DetalleBeneficiario`, `EditarBeneficiario`
- Eliminadas 12 rutas correspondientes
- Los backends (API endpoints, modelos, servicios) permanecen intactos

#### `CrearProyecto.jsx` (Reescrito completamente)
- **Paso 1:** Selector de categoría (Social/Privado) + identidad + tipo_obra (privado) + prioridad + contraparte (cliente/entidad con mini-modal inline para crear nuevo) + zona + responsable
- **Paso 2:** Cronograma + Finanzas (presupuesto, monto_contrato, PDF upload) + GPS (latitud/longitud con GMS↔decimal) + [Privado] cantidad_fases + tabla fases_config con porcentajes + [Social] cantidad_beneficiarios + tabla productos_contractuales
- **Paso 3:** Resumen con descripción de lo que se generará en cascada
- Validación frontend en tiempo real (suma 100%, fechas, etc.)
- Envío con `FormData` multipart para soportar PDF

#### `proyectoService.js`
- Nuevo método `crearFormData(FormData)` con `Content-Type: multipart/form-data`

#### `ListaProyectos.jsx` — ya existente, conservado y validado:
- Glass grid con cards, badges de estado, progress bar
- Filtros por categoría/estado/prioridad, búsqueda con debounce
- Stats header (en ejecución, sociales, privados, avance promedio)
- Skeletons, empty state, modal de archivar con razón
- Paginación

#### `DetalleProyecto.jsx` — ya existente, conservado y validado:
- Header hero con estado coloreado y progress bar
- 8 tabs (Resumen, Beneficiarios, Personal, Almacén, Asistencia, Avance, Cronograma, Reportes)
- Tab Beneficiarios: tabla completa con BeneficiarioModal inline, filtros, stats
- Tabs pendientes: `PlaceholderTab` con badge "Próximamente" (arquitectura lista para Sub-fase B)

---

## 3. Tests — ProyectosCascadaTest.php

**22 tests, 82 assertions — todos PASS**

| Test | Tipo | Descripción |
|---|---|---|
| `proyecto_privado_genera_fases_almacen_e_hitos` | Cascade | 3 fases + almacén + 2 hitos con `es_critico=true` |
| `proyecto_privado_fases_tienen_checklist_items` | Cascade | Checklist por fase desde plantilla `casa_privada` |
| `proyecto_privado_fases_tienen_fechas_proporcionales` | Cascade | Primera fase = inicio proyecto, última = fin proyecto |
| `proyecto_privado_fases_con_config_porcentajes` | Cascade | Nombres de fases respetados desde `fases_config` |
| `proyecto_social_genera_viviendas_almacen_e_hitos` | Cascade | N viviendas + almacén + mínimo 2 hitos |
| `proyecto_social_viviendas_tienen_codigo_correcto` | Cascade | `VIV-{codigo}-001`, `VIV-{codigo}-002`, etc. |
| `proyecto_social_viviendas_tienen_checklist_items` | Cascade | Checklist por vivienda desde plantilla `vivienda_social` |
| `proyecto_social_con_productos_contractuales` | Cascade | 3 productos + 5 hitos totales + monto calculado correcto |
| `social_requiere_entidad_estatal` | Validación | 422 con `entidad_estatal_id` en errores |
| `privado_requiere_cliente` | Validación | 422 con `cliente_id` en errores |
| `fases_config_suma_distinta_de_100_retorna_422` | Validación | Suma 60+30=90% → 422 |
| `productos_suma_distinta_de_100_retorna_422` | Validación | Suma 40+40=80% → 422 |
| `producto_con_fecha_fuera_de_rango_retorna_422` | Validación | Fecha anterior al proyecto → 422 |
| `fecha_fin_antes_de_inicio_retorna_422` | Validación | 422 con `fecha_fin_planificada` en errores |
| `fallo_en_cascada_hace_rollback_completo` | Rollback | 0 proyectos, 0 almacenes, 0 viviendas, 0 hitos en BD |
| `crear_proyecto_sin_permiso_retorna_403` | Permisos | Usuario sin `proyectos.crear` → 403 |
| `filtrar_proyectos_por_categoria` | Filtros | Solo retorna categoría solicitada |
| `busqueda_por_nombre_retorna_resultados_correctos` | Búsqueda | Búsqueda parcial por nombre |
| `paginacion_funciona_correctamente` | Paginación | 5 registros, per_page=2 → last_page=3 |
| `estadisticas_retornan_estructura_esperada` | API | Estructura `{total, por_estado, por_categoria, avance_promedio}` |
| `codigo_proyecto_se_genera_automaticamente` | Código | Formato `PRJ-{año}-{4 dígitos}` |
| `proyectos_consecutivos_tienen_codigos_distintos` | Código | Dos proyectos seguidos = códigos únicos |

---

## 4. Suite Completa — Estado Final

```
Tests: 120 passed (359 assertions)
Build: SUCCESS (vite 7.3.2, 5.33s)
Migrations: ALL DONE (fresh --seed)
```

---

## 5. Fixes Realizados Durante la Implementación

1. **Migration order**: `items_checklist` (000407) renombrado a 000701 para ejecutarse después de `fases_proyecto` (000700) — FK cascadeOnDelete a `fases_proyecto.id` fallaba.
2. **`PlantillaChecklist::paraObraTipo()` return type**: Cambiado de `self` a `?self` para permitir null cuando no hay plantillas sembradas.
3. **`ProyectoController.store()` permission check**: Añadido check `hasPermissionTo('proyectos.crear')` para soportar test 403.
4. **Test helpers**: `ProyectosCascadaTest::cliente()` necesitaba `nombre_completo`, `documento_tipo`, `documento_numero`, `telefono_principal` (todos NOT NULL en `clientes`).
5. **`ProyectosCrudTest::test_codigo_generado_automaticamente`**: Faltaba `entidad_estatal_id` para proyecto social — validación del servicio fue endurecida.

---

## 6. Arquitectura para Sub-fase B

Los tabs pendientes en `DetalleProyecto.jsx` tienen `PlaceholderTab` listo para ser reemplazado:

- **Personal** → `AsignacionPersonalController` (endpoints ya en api.php)
- **Almacén** → `AlmacenController` (modelo `Almacen` creado)
- **Asistencia** → Nuevo módulo
- **Avance** → `FaseProyectoController` + `ItemChecklist` (ya en BD)
- **Cronograma** → `HitoController` (modelo `Hito` creado, datos ya en BD)
- **Reportes** → ReporteController por proyecto

---

*Generado automáticamente — CA & KANAGF S.R.L. ERP*
