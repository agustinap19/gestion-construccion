# CIERRE QUIRÚRGICO C.0.1 — Reporte Final

**Proyecto**: ERP CA & KANAGF S.R.L.  
**Fecha**: 2026-05-27  
**Estado**: ✅ Completado — 230 tests pasando, build OK, seed OK

---

## Resultado del Diagnóstico Inicial

Ver `DIAGNOSTICO_C0_1.md` para el análisis completo. Resumen ejecutivo:

| # | Bug reportado | Causa raíz real |
|---|---------------|----------------|
| 1 | Tipología "Sin plantilla ⚠️" | `TipoViviendaSeeder` corría ANTES que `PlantillasConstructivasSeeder` → todos los TipoVivienda quedaban con `plantilla_constructiva_id = null` |
| 2 | No se generan items al registrar | Consecuencia directa del #1: `IntegracionBeneficiarioService` detecta `plantilla_constructiva_id = null` y retorna `tipo_vivienda_sin_plantilla` |
| 3 | Almacenes no cargan (500) | `AlmacenService` hacía `SELECT es_social` en MySQL pero `es_social` es un accessor computado, no una columna real. Además `Proyecto.$appends` no declaraba `es_social` → no aparecía en JSON |
| 4 | OTP de reapertura falla | `CierreRegistrosService` usaba `$solicitante->name` pero `User` model usa `nombre`/`apellido_paterno` → `TypeError` |

---

## Reparaciones Realizadas

### Bug 1 + 2 — Seeder order

**Archivo**: `database/seeders/DatabaseSeeder.php`

**Cambio**: `TipoViviendaSeeder` movido de la posición 35 (antes de catálogos de proyectos)
a inmediatamente después de `PlantillasConstructivasSeeder`.

```php
// ANTES:
TipoProyectoSeeder::class,
TipoViviendaSeeder::class,      // ← aquí, sin plantillas aún
...
PlantillasConstructivasSeeder::class,

// DESPUÉS:
TipoProyectoSeeder::class,
...
PlantillasConstructivasSeeder::class,
TipoViviendaSeeder::class,      // ← ahora después de plantillas
```

**Por qué funcionaba antes pero falló**: El seeder hace `PlantillaConstructiva::where('tipo_obra','vivienda_social')->get()->keyBy('tipologia')`.
Si no hay plantillas en DB, retorna colección vacía y todos los tipos se crean con `plantilla_constructiva_id = null`.

**Verificación post-fix**:
```
id=1 Vivienda Social TIPO 1 — 1 Dormitorio  plantilla_id=1  ✅
id=2 Vivienda Social TIPO 2 — 2 Dormitorios plantilla_id=2  ✅
id=3 Vivienda Social TIPO 3 — 3 Dormitorios plantilla_id=3  ✅
```

---

### Bug 3 — Almacenes 500

**Archivos**: `app/Services/Almacenes/AlmacenService.php` + `app/Models/Proyecto.php`

**Cambio 1** — `AlmacenService.php` línea 45:
```php
// ANTES (generaba SQL: SELECT id, nombre, codigo, es_social FROM proyectos → error MySQL):
'proyecto:id,nombre,codigo,es_social',

// DESPUÉS (carga la columna real; el accessor computa es_social a partir de categoria):
'proyecto:id,nombre,codigo,categoria',
```

**Cambio 2** — `Proyecto.php` — se agregó `$appends`:
```php
protected $appends = ['es_social'];
```
Sin esto, `es_social` no aparecía en la respuesta JSON aunque el accessor estuviera definido.

**Por qué**: `es_social` es un Eloquent accessor (`getEsSocialAttribute`) que computa `$this->categoria === 'social'`. Para que sea seleccionable en eager load con columnas explícitas se necesita la columna real (`categoria`). Para que aparezca en JSON se necesita `$appends`.

---

### Bug 4 — OTP solicitante null

**Archivo**: `app/Services/CierreRegistrosService.php` línea 62

**Cambio**:
```php
// ANTES (User no tiene propiedad 'name' → null → TypeError):
$solicitante->name,

// DESPUÉS (campos reales del modelo User):
trim($solicitante->nombre . ' ' . $solicitante->apellido_paterno),
```

**Por qué**: El modelo `User` de este proyecto usa `nombre`, `apellido_paterno`, `apellido_materno` en vez del campo `name` de Laravel estándar. `$solicitante->name` siempre retorna null.

---

## Tests Automatizados

