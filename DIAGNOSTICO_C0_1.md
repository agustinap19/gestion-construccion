# DIAGNÓSTICO C.0.1 — Sub-fase C.0.1 Cierre Quirúrgico

**Fecha**: 2026-05-27  
**Estado inicial**: 4 bugs activos post-migración fresh --seed

---

## PUNTO 1 — migrate:fresh --seed

**Resultado**: ✅ Sin errores. Todos los seeders corrieron sin excepción.

---

## PUNTO 2 — Plantillas Constructivas

```
PLANTILLAS COUNT: 6
  id=1  nombre=Vivienda Social TIPO 1 — 1 Dormitorio  tipo_vivienda_id=NULL  items=30
  id=2  nombre=Vivienda Social TIPO 2 — 2 Dormitorios tipo_vivienda_id=NULL  items=30
  id=3  nombre=Vivienda Social TIPO 3 — 3 Dormitorios tipo_vivienda_id=NULL  items=33
  id=4  nombre=Casa Privada Estándar — 100 m²          tipo_vivienda_id=NULL  items=36
  id=5  nombre=Edificio Multifamiliar ...               tipo_vivienda_id=NULL  items=22
  id=6  nombre=Remodelación Estándar                   tipo_vivienda_id=NULL  items=23

TIPOS VIVIENDA COUNT: 3
  id=1  nombre=Vivienda Social TIPO 1 — 1 Dormitorio  plantilla_constructiva_id=NULL ← BUG
  id=2  nombre=Vivienda Social TIPO 2 — 2 Dormitorios plantilla_constructiva_id=NULL ← BUG
  id=3  nombre=Vivienda Social TIPO 3 — 3 Dormitorios plantilla_constructiva_id=NULL ← BUG
```

**Causa raíz**: `TipoViviendaSeeder` se ejecuta ANTES que `PlantillasConstructivasSeeder` en
`DatabaseSeeder.php`. Al ejecutarse, hace `PlantillaConstructiva::where('tipo_obra','vivienda_social')
->get()` que retorna vacío. Todos los tipos quedan con `plantilla_constructiva_id = null`.

---

## PUNTO 3 — Beneficiarios y FK de tipología

```
BENEFICIARIOS COUNT: 12
  id=1  María   tipo_vivienda_id=1  plantilla_id=NULL  ← no resolverá items
  id=2  Pedro   tipo_vivienda_id=2  plantilla_id=NULL  ← no resolverá items
  ...

ITEMS PRESUPUESTO:   0   ← cadena no se ejecuta
MATERIALES PRESUPUESTO: 0
```

**Causa raíz 1 (directa)**: Los 12 beneficiarios del seeder se insertaron directamente
en BD sin pasar por `BeneficiarioController::store()`, por lo que `IntegracionBeneficiarioService`
nunca se invocó.

**Causa raíz 2 (de fondo)**: Aunque se hubiera invocado, `IntegracionBeneficiarioService::generarItemsParaBeneficiario()`
línea 29 verifica `!$tipoVivienda?->plantilla_constructiva_id` y retorna
`['generado' => false, 'razon' => 'tipo_vivienda_sin_plantilla']` porque el campo es NULL (ver Punto 2).

**Fix**: Corregir el orden en DatabaseSeeder resuelve la causa raíz 2. Los tests registrarán
beneficiarios via API (pasando por el controlador) y verificarán la cadena completa.

---

## PUNTO 4 — Estructura FK real

```sql
-- tipos_vivienda: tiene columna plantilla_constructiva_id (FK)
-- plantillas_constructivas: tiene columna tipo_vivienda_id (NULL en todos los registros)
-- La FK de negocio es: tipos_vivienda.plantilla_constructiva_id → plantillas_constructivas.id
```

`PlantillaConstructiva.tipo_vivienda_id` está vacío en todos los registros — es un campo
existente pero no cargado por el seeder. El seeder de plantillas no hace el link inverso.
El link correcto que usa el código es `TipoVivienda.plantilla_constructiva_id`, que sí existe
como FK pero está NULL por el orden de ejecución del seeder.

---

## PUNTO 5a — Almacenes error 500

`AlmacenService::obtenerConStock()` línea 44-47:
```php
$almacen = Almacen::with([
    'proyecto:id,nombre,codigo,es_social',  // ← ERROR: es_social NO es columna real
```

`es_social` es un accessor computado en `Proyecto::getEsSocialAttribute()`:
```php
public function getEsSocialAttribute(): bool
{
    return $this->categoria === 'social';
}
```

La columna real es `categoria (enum('social','privado'))`. MySQL lanza error al intentar
`SELECT id, nombre, codigo, es_social FROM proyectos` porque la columna no existe.

`Proyecto.$appends` no tiene `es_social` declarado, por lo que tampoco aparece en JSON
aun cuando se carga el modelo completo.

**Fix**: Cambiar select a `'proyecto:id,nombre,codigo,categoria'` + agregar `es_social` a
`Proyecto.$appends`.

---

## PUNTO 5b — CierreRegistrosService línea 59

```php
// CierreRegistrosService.php:59-63
Mail::to($solicitante->email)->send(new CodigoReaperturaMail(
    $codigoPlano,
    $proyecto->nombre,
    $solicitante->name,    // ← NULL: User no tiene campo 'name'
));
```

`User` model usa `nombre`, `apellido_paterno`, `apellido_materno`. No tiene propiedad `name`.
`$solicitante->name` retorna `null` → `CodigoReaperturaMail.__construct()` espera `string`
→ `TypeError`.

**Fix**: Reemplazar `$solicitante->name` con `trim($solicitante->nombre . ' ' . $solicitante->apellido_paterno)`.

---

## Resumen ejecutivo de los 4 bugs

| # | Bug | Archivo afectado | Causa raíz | Fix |
|---|-----|------------------|-----------|-----|
| 1 | Sin plantilla ⚠️ | DatabaseSeeder.php | TipoViviendaSeeder antes que PlantillasConstructivasSeeder | Mover TipoViviendaSeeder después de PlantillasConstructivasSeeder |
| 2 | Items no generados | — (consecuencia del #1) | plantilla_constructiva_id=NULL → IntegracionBeneficiarioService retorna early | Corregir #1 |
| 3 | Almacenes 500 | AlmacenService.php + Proyecto.php | Seleccionar columna virtual es_social en eager load | Cambiar select + agregar $appends |
| 4 | OTP null | CierreRegistrosService.php | $solicitante->name pero User usa nombre/apellido_paterno | Construir string con campos correctos |
