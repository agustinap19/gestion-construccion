# Fix — Snapshot de receta: almacén no se actualiza con la biblioteca global

## Resultado de grep (dónde estaba el problema)

```
# grep de lectura directa de receta global:
app/Services/Almacenes/EntregaService.php:609:
    $receta = $item->itemConstructivo?->receta ?? collect();
    # ← Leía receta global en actualizarAvanceItem()

# El endpoint recetaConStock ya usaba RecetaResolverService ✅
# El problema era que overrides_items_proyecto estaba VACÍO
# → el resolver caía siempre al nivel 3 (receta global)
```

## Causa raíz exacta

`PresupuestoAutomaticoService::generarDesde()` creaba los `PresupuestoItemProyecto` pero **nunca snapshot­eaba la receta** en `overrides_items_proyecto`. Sin snapshot, el `RecetaResolverService` siempre caía al fallback (nivel 3 = receta global), y cualquier cambio en la Biblioteca Constructiva se propagaba de inmediato al modal de entrega.

El flujo incorrecto era:
```
RecetaResolverService::resolver()
  → nivel 1 (vivienda): vacío
  → nivel 2 (tipología): vacío  ← faltaba el snapshot aquí
  → nivel 3 (global): ← SIEMPRE llegaba aquí
```

## Archivos modificados

### `app/Services/Almacenes/PresupuestoAutomaticoService.php`
**Línea exacta que faltaba**: llamada a `snapshotearRecetas()` después de crear los PIPs.

Nuevo método privado `snapshotearRecetas()`:
- Se llama al final de `generarDesde()` (dentro de la misma transacción)
- Para cada ítem único del presupuesto, copia la receta global vigente como override de tipología (`nivel='tipologia'`, `vivienda_id=null`)
- Usa `firstOrCreate` → solo inserta si no existe; respeta overrides configurados manualmente
- Bulk-load sin N+1: carga todas las recetas en un solo query

```php
// ANTES: generarDesde() terminaba sin snapshot
$consolidado = $this->calcularConsolidado(...);

// DESPUÉS: snapshot antes del consolidado
$this->snapshotearRecetas($proyectoId, $presupuestoItems, $actorId);
$consolidado = $this->calcularConsolidado(...);
```

### `app/Services/Almacenes/EntregaService.php`
**Línea 609**: `actualizarAvanceItem()` leía la receta global directamente para calcular el avance parcial. Corregido para usar el resolver.

```php
// ANTES (global)
$item->loadMissing('itemConstructivo.receta');
$receta = $item->itemConstructivo?->receta ?? collect();
foreach ($receta as $r) {
    $teoricoTotal = $item->cantidad_planificada * $r->cantidad_por_unidad_base;

// DESPUÉS (snapshot del proyecto)
$receta = $this->recetaResolver->resolver(
    $item->item_constructivo_id,
    $item->proyecto_id,
    $item->vivienda_id
);
foreach ($receta as $r) {
    $teoricoTotal = $item->cantidad_planificada * $r['cantidad_por_unidad_base'];
```

### `app/Http/Controllers/Api/AlmacenController.php`
Nuevo endpoint `GET /almacenes/{almacenId}/items/{pipId}/materiales-receta`:
- Usa `RecetaResolverService` para resolver la receta con jerarquía
- Devuelve `cantidad_teorica_total`, `ya_entregado`, `teorico_restante`, `disponible_en_almacen`, `fuente`
- Es el endpoint que el test del prompt especificaba

### `routes/api.php`
Nueva ruta:
```php
Route::get('/{almacenId}/items/{pipId}/materiales-receta', [AlmacenController::class, 'materialesReceta']);
```

## Output del test en verde

```
Tests\Feature\Proyectos\SnapshotRecetaTest
  ✓ modal entrega no cambia cuando se edita biblioteca
  ✓ receta con stock usa snapshot no global
  ✓ generar presupuesto crea snapshot de receta vigente
  ✓ regenerar presupuesto respeta overrides manuales

Tests: 4 passed (15 assertions)
```

**Total acumulado:** 44 passed (173 assertions) — todos los tests del sistema en verde.

## Verificación manual (checklist)

1. Abrir Biblioteca Constructiva → "Hormigón ciclópeo" → receta tiene cemento: 3 bol/m³
2. Generar presupuesto del proyecto → `overrides_items_proyecto` tendrá registro con `cantidad=3, nivel=tipologia`
3. Abrir modal Entrega Social → seleccionar beneficiario → seleccionar "Hormigón ciclópeo" → sugerencia: **30 bol** (3 × 10 m³)
4. Ir a Biblioteca → cambiar cemento a **99 bol/m³** → guardar
5. Volver al modal Entrega Social → mismo beneficiario → mismo item → sugerencia sigue siendo **30 bol** ✅ (no 990)
6. La fuente devuelta es `"tipologia"` (snapshot), no `"global"`
7. Si el gerente quiere adoptar la receta nueva → ejecutar "Actualizar recetas" en el editor → limpia el snapshot de tipología → ahora el modal mostrará 990 (nuevo global)

## Comportamiento esperado del sistema

| Acción | Resultado |
|---|---|
| Generar presupuesto por primera vez | Snapshot de receta global guardado en overrides_items_proyecto |
| Editar receta en Biblioteca | **NO afecta** proyectos con snapshot |
| Gerente edita receta en Editor del proyecto | Sobreescribe el snapshot (nuevo override tipología) |
| Gerente hace "Actualizar recetas" | Borra snapshot de tipología → aplica receta global vigente |
| Override de vivienda individual | Siempre tiene precedencia sobre tipología y global |