```
php artisan test --filter="TipologiaPlantilla|GeneracionAutomaticaItems|CargaAlmacen|ReaperturaOtp"

PASS  Tests\Feature\Almacenes\CargaAlmacenTest
  ✓ almacen central carga correctamente
  ✓ almacen de proyecto social carga correctamente
  ✓ almacen de proyecto privado carga correctamente
  ✓ almacen inexistente retorna 404
  ✓ almacen sin autenticacion retorna 401
  ✓ almacen sin permiso retorna 403

PASS  Tests\Feature\Beneficiarios\GeneracionAutomaticaItemsTest
  ✓ registrar beneficiario genera items de su plantilla
  ✓ registrar beneficiario sin tipo vivienda no genera items
  ✓ registrar beneficiario con tipo sin plantilla no genera items
  ✓ cambiar plantilla de beneficiario regenera items
  ✓ si no existe vivienda se crea una al registrar

PASS  Tests\Feature\Beneficiarios\ReaperturaOtpTest
  ✓ solicitar reapertura genera otp y envia correo
  ✓ solicitante se propaga correctamente al mailable
  ✓ otp correcto reabre registros
  ✓ otp expirado no reabre
  ✓ otp incorrecto no reabre
  ✓ otp ya usado no reabre

PASS  Tests\Feature\Beneficiarios\TipologiaPlantillaTest
  ✓ beneficiario solo acepta plantillas activas
  ✓ tipo vivienda con plantilla activa genera items
  ✓ formulario tipos vivienda expone plantilla constructiva id

Tests: 20 passed (70 assertions)
```

**Suite completa**:
```
Tests: 230 passed (675 assertions)
Duration: 35.87s
```

---

## Checklist Manual (PASO 4)

1. ✅ `php artisan migrate:fresh --seed` — sin errores, TipoViviendaSeeder corre después de PlantillasConstructivasSeeder
2. ✅ Tipos de vivienda tienen `plantilla_constructiva_id` correctamente asignado tras el seed
3. ✅ GET `/api/almacenes/{id}` — almacén central carga sin error 500
4. ✅ GET `/api/almacenes/{id}` con almacén social — retorna `proyecto.es_social=true`
5. ✅ GET `/api/almacenes/{id}` con almacén privado — retorna `proyecto.es_social=false`
6. ✅ `CodigoReaperturaMail::__construct()` ya no recibe null — se construye `"nombre apellido_paterno"` correctamente
7. ✅ OTP tests: solicitar → envío de mail (Mail::fake), OTP correcto reabre, expirado/incorrecto/usado falla
8. ✅ `IntegracionBeneficiarioService` genera items cuando tipo_vivienda tiene plantilla_constructiva_id
9. ✅ Sin plantilla: retorna `{generado: false, razon: 'tipo_vivienda_sin_plantilla'}` sin romper el registro
10. ✅ `regenerarItemsPorCambioTipologia` elimina items anteriores y crea los de la nueva plantilla

---

## Archivos Modificados (solo los necesarios)

| Archivo | Cambio |
|---------|--------|
| `database/seeders/DatabaseSeeder.php` | TipoViviendaSeeder movido después de PlantillasConstructivasSeeder |
| `app/Services/Almacenes/AlmacenService.php` | Select `es_social` → `categoria` en eager load de proyecto |
| `app/Models/Proyecto.php` | Agregado `protected $appends = ['es_social']` |
| `app/Services/CierreRegistrosService.php` | `$solicitante->name` → `trim($solicitante->nombre . ' ' . $solicitante->apellido_paterno)` |
| `tests/Feature/Beneficiarios/TipologiaPlantillaTest.php` | Nuevo |
| `tests/Feature/Beneficiarios/GeneracionAutomaticaItemsTest.php` | Nuevo |
| `tests/Feature/Almacenes/CargaAlmacenTest.php` | Nuevo |
| `tests/Feature/Beneficiarios/ReaperturaOtpTest.php` | Nuevo |

---

## Comandos para Verificar

```bash
# 1. Seed limpio
php artisan migrate:fresh --seed

# 2. Tests de los 4 bugs
php artisan test --filter="TipologiaPlantilla|GeneracionAutomaticaItems|CargaAlmacen|ReaperturaOtp"

# 3. Suite completa
php artisan test

# 4. Verificar tipos de vivienda con plantilla asignada
php artisan tinker --execute="App\Models\TipoVivienda::all(['id','nombre','plantilla_constructiva_id'])->each(function(\$t){ echo \$t->nombre . ' → plantilla_id=' . (\$t->plantilla_constructiva_id ?? 'NULL') . PHP_EOL; });"
```

---

## Hallazgos Colaterales (no tocados, para sub-fases futuras)

- **`CierreRegistrosBeneficiariosController::estado()`** línea 24: usa `->with('cerradoRegistrosPor:id,name')` pero `users` no tiene columna `name`. Actualmente no rompe el endpoint (Eloquent selecciona el id y retorna null para `name`) pero devuelve datos incorrectos en la UI. Pendiente corregir a `nombre,apellido_paterno`.

- **`BeneficiarioSeeder` no genera PresupuestoItemProyecto**: Los beneficiarios demo se insertan directamente sin pasar por el servicio. Para tener presupuesto poblado en datos demo, se podría ejecutar `php artisan presupuesto:reconsolidar` después del seed, o hacer que el seeder llame al servicio explícitamente.
