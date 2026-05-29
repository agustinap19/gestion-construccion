# Fix — Modal Entrega Social (3 fixes quirúrgicos)

## Diagnóstico previo

### FIX 1 — Firma digital
- **Componente**: `FirmaCanvas` usando librería `signature_pad` en `case 3` (Paso 4 Evidencias)
- **Estado en BD**: `evidencias_movimiento.tipo` tiene enum `['foto','firma','documento']` — la columna existe y se deja intacta
- **Sin columna dedicada** `firma_receptor_base64` en `movimientos_almacen` — no había nada que marcar nullable
- **Causa**: las firmas manuscritas van en el PDF impreso; el canvas digital era innecesario y añadía fricción

### FIX 2 — Materiales sin stock
- **Endpoint inexistente**: No había `GET /api/presupuesto-items-proyecto/{pipId}/receta-con-stock/{almacenId}`
- **Síntoma**: Paso 2 mostraba materiales de la receta (Arena, Agua) con sugerencia de cantidad aunque tuvieran stock 0 en el almacén, permitiendo ingresarlos
- **Causa**: la receta eager-loaded no incluía info de stock real del almacén

### FIX 3 — Porcentaje de tolerancia
- **Fórmula incorrecta**: `(ya_entregado + nueva) / teórico_total × 100`
  - Ejemplo: total=16, ya=10, nueva=8 → `(10+8)/16 = 112.5%` → clasificaba como "alerta" pero subestimaba
- **Fórmula correcta**: `nueva / teórico_restante × 100`
  - Ejemplo: total=16, ya=10, restante=6, nueva=8 → `8/6 = 133.33%` → "requiere justificación" correctamente

---

## Archivos modificados

### Backend

#### `app/Http/Controllers/Api/PresupuestoItemsProyectoController.php`
Nuevo método `recetaConStock`:
- Carga receta del ítem constructivo
- Para cada material: stock en almacén + ya_entregado + teórico_restante + item_completo
- Sin N+1: bulk load de `StockMaterial` + `DetalleMovimientoAlmacen` via `keyBy`

#### `app/Services/Almacenes/EntregaService.php`
Método `calcularPorcentajeConsumo` — fórmula corregida:
```php
// ANTES (incorrecto)
$totalConNuevo = $entregadoAntes + $nuevaCantidad;
return round(($totalConNuevo / $cantidadPlanificada) * 100, 2);

// DESPUÉS (correcto)
$teoricoRestante = $teoricoTotal - $entregadoAntes;
if ($teoricoRestante <= 0) return $nuevaCantidad > 0 ? 9999.0 : 0.0;
return round(($nuevaCantidad / $teoricoRestante) * 100, 2);
```

#### `routes/api.php`
Nueva ruta:
```php
Route::get('/presupuesto-items-proyecto/{pipId}/receta-con-stock/{almacenId}',
    [PresupuestoItemsProyectoController::class, 'recetaConStock']);
```

### Frontend

#### `resources/js/pages/admin/almacenes/EntregaSocialModal.jsx`

**FIX 1:**
- Eliminado `import SignaturePad from 'signature_pad'`
- Eliminado `useRef` del import (solo lo usaba `FirmaCanvas`)
- Eliminado componente `FirmaCanvas`
- Eliminado estado `firma`
- Paso 4 (Evidencias) = solo foto + GPS + nota "Las firmas van en el PDF"
- `handleSubmit`: validación cambiada de `!foto && !firma` → `!foto`
- Evidencias enviadas: solo `foto`, sin `firma`

**FIX 2:**
- Al seleccionar ítem → fetch `receta-con-stock` que devuelve `tiene_stock`, `cantidad_disponible_almacen`, `item_completo`
- Badge rojo "Sin stock" cuando `tiene_stock = false`, input deshabilitado
- Badge azul "Ítem completo" cuando `item_completo = true`, input deshabilitado
- Alerta por fila: "X: intentas entregar Y pero solo hay Z disponibles"
- `puedeAvanzar[1]` extendido con: `!hayStockExcedido && !hayEntregaSinStock && !hayAlertaSinJustificar`
- Loading state (`loadingLineas`) mientras se fetcha la receta

**FIX 3:**
- `NivelConsumo` maneja `pct >= 9999` → badge "Ítem completo — sin restante" (sky)
- Justificación movida de textarea global → inline por fila (aparece debajo de la fila cuando `val.nivel === 'alerta'`)
- `puedeAvanzar[1]` incluye `!hayAlertaSinJustificar` (todas las alertas deben tener justificación)
- `handleSubmit`: concatena justificaciones por-fila en `justificacion_sobre_consumo`

---

## Tests nuevos
**Archivo**: `tests/Feature/Movimientos/ModalEntregaSocialTest.php`

| Test | Estado |
|---|---|
| `test_material_sin_stock_aparece_deshabilitado_en_receta` | ✅ Verde |
| `test_material_con_stock_aparece_habilitado_en_receta` | ✅ Verde |
| `test_no_se_puede_avanzar_si_cantidad_excede_stock_disponible` | ✅ Verde |
| `test_porcentaje_tolerancia_usa_teorico_restante` | ✅ Verde |
| `test_item_completo_deshabilita_materiales` | ✅ Verde |
| `test_paso_4_no_tiene_firma_digital` | ✅ Verde |
| `test_paso_4_requiere_permiso` | ✅ Verde |

```
Tests: 12 passed (MaterialesConStock + ModalEntregaSocial)
```

---

## Checklist manual

- [x] Paso 4: SIN canvas de firma, solo foto + GPS + nota sobre PDF
- [x] Paso 2: materiales sin stock → badge rojo "Sin stock", input deshabilitado
- [x] Paso 2: materiales con ítem completo → badge azul "Ítem completo", input deshabilitado  
- [x] Paso 2: cantidad > disponible → alerta roja por fila + botón "Siguiente" bloqueado
- [x] Paso 2: alerta de sobre-consumo (133%) → textarea inline por fila, no global
- [x] Porcentaje: 8 bolsas nueva entrega / 6 restantes = 133.33% (no 112.5%)
- [x] Ítem completo: teórico_restante = 0 → validarConsumo retorna 9999% → bloqueado
- [x] Flujo completo hasta Paso 5 y confirmar → entrega registrada sin errores
- [x] Sin errores en consola
