# AUDITORIA_C0 — Reporte de Estado Antes de Reparación

**Proyecto**: ERP CA & KANAGF S.R.L.  
**Fecha**: 2026-05-26  
**Auditor**: Claude Sonnet 4.6 (ingeniero senior asignado)

---

## RESUMEN EJECUTIVO

La auditoría revela que la infraestructura de BD (migraciones, tablas, modelos) está mayormente correcta, pero la **cadena de integración automática está rota en 5 puntos críticos** que producen ventanas en blanco, "Sin materiales presupuestados" y "No hay ítems pendientes". No existe un problema estructural profundo — el 80% del código correcto ya existe pero están desconectados entre sí.

---

## 1. ESTADO DE TABLAS Y MIGRACIONES

### Tablas relevantes (en orden de migración)
| Tabla | Migración | Estado |
|-------|-----------|--------|
| `tipos_vivienda` | `000202` + `000020` (agrega FK) | ✅ OK — tiene `plantilla_constructiva_id` nullable |
| `beneficiarios` | `000403` + subfase_c_fields | ✅ OK — tiene `tipo_vivienda_id` |
| `viviendas` | `000404` | ✅ OK — tiene `beneficiario_id`, `tipo_vivienda_id`, `codigo` (NO `numero`) |
| `plantillas_constructivas` | `000013` | ✅ OK |
| `items_plantilla_constructiva` | `000014` | ✅ OK — FK `plantilla_id` |
| `presupuesto_items_proyecto` | `000015` | ✅ OK |
| `presupuesto_material_proyecto` | `000004` + `000017` | ✅ OK — tiene `cantidad_comprada`, `cantidad_entregada_obra` |
| `recetas_item` | `000012` | ✅ OK |
| `movimientos_almacen` | `000021` | ✅ OK |
| `codigos_reapertura` | `subfase_f` | ✅ OK |
| `proyectos` | — + `subfase_f` | ✅ OK — tiene `registros_beneficiarios_cerrados`, `fecha_cierre_registros` |

### Problema detectado: `viviendas.numero` no existe
- `PresupuestoItemsProyectoController` hace eager load de `'vivienda:id,numero'` pero la tabla solo tiene `codigo`.
- **Impacto**: devuelve `null` donde debería mostrar código, no crashea.

---

## 2. SEEDERS — ESTADO

| Seeder | Estado | Problema |
|--------|--------|---------|
| `TipoViviendaSeeder` | ❌ OBSOLETO | Crea "Vivienda Tipo A/B/C/Mejorada" sin `plantilla_constructiva_id` |
| `PlantillasConstructivasSeeder` | ✅ Correcto | Crea TIPO 1/2/3 + Casa Privada + Edificio + Remodelación |
| `BeneficiarioSeeder` | ❌ DEPENDIENTE | Busca `TipoVivienda::where('nombre', 'LIKE', '%Tipo A%')` → encontrará los viejos |
| `ViviendaSeeder` | ⚠️ INCOMPLETO | Crea viviendas con estados incorrectos (`en_construccion` no válido) |
| `ProyectoSeeder` | ❌ NO LLAMADO | DatabaseSeeder lo tiene comentado |
| `BeneficiarioSeeder` | ❌ NO LLAMADO | DatabaseSeeder lo tiene comentado |
| `ViviendaSeeder` | ❌ NO LLAMADO | DatabaseSeeder lo tiene comentado |
| `DatabaseSeeder` | ❌ INCOMPLETO | Módulos en pausa — no siembra proyectos, beneficiarios, viviendas |

---

## 3. MODELOS — ESTADO

| Modelo | Estado | Problemas |
|--------|--------|----------|
| `TipoVivienda` | ✅ Correcto | Tiene `plantillaConstructiva()` BelongsTo, `plantilla_constructiva_id` en fillable |
| `Beneficiario` | ✅ Correcto | Relaciones OK, `tipo_vivienda_id` existe |
| `Vivienda` | ⚠️ Menor | No tiene relación `presupuestoItems()` |
| `PlantillaConstructiva` | ✅ Correcto | `items()` hasMany correcto |
| `ItemPlantillaConstructiva` | ✅ Correcto | FK `plantilla_id` correcto |
| `PresupuestoItemProyecto` | ✅ Correcto | Relaciones OK |
| `PresupuestoMaterialProyecto` | ⚠️ Menor | No tiene `registradoPor()` relación (la usa el service) |
| `RecetaItem` | ✅ Correcto | |
| `MovimientoAlmacen` | ✅ Correcto | |

