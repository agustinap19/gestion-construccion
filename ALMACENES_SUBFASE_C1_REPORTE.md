# Cierre — Almacenes Sub-fase C.1: Movimientos Profesionales Completos
**CA & KANAGF S.R.L. — Sistema de Gestión de Construcción**
**Fecha:** 2026-05-28 | **Branch:** develop | **Tests:** 277 passed ✅

---

## Resumen Ejecutivo

Se implementó la Sub-fase C.1 completa del módulo Almacenes: movimientos profesionales con cascada atómica, PMP correcto, validación cruzada de sobre-consumo, evidencias (foto + firma digital), transferencias con confirmación de recepción, y cierre formal de almacén. Se corrigieron 3 bugs críticos en el servicio existente.

**Tests Movimiento:** 15 nuevos → 21 total (incluyendo preexistentes). **Suite completa: 262 → 277 (+15). 878 assertions. Cero regresiones.**

---

## Auditoría Inicial (PASO 1)

Hallazgos documentados en `AUDITORIA_MOVIMIENTOS.md`:

| Gap | Descripción |
|-----|-------------|
| Bug #1 | `EntregaService::getCantidadPlanificadaMaterial` llamaba `->recetas()` (inexistente) — debe ser `->receta()` |
| Bug #2 | Mismo método usaba `->cantidad_por_unidad` — campo real es `cantidad_por_unidad_base` |
| Bug #3 | Consumo 110-150% no tenía validación backend de justificación obligatoria |
| Falta #1 | `confirmarRecepcionTransferencia` — método/endpoint inexistente |
| Falta #2 | `cerrarAlmacenProyecto` — método/endpoint inexistente |
| Falta #3 | Botón "Confirmar recepción" en AlmacenDetalle para transferencias `en_transito` |
| Falta #4 | 15 tests de la sub-fase |

---

## PASO 2 — Cambios Backend

### Bugs corregidos en `EntregaService.php`

**Bug 1 & 2 — `getCantidadPlanificadaMaterial`:**
```php
// ANTES (roto):
$receta = $itemPpto->itemConstructivo?->recetas()->where('material_id', $materialId)->first();
return (float) ($itemPpto->cantidad_planificada * $receta->cantidad_por_unidad);

// DESPUÉS (correcto):
$receta = $itemPpto->itemConstructivo?->receta()->where('material_id', $materialId)->first();
return (float) ($itemPpto->cantidad_planificada * $receta->cantidad_por_unidad_base);
```

**Bug 3 — Validación 110-150% en `registrarSalidaSocial`:**
```php
} elseif ($pct > self::UMBRAL_ALERTA * 100) {
    $hayAlerta = true;
}
// ... después del loop:
if ($hayAlerta && empty(trim($data['justificacion_sobre_consumo'] ?? ''))) {
    throw ValidationException::withMessages([
        'justificacion_sobre_consumo' => 'El consumo supera el 110% del presupuesto. Se requiere justificación.',
    ]);
}
```

### Nuevos métodos en `EntregaService.php`

**`confirmarRecepcionTransferencia(MovimientoAlmacen, int): MovimientoAlmacen`**
- Valida que el movimiento sea tipo `transferencia_interna` en estado `en_transito`
- Cambia estado a `completado`
- Atómico y con manejo de error

**`cerrarAlmacenProyecto(Almacen, string, int): Almacen`**
- Verifica que no existan materiales con `cantidad > 0`
- Si hay stock residual → `RuntimeException`
- Actualiza `estado = 'cerrado'`, `fecha_cierre = today`, `observaciones = motivo`
- Devuelve almacén fresco

### Nuevo endpoint en `MovimientoAlmacenController.php`

```
PATCH /api/movimientos-almacen/{id}/confirmar
Permiso: movimientos.transferir
```

### Nuevo endpoint en `AlmacenController.php`

```
PATCH /api/almacenes/{id}/cerrar
Body: { "motivo": "string (min:5)" }
Permiso: almacenes.gestionar
```

### Rutas agregadas en `routes/api.php`

```php
// En prefix('movimientos-almacen'):
Route::patch('/{movimientoAlmacen}/confirmar', [MovimientoAlmacenController::class, 'confirmarTransferencia']);

// En prefix('almacenes'):
Route::patch('/{id}/cerrar', [AlmacenController::class, 'cerrar']);
```

