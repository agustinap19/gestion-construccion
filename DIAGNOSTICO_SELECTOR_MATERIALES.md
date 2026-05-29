# Diagnóstico — Selector de materiales vacío (Entrega Social, Paso 2)

## Síntoma
El `<select>` de materiales en el Paso 2 del modal Entrega Social mostraba únicamente la opción
`— Material —` y ningún material del almacén, aunque hubiera stock disponible.

---

## Causa raíz (3 bugs combinados)

### Bug 1 — Select sin opciones (Frontend)
**Archivo:** `resources/js/pages/admin/almacenes/EntregaSocialModal.jsx`  
El `<select>` de materiales estaba hardcodeado con un único `<option>` vacío:
```jsx
<select ...>
  <option value="">— Material —</option>
  {/* NADA MÁS — nunca se llamaba a ningún endpoint */}
</select>
```
El componente **nunca hacía fetch** al almacén para obtener los materiales con stock disponible.
No existía ningún `useEffect` ni llamada a la API para poblar las opciones.

### Bug 2 — Path de propiedad incorrecto (Frontend)
**Línea ~256:**  
```js
// MAL — receta_materiales no existe en el objeto retornado
it.receta_materiales?.map(r => ({ ..., sugerido: r.cantidad_sugerida }))

// CORRECTO
it.item_constructivo?.receta?.map(r => ({ ..., sugerido: r.cantidad_por_unidad_base * cantidad_planificada }))
```
- `receta_materiales` → propiedad ficticia, siempre `undefined`
- `cantidad_sugerida` → campo inexistente, el real es `cantidad_por_unidad_base`
- Consecuencia: siempre caía al fallback `[{ material_id: '', cantidad: '', observacion: '' }]`
  → una sola fila vacía con el select sin opciones

### Bug 3 — Backend no cargaba la receta (Backend)
**Archivo:** `app/Http/Controllers/Api/PresupuestoItemsProyectoController.php`, método `porBeneficiario`  
El eager loading no incluía `itemConstructivo.receta.material`:
```php
// ANTES — sin receta
PresupuestoItemProyecto::with([
    'itemConstructivo:id,nombre,codigo,unidad_base',
    'itemConstructivo.categoria:id,nombre,color',
    'vivienda:id,codigo',
])
```
Aunque el frontend hubiera usado el path correcto, `receta` nunca llegaba al cliente.

---

## Evidencia
- Network tab: **ningún request** a `/almacenes/*/materiales-con-stock` al abrir el modal
- Network tab: `/presupuesto-items-proyecto` retornaba items sin campo `receta`
- Tinker: `PresupuestoItemProyecto::with(['itemConstructivo.receta'])->first()->item_constructivo->receta` → colección correcta (datos existen en BD)
- Stock: `StockMaterial::where('almacen_id', X)->where(...)->get()` → registros con cemento, arena, etc.

---

## Archivos afectados
| Archivo | Tipo de bug |
|---|---|
| `resources/js/pages/admin/almacenes/EntregaSocialModal.jsx` | Sin fetch + path erróneo |
| `app/Http/Controllers/Api/PresupuestoItemsProyectoController.php` | Eager loading incompleto |
| `routes/api.php` | Endpoint inexistente |
| `app/Http/Controllers/Api/AlmacenController.php` | Método inexistente |