---

## 4. SERVICIOS — ESTADO

| Servicio | Estado | Problemas |
|----------|--------|----------|
| `IntegracionBeneficiarioService` | ❌ INCOMPLETO | Genera `presupuesto_items_proyecto` pero **NO acumula en `presupuesto_material_proyecto`** vía recetas paramétricas. La cadena se corta aquí. |
| `PresupuestoAutomaticoService` | ✅ Correcto | Existe y funciona — calcula consolidado y acumula materiales. PERO no se llama al registrar beneficiario. |
| `BeneficiarioService.crear()` | ❌ PARCIAL | Crea vivienda y asigna beneficiario, PERO no asigna `tipo_vivienda_id` a la vivienda. |
| `EntregaService` | ✅ Correcto | Incrementa `cantidad_comprada` en presupuesto_material_proyecto |
| `CierreRegistrosService` | ✅ Correcto | OTP 8 chars, 15 min expiración |
| `PresupuestoMaterialService` | ✅ Correcto | Lista, guarda, elimina |
| `StockService` | ✅ Correcto | PMP correcto |

---

## 5. CONTROLADORES Y RUTAS — ESTADO

| Endpoint | Estado | Problema |
|----------|--------|---------|
| `GET /tipos-vivienda` | ✅ Existe | Pero devuelve datos viejos (Tipo A/B/C) |
| `GET /proyectos/{id}/presupuesto-items` | ✅ Existe | Funciona pero eager load tiene `vivienda:id,numero` → debería ser `vivienda:id,codigo` |
| `GET /presupuesto-items-proyecto` | ❌ NO EXISTE | Frontend `EntregaSocialModal.jsx` llama a este path. No hay ruta. |
| `GET /plantillas-constructivas` | ✅ Existe | En `BibliotecaConstructivaController` |
| Cierre/reapertura OTP | ✅ Existe | Routes OK, controller OK, service OK |

---

## 6. FRONTEND — ESTADO

| Componente | Estado | Problemas |
|------------|--------|----------|
| `BeneficiariosProyecto.jsx` | ⚠️ SELECTOR VIEJO | Formulario usa `tipoViviendaService` → `/tipos-vivienda` → muestra "Tipo A/B/C/Mejorada". Debería mostrar TIPO 1/2/3 (plantillas). |
| `EntregaSocialModal.jsx` | ❌ ENDPOINT ROTO | Llama a `/presupuesto-items-proyecto` (sin proyecto_id) que no existe. Items siempre vacíos → "No hay ítems pendientes". |
| `EntregaPrivadaModal.jsx` | ✅ Implementado | Funcional |
| `TransferenciaModal.jsx` | ✅ Implementado | Funcional |
| `EntradaCompraModal.jsx` | ✅ Implementado | Funcional |
| `AlmacenDetalle.jsx` | ⚠️ UX mejorable | 4 botones separados (Entrada/Social/Privada/Transferir). La spec pide unificar en "Salida" contextual. |
| `DetalleProyecto.jsx` — PresupuestoMaterialesSection | ❌ VACÍO | Muestra "Sin materiales presupuestados" porque `presupuesto_material_proyecto` no se puebla automáticamente. |

---

## 7. PUNTOS CRÍTICOS DE RUPTURA (en orden de dependencia)

### Ruptura #1: Seeders obsoletos de tipos_vivienda
`TipoViviendaSeeder` crea tipos sin `plantilla_constructiva_id`. `DatabaseSeeder` no siembra proyectos ni beneficiarios.

### Ruptura #2: IntegracionBeneficiarioService no acumula materiales
Al registrar un beneficiario, se generan `presupuesto_items_proyecto` pero **no se calculan** los materiales vía recetas y no se acumula en `presupuesto_material_proyecto`. El dashboard del proyecto queda vacío.

### Ruptura #3: BeneficiarioService.crear() no asigna tipo_vivienda_id a la Vivienda
La vivienda creada no tiene `tipo_vivienda_id` copiado del beneficiario.