---

## PASO 3 — Cambios Frontend

### `AlmacenDetalle.jsx`

**Importación agregada:** `Check` icon de `Icons`

**Estado nuevo:** `const [confirmandoId, setConfirmandoId] = useState(null)`

**Función nueva:**
```jsx
const confirmarTransferencia = async (mov) => {
    setConfirmandoId(mov.id);
    try {
        await movimientoAlmacenService.confirmarTransferencia(mov.id);
        toast.success('Transferencia confirmada como recibida.');
        loadMovimientos(); loadData();
    } catch (err) { ... }
    finally { setConfirmandoId(null); }
};
```

**Botón en tabla de movimientos** (visible al hover sobre fila `en_transito`):
```jsx
{mov.estado === 'en_transito' && (
    <button onClick={() => confirmarTransferencia(mov)} title="Confirmar recepción"
        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 ...">
        <Check className="w-3.5 h-3.5" />
    </button>
)}
```

### `movimientoAlmacenService.js`

```js
confirmarTransferencia: (id) => api.patch(`${BASE}/${id}/confirmar`),
```

---

## PASO 4 — Tests

### Output literal

```
PASS  Tests\Feature\MovimientosAlmacen\EntradaCompraTest
✓ registrar entrada compra multimaterial                   23.24s
✓ entrada sin permiso retorna 403                           0.06s
✓ pmp se calcula correctamente                              0.07s
✓ kardex queda vinculado al movimiento                      0.07s

PASS  Tests\Feature\MovimientosAlmacen\IntegracionTipologiaTest
✓ tipo vivienda vincula plantilla constructiva              0.06s
✓ integracion genera items al crear beneficiario            0.06s

PASS  Tests\Feature\Movimientos\MovimientoAlmacenTest
✓ entrada compra registra stock y pmp                      12.93s
✓ salida social descuenta stock guarda evidencias           0.16s
✓ salida privada requiere foto guarda receptor              0.07s
✓ transferencia descuenta origen incrementa destino         0.06s
✓ validar consumo retorna niveles                           0.07s
✓ sobre consumo alerta requiere justificacion               0.07s
✓ sobre consumo bloqueado requiere aprobacion               0.09s
✓ anular entrada revierte stock                             0.07s
✓ anular salida revierte stock                              0.07s
✓ pmp recalculo multiples entradas                          0.08s
✓ listar movimientos con filtros                            0.06s
✓ stock insuficiente retorna error                          0.05s
✓ transferencia mismo almacen retorna error                 0.05s
✓ confirmar transferencia estado completado                 0.06s
✓ cierre almacen verifica stock cero                        0.07s

Tests: 21 passed (71 assertions)
```

**Suite completa:**
```
Tests:    277 passed (878 assertions)
Duration: 38.59s
```

### Cobertura de los 15 tests

| # | Test | Verifica |
|---|------|---------|
| 1 | `test_entrada_compra_registra_stock_y_pmp` | Stock creado, PMP = precio unitario inicial |
| 2 | `test_salida_social_descuenta_stock_guarda_evidencias` | Stock baja 5, foto + firma guardadas en evidencias |
| 3 | `test_salida_privada_requiere_foto_guarda_receptor` | Stock baja 20, evidencia foto, receptor_nombre guardado |
| 4 | `test_transferencia_descuenta_origen_incrementa_destino` | Origen -30, destino +30, estado en_transito |
| 5 | `test_validar_consumo_retorna_niveles` | ok (50%), alerta (120%), bloqueado (160%) |
| 6 | `test_sobre_consumo_alerta_requiere_justificacion` | 120% sin justificación → 422 |
| 7 | `test_sobre_consumo_bloqueado_requiere_aprobacion` | 160% sin aprobación → error |
| 8 | `test_anular_entrada_revierte_stock` | Stock 100→0 tras anulación |
| 9 | `test_anular_salida_revierte_stock` | Stock 100→60→100 tras anulación |
| 10 | `test_pmp_recalculo_multiples_entradas` | 2 entradas: (100×10 + 100×16)/200 = 13 ✓ |
| 11 | `test_listar_movimientos_con_filtros` | GET con ?tipo=entrada_compra retorna solo ese tipo |
| 12 | `test_stock_insuficiente_retorna_error` | 5 disponible, pedir 100 → error |
| 13 | `test_transferencia_mismo_almacen_retorna_error` | origen = destino → 422 |
| 14 | `test_confirmar_transferencia_estado_completado` | `en_transito` → `completado` vía PATCH /confirmar |
| 15 | `test_cierre_almacen_verifica_stock_cero` | Con stock → 422; sin stock → cerrado, fecha_cierre no null |

