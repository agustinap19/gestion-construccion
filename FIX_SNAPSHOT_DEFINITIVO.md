# Fix Snapshot Definitivo — Modal de entrega usa receta global en vez del snapshot

## Diagnóstico con evidencia numérica

```bash
# Item: ID=3 "Hormigón ciclópeo para cimientos H12"
# Material: ID=1 "Cemento Soboce IP-40"
# Receta global original: 3.0000 bol/m³

# PIP: ID=3, Proyecto: 4, Vivienda: 9, Cantidad planificada: 5.5

# overrides_items_proyecto para proyecto_id=4, item_id=3:
→ NO EXISTE (vacío) — bug confirmado

# Coeficiente resuelto (bug activo): 99 × 5.5 = 544.5 bol  ← MAL
# Coeficiente resuelto (fix aplicado): 3 × 5.5 = 16.5 bol ← CORRECTO
```

## Causa raíz real (3 capas del problema)

| Intento | Solución implementada | Por qué no era suficiente |
|---|---|---|
| Intento 1 | `RecetaResolverService` con jerarquía 3 niveles | ✅ La jerarquía era correcta pero `overrides_items_proyecto` siempre vacío → fallback a global |
| Intento 2 | `snapshotearRecetas()` en `generarDesde()` | ✅ Funciona para proyectos regenerados DESPUÉS del fix, no para proyectos existentes ni PIPs creados directamente |
| **Fix definitivo** | Observer `booted()` en `PresupuestoItemProyecto` | ✅ Snapshot automático en CUALQUIER creación de PIP, incluyendo factory y `create()` directo |

## Archivos modificados

### `app/Models/PresupuestoItemProyecto.php` — FIX DEFINITIVO
**Línea exacta**: método `booted()` añadido.

```php
// ANTES: el modelo no hacía nada al crearse
class PresupuestoItemProyecto extends Model { ... }

// DESPUÉS: observer que snapshot la receta global vigente
protected static function booted(): void
{
    static::created(function (self $pip) {
        $recetas = RecetaItem::where('item_constructivo_id', $pip->item_constructivo_id)->get();
        foreach ($recetas as $r) {
            OverrideItemProyecto::firstOrCreate(
                [proyecto_id, item_constructivo_id, material_id, vivienda_id=null],
                [cantidad_por_unidad_base, nivel='tipologia', justificacion='Snapshot automático.']
            );
        }
    });
}
```

**Idempotencia**: `firstOrCreate` garantiza que si el snapshot ya existe (creado por `snapshotearRecetas()` en batch), no lo sobreescribe.

### `app/Console/Commands/SnapshotRecetasCommand.php` — NUEVO
Comando para backfillear proyectos existentes:
```bash
php artisan recetas:snapshot              # backfill todos los proyectos sin snapshot
php artisan recetas:snapshot --dry-run    # ver qué haría sin insertar
php artisan recetas:snapshot --proyecto_id=4  # solo un proyecto
```

**Importante**: ejecutar ANTES de cambiar la Biblioteca Global, para que el snapshot capture los valores correctos.

## Output del test en verde

```
Tests\Feature\Proyectos\SnapshotDefinitivoTest
  ✓ sugerencia no cambia cuando biblioteca se actualiza
  ✓ receta con stock tampoco usa global cuando cambia

Tests: 29 passed (130 assertions) — todos los tests del sistema
```

## Verificación manual (PASO 4 — prueba de fuego)

```bash
# Con global = 99 bol/m³:
Snapshot en override: 3.0000          ← capturado al crear el PIP
Coeficiente resuelto: 3               ← usa snapshot, no global
Fuente: tipologia                     ← snapshot (no 'global')
Cantidad teórica: 16.5                ← 3 × 5.5 = 16.5 ✅
BUG hubiera sido: 99 × 5.5 = 544.5   ← NO aparece ✅

# Receta global restaurada a 3 bol/m³ al final
```

## Flujo completo garantizado ahora

```
Al crear cualquier PIP (factory, create(), generarDesde()):
  → booted() observer dispara
  → firstOrCreate en overrides_items_proyecto (nivel=tipologia, vivienda=null)
  → snapshot capturado con valores actuales de biblioteca

Cuando gerente edita Biblioteca Global:
  → overrides_items_proyecto NO cambia (está desacoplado)
  → RecetaResolverService encuentra el snapshot (nivel 2 tipología)
  → Modal de entrega usa el snapshot, NUNCA el global directamente

Cuando gerente quiere actualizar al nuevo global:
  → Ejecutar "Actualizar recetas" en el Editor de Items
  → Elimina snapshots de tipología → recalcula con nueva biblioteca
```

## Comando para producción (una sola vez)
```bash
# PRIMERO: verificar que la biblioteca global tiene los valores correctos
php artisan recetas:snapshot --dry-run  # ver cuántos se crearían

# SEGUNDO: aplicar
php artisan recetas:snapshot
```
