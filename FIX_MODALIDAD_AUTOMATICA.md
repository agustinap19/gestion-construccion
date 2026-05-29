# Fix — Modalidad Automática (eliminar Paso "Modalidad")

## Cambio
El Paso 3 "Modalidad de entrega" se eliminó del modal. El sistema detecta automáticamente
si la entrega es **total** o **parcial** comparando la cantidad entregada vs el teórico restante.

**Regla:** `cantidad_entregada >= teorico_restante × 0.95` → total (tolerancia del 5%)

---

## Archivos modificados

### `resources/js/pages/admin/almacenes/EntregaSocialModal.jsx`
- `PASOS` → `['Beneficiario', 'Ítem & Materiales', 'Evidencias', 'Confirmar']` (4 items, era 5)
- Eliminado `case 2` (componente de selección total/parcial)
- Eliminado estado `modalidad`
- Cases renumerados: Evidencias=2, Confirmar=3
- `puedeAvanzar` → array de 4 entradas (era 5)
- `handleSubmit` → no envía `modalidad_entrega` al backend
- Paso 3 (Confirmar) → badge verde "Entrega total — ítem se marcará como terminado" o "Entrega parcial" con detección calculada en frontend usando la misma regla del 95%
- Detección frontend: `modalidadDetectada` como valor computado (sin estado)

### `app/Http/Controllers/Api/MovimientoAlmacenController.php`
- `modalidad_entrega` validator: `'required|in:total,parcial'` → `'nullable|in:total,parcial'`
- Permite que el frontend envíe el request sin este campo

### `app/Services/Almacenes/EntregaService.php`

**Nuevo método `detectarModalidad()`:**
```php
// Llamado ANTES de persistir detalles (entregadoAntes no incluye entrega actual)
private function detectarModalidad(PresupuestoItemProyecto $itemPpto, array $materiales): string
// Si para algún material: cantidad < teoricoRestante × 0.95 → 'parcial'
// Si todos cubren >= 95% → 'total'
```

**Método `actualizarAvanceItem()` corregido:**
- Firma cambiada: `(PresupuestoItemProyecto $item, string $modalidad)` — ya no recibe `array $materiales`
- Formula avance parcial corregida:
  ```
  // ANTES (buggy con FIX 3): calcularPorcentajeConsumo(item, mat, 0) → siempre 0
  // AHORA: ya_entregado_total / teorico_total × 100 (post-delivery, incluye entrega actual)
  ```
- Itera sobre `itemConstructivo.receta` para computar avance por material

---

## Tests nuevos
**Archivo:** `tests/Feature/Movimientos/ModalidadAutomaticaTest.php`

| Test | Escenario | Estado |
|---|---|---|
| `test_entrega_del_95_porciento_o_mas_marca_item_terminado` | 9.5/10 = 95% → total + terminado | ✅ Verde |
| `test_entrega_exacta_del_100_porciento_marca_item_terminado` | 10/10 = 100% → total + terminado | ✅ Verde |
| `test_entrega_menor_al_95_porciento_registra_avance_parcial` | 5/10 = 50% → parcial + avance 50% | ✅ Verde |
| `test_entrega_del_94_porciento_es_parcial` | 9.4/10 = 94% → parcial | ✅ Verde |
| `test_stepper_tiene_4_pasos_no_5` | Sin `modalidad_entrega` en request → 201 OK | ✅ Verde |

```
Tests totales (este fix + fixes anteriores): 17 passed (82 assertions)
```

---

## Checklist manual
- [x] Stepper muestra 4 pasos: Beneficiario → Ítem & Materiales → Evidencias → Confirmar
- [x] Sin paso "Modalidad" en el stepper
- [x] Paso Confirmar: badge "Entrega total — ítem se marcará como terminado" si >= 95%
- [x] Paso Confirmar: badge "Entrega parcial" si < 95%
- [x] Al confirmar con 100% → ítem queda terminado en el dashboard
- [x] Al confirmar con 50% → avance se actualiza proporcionalmente
- [x] Sin errores en consola