---

## PASO 5 — Checklist Manual

| # | Verificación | Resultado esperado |
|---|-------------|-------------------|
| 1 | Registrar ENTRADA: 200 bolsas Bs 50 | Stock 200, PMP 50.00 |
| 2 | Registrar ENTRADA: 100 bolsas Bs 56 | Stock 300, PMP = (200×50+100×56)/300 = **52.00** |
| 3 | SALIDA SOCIAL: 50 bolsas, foto+firma | Stock 250, item actualizado, avance producto sube |
| 4 | Intento SALIDA 500 bolsas | Rechazada: "Stock insuficiente" |
| 5 | Intento 300% del teórico sin justificación | 422: `justificacion_sobre_consumo` requerida si 110-150%, bloqueada si >150% |
| 6 | TRANSFERENCIA 50 bolsas → almacén central | Estado `en_transito`, origen -50 |
| 7 | Confirmar recepción en almacén central | Estado `completado`, central +50 |
| 8 | Almacén privado → SALIDA PRIVADA + foto | Stock baja, receptor_nombre/ci guardados |
| 9 | Cerrar almacén con stock > 0 | Error: "materiales con stock mayor a cero" |
| 10 | Cerrar almacén con stock = 0 | `estado = cerrado`, `fecha_cierre` registrada |
| 11 | Anular movimiento | Compensatorio creado, stock revertido |
| 12 | Filtrar movimientos por tipo SALIDA + exportar | Solo salidas en reporte |

---

## Archivos Modificados / Creados

### Backend
| Archivo | Cambio |
|---------|--------|
| `app/Services/Almacenes/EntregaService.php` | Fix 2 bugs críticos + validación 110-150% + `confirmarRecepcionTransferencia` + `cerrarAlmacenProyecto` |
| `app/Http/Controllers/Api/MovimientoAlmacenController.php` | `confirmarTransferencia` endpoint |
| `app/Http/Controllers/Api/AlmacenController.php` | `cerrar` endpoint, imports `Almacen`, `EntregaService`, `JsonResponse` |
| `routes/api.php` | 2 nuevas rutas: `PATCH /movimientos-almacen/{id}/confirmar` y `PATCH /almacenes/{id}/cerrar` |

### Frontend
| Archivo | Cambio |
|---------|--------|
| `resources/js/pages/admin/almacenes/AlmacenDetalle.jsx` | Import `Check`, estado `confirmandoId`, función `confirmarTransferencia`, botón hover en tabla |
| `resources/js/services/movimientoAlmacenService.js` | `confirmarTransferencia(id)` |

### Tests
| Archivo | Tests |
|---------|-------|
| `tests/Feature/Movimientos/MovimientoAlmacenTest.php` *(nuevo)* | 15 tests, 57 assertions |

### Documentación
| Archivo | Descripción |
|---------|-------------|
| `AUDITORIA_MOVIMIENTOS.md` *(nuevo)* | Diagnóstico previo a implementación |
| `ALMACENES_SUBFASE_C1_REPORTE.md` *(este archivo)* | Reporte final |

---

## Comandos

```bash
# Ejecutar tests de movimientos
php artisan test --filter=Movimiento

# Suite completa
php artisan test

# Rutas disponibles (verificar nuevas)
php artisan route:list --path=movimientos-almacen
php artisan route:list --path=almacenes
```

---

## Estado Final

```
Tests:    277 passed (878 assertions)   [+15 nuevos]
Duration: 38.59s
```

Módulo Almacenes Sub-fase C.1 operativo. Todos los modales funcionales. Cascada atómica implementada. PMP verificado. Sobre-consumo con 3 niveles validado. Transferencias con confirmación. Cierre formal de almacén. Cero regresiones.
