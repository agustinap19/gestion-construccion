# Fix: Montos de Productos Contractuales Calculados Incorrectamente

## Bug exacto

| | Detalle |
|---|---|
| **Archivo** | `app/Services/Proyectos/ProyectoService.php` |
| **Línea** | ~336 (método `actualizar()`, bloque `DB::transaction`) |
| **Tipo** | Campo persistido (`monto_calculado`) calculado sobre `presupuesto_referencial` al origen, sin recalcular cuando `monto_contractual` cambia |
| **Fórmula incorrecta** | `presupuesto_referencial (400,000) × porcentaje / 100` |
| **Fórmula correcta** | `monto_contractual (5,000,000) × porcentaje / 100` |

## Evidencia

```
Antes: Producto 1 (20%) = Bs. 80,000   [calculado sobre 400,000]
Antes: Producto 2 (30%) = Bs. 120,000
Antes: Producto 3 (40%) = Bs. 160,000
Antes: Producto 4 (10%) = Bs. 40,000
SUMA: Bs. 400,000 (8% del contrato de 5.000.000)

Después: Producto 1 (20%) = Bs. 1,000,000  ✅
Después: Producto 2 (30%) = Bs. 1,500,000  ✅
Después: Producto 3 (40%) = Bs. 2,000,000  ✅
Después: Producto 4 (10%) = Bs. 500,000    ✅
SUMA: Bs. 5,000,000 (100% del contrato)
```

## Fix aplicado

### 1. ProyectoService::actualizar() — recalcular hitos cuando cambia el monto

```php
// app/Services/Proyectos/ProyectoService.php (bloque DB::transaction en actualizar())
if ($montoChanged) {
    $contractual = (float) $proyecto->monto_contractual_efectivo;
    HitoCobro::where('proyecto_id', $proyecto->id)->each(function (HitoCobro $hito) use ($contractual) {
        $hito->monto_calculado = $contractual * ((float) $hito->porcentaje_contrato / 100);
        $hito->save();
    });
}
```

### 2. Comando de corrección masiva

```
php artisan cobros:recalcular [--proyecto=ID]
```

### 3. Vista Flujo de Cobro — alerta de discrepancia

Si `sumaMontos ≠ monto_contractual` → muestra alerta visual en `FinanzasSection`.

## Output del comando cobros:recalcular

```
Recalculando montos de hitos de cobro (4 proyectos)...

  [SKIP] Construcción Viviendas FASE IV - El Alto Sur — sin hitos de cobro
  [SKIP] Programa Solidario Santa Cruz - Plan 3000 — sin hitos de cobro
  [SKIP] Casa Minimalista Familia Rojas — sin hitos de cobro
  Proyecto: Const 4 (ID 4) — Contrato: Bs. 5,000,000.00
    ✓ Producto 1: 20%  Bs. 80,000.00 → Bs. 1,000,000.00
    ✓ Producto 2: 30%  Bs. 120,000.00 → Bs. 1,500,000.00
    ✓ Producto 3: 40%  Bs. 160,000.00 → Bs. 2,000,000.00
    ✓ Producto 4: 10%  Bs. 40,000.00 → Bs. 500,000.00
    ✓ Suma porcentajes: 100%   Suma montos: Bs. 5,000,000.00

─────────────────────────────────────────────────
Hitos corregidos  : 4
Proyectos omitidos: 3

✅  Recálculo completado.
```

## Tests — 6/6 verde

```
PASS  Tests\Feature\Proyectos\ProductosCobroTest
✓ monto calculado es porcentaje del contrato                                15.79s
✓ suma de productos igual al contrato                                        0.10s
✓ comando recalcular corrige montos existentes                               0.08s
✓ validacion rechaza porcentajes que no suman 100                           0.08s
✓ vista flujo cobro muestra montos correctos                                 0.12s
✓ actualizar monto contractual recalcula hitos automaticamente               0.09s

Tests:   6 passed (28 assertions)
Duration: 16.56s
```

## Archivos modificados/creados

| Archivo | Acción |
|---|---|
| `app/Services/Proyectos/ProyectoService.php` | FIX — recalcular hitos en `actualizar()` cuando cambia monto |
| `app/Console/Commands/RecalcularCobroCommand.php` | CREADO — `cobros:recalcular` |
| `resources/js/pages/admin/proyectos/DetalleProyecto.jsx` | FIX — alerta discrepancia + total en `FinanzasSection` |
| `tests/Feature/Proyectos/ProductosCobroTest.php` | CREADO — 6 tests |
