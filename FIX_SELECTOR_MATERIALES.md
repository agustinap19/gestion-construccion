# Fix — Selector de materiales (Entrega Social, Paso 2)

## Diagnóstico
Ver `DIAGNOSTICO_SELECTOR_MATERIALES.md`

## Causa raíz exacta
El `<select>` de materiales nunca tenía opciones porque:
1. No existía ningún endpoint para obtener materiales con stock del almacén
2. El componente nunca llamaba a ningún endpoint para poblar el dropdown
3. La receta del ítem tampoco se cargaba (path incorrecto + backend sin eager load)

---

## Archivos modificados

### 1. `routes/api.php`
Agregada ruta:
```php
Route::get('/{id}/materiales-con-stock', [AlmacenController::class, 'materialesConStock']);
```

### 2. `app/Http/Controllers/Api/AlmacenController.php`
Nuevo método `materialesConStock`:
- Retorna todos los materiales del almacén donde `(cantidad - cantidad_reservada) > 0`
- Eager loading en 3 queries (sin N+1): `stock_material → material → unidad_medida`
- Campos: `material_id`, `nombre`, `codigo`, `unidad`, `cantidad_disponible`, `pmp`
- Ordenados por nombre (sort en colección)
- Requiere permiso `almacenes.ver`

### 3. `app/Http/Controllers/Api/PresupuestoItemsProyectoController.php`
Método `porBeneficiario` — eager loading extendido:
```php
// ANTES
'itemConstructivo:id,nombre,codigo,unidad_base',
'itemConstructivo.categoria:id,nombre,color',
'vivienda:id,codigo',

// DESPUÉS (agrega receta)
'itemConstructivo:id,nombre,codigo,unidad_base',
'itemConstructivo.categoria:id,nombre,color',
'itemConstructivo.receta',
'itemConstructivo.receta.material:id,nombre,codigo,unidad_medida_id',
'itemConstructivo.receta.material.unidadMedida:id,nombre,simbolo',
'vivienda:id,codigo',
```

### 4. `resources/js/pages/admin/almacenes/EntregaSocialModal.jsx`
**a) Estado nuevo:**
```js
const [materialesDisponibles, setMatDisp] = useState([]);
```

**b) useEffect al montar el modal** (una sola llamada HTTP):
```js
useEffect(() => {
    api.get(`/almacenes/${almacen.id}/materiales-con-stock`)
        .then(r => setMatDisp(r.data?.data || []))
        .catch(() => setMatDisp([]));
}, [almacen.id]);
```

**c) Selección de ítem — path corregido:**
```js
// ANTES (roto)
it.receta_materiales?.map(r => ({ ..., sugerido: r.cantidad_sugerida }))

// DESPUÉS (correcto)
const receta = it.item_constructivo?.receta || [];
const cantidad_plan = parseFloat(it.cantidad_planificada || 1);
receta.map(r => ({
    material_id: String(r.material_id),
    nombre: r.material?.nombre || '',
    sugerido: parseFloat(r.cantidad_por_unidad_base) * cantidad_plan,
}))
```

**d) Select poblado con opciones reales:**
```jsx
<select ...>
    <option value="">— Material —</option>
    {materialesDisponibles.map(m => (
        <option key={m.material_id} value={String(m.material_id)}>
            {m.nombre} · {m.cantidad_disponible.toFixed(2)} {m.unidad}
        </option>
    ))}
</select>
```

**e) Alerta de exceso de stock por fila:**
Si `cantidad ingresada > cantidad_disponible del material` → borde rojo + mensaje
"Excede stock disponible (X disponibles)"

**f) Botones de UI:**
- Botón eliminar fila (`Trash2`) en cada línea
- Botón `+ Agregar material` para añadir filas manuales extra

---

## Tests nuevos
**Archivo:** `tests/Feature/Almacenes/MaterialesConStockTest.php`

| Test | Estado |
|---|---|
| `test_endpoint_materiales_con_stock_retorna_solo_materiales_con_stock_positivo` | ✅ Verde |
| `test_endpoint_materiales_con_stock_excluye_agotados_por_reserva` | ✅ Verde |
| `test_endpoint_materiales_con_stock_requiere_permiso` | ✅ Verde |
| `test_endpoint_receta_con_stock_retorna_materiales_con_disponibilidad` | ✅ Verde |
| `test_paso_2_entrega_social_carga_materiales_al_seleccionar_item` | ✅ Verde |

```
Tests: 5 passed (36 assertions)
```

---

## Checklist manual

- [x] Modal Entrega Social → Paso 2 → dropdown muestra materiales con stock (incluyendo cemento)
- [x] Al seleccionar ítem con receta → aparecen filas pre-sugeridas con nombre del material y cantidad sugerida
- [x] Al seleccionar ítem sin receta → aparece una fila vacía con select poblado
- [x] Cantidad mayor al stock → alerta roja "Excede stock disponible"
- [x] Botón `+ Agregar material` agrega filas extra con select completo
- [x] Botón eliminar (papelera) en cada fila
- [x] Si almacén sin stock → mensaje "Sin stock disponible en este almacén — registra una entrada primero"
- [x] Sin errores en consola
- [x] Paso 3 (Modalidad) accesible después de seleccionar material y cantidad válida
