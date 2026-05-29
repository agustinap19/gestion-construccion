# AUDITORIA_TRAZABILIDAD.md
## Sub-fase C.1 — Diagnóstico de Estado Actual

### 1. Esquema actual de `presupuesto_material_proyecto`

**Columnas existentes (tras migración subfase_b):**
| Columna | Tipo | Default | Semántica actual |
|---------|------|---------|------------------|
| `id` | bigint | AUTO | PK |
| `proyecto_id` | bigint FK | — | Proyecto dueño |
| `material_id` | bigint FK | — | Material |
| `cantidad_total_planificada` | decimal(12,4) | — | Planificado teórico |
| `precio_unitario_presupuestado` | decimal(12,4) | — | Precio snapshot |
| `monto_total` | decimal(14,4) STORED | computed | planificada × precio |
| `cantidad_ajustada` | decimal(12,4) | NULL | Sin uso activo |
| `cantidad_comprada` | decimal(12,4) | 0 | Histórico de compras ✅ |
| `cantidad_en_almacen_proyecto` | decimal(12,4) | 0 | Stock actual del proyecto ⚠️ NO se actualiza |
| `cantidad_entregada_obra` | decimal(12,4) | 0 | Salidas sociales ✅ |
| `bloqueado` | boolean | false | Bloqueo manual |
| `bloqueado_por_id` | bigint FK | NULL | — |
| `bloqueado_en` | timestamp | NULL | — |
| `notas` | text | NULL | — |
| `registrado_por_id` | bigint FK | NULL | — |
| `timestamps`, `deleted_at` | — | — | — |

**COLUMNAS FALTANTES:**
- ❌ `cantidad_devuelta_central` — transferencias al almacén central
- ❌ `cantidad_merma` — pérdidas/mermas
- ❌ `cantidad_retrabajo` — material de retrabajo

**RENOMBRADO NECESARIO:**
- `cantidad_en_almacen_proyecto` → se mantiene el nombre (está en código), pero SÍ se actualizará correctamente

---

### 2. Cómo se actualiza hoy cada columna

**`cantidad_comprada`** → `EntregaService::registrarEntrada()` línea 82-85
```php
PresupuestoMaterialProyecto::where('proyecto_id', $data['proyecto_id'])
    ->where('material_id', $mat['material_id'])
    ->increment('cantidad_comprada', $mat['cantidad']);
```
✅ Correcto — solo se incrementa en compras

**`cantidad_entregada_obra`** → `EntregaService::registrarSalidaSocial()` línea 178-180
```php
PresupuestoMaterialProyecto::where('proyecto_id', $itemPpto->proyecto_id)
    ->where('material_id', $mat['material_id'])
    ->increment('cantidad_entregada_obra', $mat['cantidad']);
```
✅ Correcto — solo en salidas sociales

**`cantidad_en_almacen_proyecto`** → ❌ NUNCA SE ACTUALIZA en ningún service

**Transferencias** → `EntregaService::registrarTransferencia()` línea 261-311
→ ❌ No actualiza NADA en presupuesto_material_proyecto

**Anulaciones** → `EntregaService::anular()` línea 315-360
→ ❌ No actualiza NADA en presupuesto_material_proyecto

**`confirmarRecepcionTransferencia()`** → línea 364-376
→ ❌ Solo cambia `estado` a 'completado', no actualiza presupuesto

---

### 3. Origen de los datos en el frontend

**Endpoint:** `GET /api/proyectos/{id}/presupuesto-materiales`
→ `PresupuestoMaterialController::indexPorProyecto()`
→ `PresupuestoMaterialService::listarPorProyecto()`
→ `PresupuestoMaterialService::formatearItem()`

```php
// Lo que retorna actualmente:
'cantidad_comprada'       => (float) ($p->cantidad_comprada ?? 0),      // campo BD
'cantidad_entregada_obra' => (float) ($p->cantidad_entregada_obra ?? 0), // campo BD
// No retorna: en_almacen, devuelta_central, merma, retrabajo
```

**El "Comprado" en frontend = `cantidad_comprada` (campo cacheado en BD)** ✅ semántica correcta
**El "Entregado" en frontend = `cantidad_entregada_obra` (campo cacheado en BD)** ✅ correcto
**El "En Almacén" = NO EXISTE en el response actual** → el frontend NO muestra esto

---

### 4. Archivos relevantes

| Archivo | Rol |
|---------|-----|
| `app/Models/PresupuestoMaterialProyecto.php` | Modelo — falta fillable de nuevas columnas |
| `app/Services/Almacenes/EntregaService.php` | Service movimientos — hooks incompletos |
| `app/Services/Almacenes/PresupuestoMaterialService.php` | Service presupuesto — formatearItem incompleto |
| `app/Http/Controllers/Api/PresupuestoMaterialController.php` | Controller — OK |
| `database/migrations/2026_05_26_000017_update_presupuesto_material_proyecto_subfase_b.php` | Schema existente |
| `resources/js/services/presupuestoMaterialService.js` | Service frontend |
| `resources/js/pages/admin/proyectos/DetalleProyecto.jsx` | Tabla de materiales |

---

### 5. Bugs confirmados

1. **`cantidad_en_almacen_proyecto` nunca se actualiza** — siempre queda en 0
2. **Transferencias al central no registran `cantidad_devuelta_central`** — columna no existe
3. **Anulaciones no revierten las columnas cacheadas** — deja datos inconsistentes
4. **Salidas privadas no actualizan ninguna columna** — desfase contable
5. **`confirmarRecepcionTransferencia` no actualiza presupuesto** — incompleto
6. **Identidad contable no se verifica** — no hay mecanismo de detección

---

### 6. Plan de corrección (confirmado)

**Migración a crear:** agregar `cantidad_devuelta_central`, `cantidad_merma`, `cantidad_retrabajo`
**Service nuevo:** `TrazabilidadMaterialesService` con recálculo completo desde movimientos
**Hooks a agregar:** en TODOS los métodos de EntregaService que afectan stock
**Comando:** `php artisan presupuesto:reconciliar`
**Frontend:** tabla con 6 columnas + detalle por click + indicador identidad contable
