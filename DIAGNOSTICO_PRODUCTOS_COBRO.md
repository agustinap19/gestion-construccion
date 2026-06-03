# Diagnóstico: Montos de Productos Contractuales Incorrectos

## Output del tinker (estado antes del fix)

```
=== Const 4 ===
Contrato: Bs. 5,000,000.00
  Producto 1: 20.00% = Bs. 80,000.00     ← INCORRECTO (debería ser 1,000,000)
  Producto 2: 30.00% = Bs. 120,000.00    ← INCORRECTO (debería ser 1,500,000)
  Producto 3: 40.00% = Bs. 160,000.00    ← INCORRECTO (debería ser 2,000,000)
  Producto 4: 10.00% = Bs. 40,000.00     ← INCORRECTO (debería ser 500,000)
SUMA HITOS: Bs. 400,000.00
DIFERENCIA: Bs. 4,600,000.00
```

## Causa raíz del bug

**Tipo**: Bug B — campo persistido calculado incorrectamente al origen, sin recalcular al editar.

**Fórmula en BD vs esperada**:
- Almacenado: `80,000 = X × 20 / 100` → `X = 400,000` (presupuesto_referencial original)
- Correcto: `5,000,000 × 20 / 100 = 1,000,000`

**Secuencia de eventos**:
1. Proyecto creado con `presupuesto_referencial = 400,000` y `monto_contractual = null`
2. `CascadaProyectoService::crearHitosCobro()` usa `monto_contractual ?? monto_contrato ?? presupuesto_referencial = 400,000`
3. Hitos creados con `80,000`, `120,000`, `160,000`, `40,000`
4. Más tarde, `monto_contractual` actualizado a `5,000,000` vía `ProyectoService::actualizar()`
5. `ProyectoService::actualizar()` **NO recalculaba los hitos** → montos quedan incorrectos

## Dónde se calcula monto_calculado

| Archivo | Línea | Descripción |
|---|---|---|
| `app/Services/Proyectos/CascadaProyectoService.php` | 180 | Al crear proyecto — usa `presupuesto_referencial` como fallback |
| `app/Models/HitoCobro.php` | 49 | Método `recalcularMonto()` — fórmula correcta |
| `app/Services/Proyectos/RecalculoFinancieroService.php` | 216 | Recalcular todos los hitos del proyecto — fórmula correcta |
| `app/Services/Proyectos/ProyectoService.php` | ~340 | **BUG**: al `actualizar()` no llamaba `recalcularMontoHitosCobro()` |

## Fórmula

```php
// Incorrecta al crearse (usó presupuesto_referencial = 400,000 como fallback)
$monto_calculado = 400_000 * 20 / 100  = 80,000   ❌

// Correcta:
$monto_calculado = monto_contractual * porcentaje_contrato / 100
$monto_calculado = 5_000_000 * 20 / 100 = 1_000_000  ✅
```