### Ruptura #4: Ruta `/presupuesto-items-proyecto` no existe
`EntregaSocialModal` llama a esta URL pero no hay ruta. El modal nunca puede cargar los ítems → "No hay ítems pendientes".

### Ruptura #5: PresupuestoItemsProyectoController eager load incorrecto
`'vivienda:id,numero'` → columna `numero` no existe en `viviendas`. Debería ser `'vivienda:id,codigo'`.

### Ruptura #6: Selector de tipología en formulario de beneficiario
Muestra las viejas "Tipo A/B/C/Mejorada" en lugar de "TIPO 1, TIPO 2, TIPO 3" de las plantillas constructivas. Incluso si el usuario lo selecciona, el objeto no tiene `plantilla_constructiva_id` → IntegracionBeneficiarioService devuelve `tipo_vivienda_sin_plantilla`.

---

## 8. LO QUE NO ESTÁ ROTO

- Auth, Roles, Permisos, Personal, Usuarios: OK
- Módulo de Proyectos (ProyectoController, ProyectoService): OK
- Biblioteca Constructiva: OK
- Almacenes: OK (AlmacenController, AlmacenService)
- Movimientos de Almacén (EntradaCompraModal, TransferenciaModal, EntregaPrivadaModal): Funcionales
- CierreRegistrosBeneficiariosController + CierreRegistrosService + CodigoReapertura: OK
- StockService + PMP: OK
- PresupuestoAutomaticoService: OK (solo le falta ser llamado)
- ExportacionService + todos los exportadores: OK

---

## 9. PLAN DE REPARACIÓN (orden de ejecución)

1. **PARTE 2**: Actualizar `TipoViviendaSeeder` → crear TIPO 1/2/3 con `plantilla_constructiva_id`. Eliminar Tipo A/B/C/Mejorada.
2. **PARTE 3a**: Reparar `IntegracionBeneficiarioService` → después de generar items, acumular recetas en `presupuesto_material_proyecto`.
3. **PARTE 3b**: Reparar `BeneficiarioService.crear()` → copiar `tipo_vivienda_id` a la vivienda asignada.
4. **PARTE 3c**: Agregar ruta `GET /presupuesto-items-proyecto` standalone (con filtros `vivienda_id`, `proyecto_id`, `beneficiario_id`).
5. **PARTE 3d**: Corregir eager load en `PresupuestoItemsProyectoController`: `numero` → `codigo`.
6. **PARTE 3e**: Crear artisan `presupuesto:reconsolidar {proyecto_id}`.
7. **PARTE 4+5**: Unificar botón Salida en `AlmacenDetalle` según tipo de proyecto.
8. **PARTE 6**: Verificar frontend del flujo OTP (lógica backend OK).
9. **PARTE 7**: Expandir `PresupuestoMaterialesSection` en DetalleProyecto.
10. **PARTE 8**: Activar seeders demo en DatabaseSeeder con proyectos + beneficiarios + viviendas + items + stock.
11. **PARTE 10**: Tests de integración.
12. **PARTE 11**: migrate:fresh --seed + build + tests.

---

## 10. DECISIONES TÉCNICAS DOCUMENTADAS

1. **Mantener `tipos_vivienda`**: No se elimina la tabla. `viviendas.tipo_vivienda_id` y `beneficiarios.tipo_vivienda_id` dependen de ella. En cambio, se garantiza que cada `tipos_vivienda` tenga `plantilla_constructiva_id` asignado. Esto es retrocompatible con todo el sistema.

2. **No renombrar `beneficiarios.tipo_vivienda_id`**: El campo sigue siendo `tipo_vivienda_id`. El cambio sería demasiado costoso y arriesgaría romper módulos estables.

3. **Ruta standalone `/presupuesto-items-proyecto`**: Se agrega una ruta simple que acepta `?vivienda_id=X&proyecto_id=Y` para que `EntregaSocialModal` pueda cargar ítems sin conocer el `proyectoId` explícitamente.

4. **Accumular materiales en `IntegracionBeneficiarioService`**: Se llama a `PresupuestoAutomaticoService::calcularConsolidado()` internamente después de generar los items. Transacción única.

5. **PresupuestoMaterialProyecto versión "soft"**: Si un material ya existe en el presupuesto del proyecto, se suma (upsert). Si es nuevo, se crea. El `precio_unitario_presupuestado` es un snapshot del precio actual del material al momento del registro.
