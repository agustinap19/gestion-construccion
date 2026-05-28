# Fase 3 — Alineación de código al esquema reconstruido

**Fecha:** 2026-05-17  
**Sistema:** CA & KANAGF S.R.L. — Gestión de Construcción  
**Objetivo:** Alinear modelos, servicios y seeders al nuevo esquema de base de datos reconstruido.

---

## Reglas aplicadas

1. La tabla de usuarios es `users` (convención Laravel). Ningún modelo declara `$table = 'usuarios'`.
2. FKs hacia usuarios en español (`usuario_id`, `responsable_id`, `creado_por_id`, etc.) apuntan a `users.id`.
3. `app/Services/AuditoriaService.php` fue eliminado. Todas sus llamadas fueron comentadas con `// TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría`.
4. El módulo `VisitaDomiciliaria` fue descartado. Sus archivos ya fueron eliminados.
5. El módulo `Proyectos` está en pausa — la lógica de servicios se conserva intacta.
6. NO se ejecutaron comandos de terminal.

---

## Modelos actualizados

| Archivo | Cambios |
|---------|---------|
| `app/Models/User.php` | Eliminado `$table = 'usuarios'`. Tabla es `users` por convención. |
| `app/Models/Competencia.php` | `duracion_validez_meses` → `vigencia_meses`. |
| `app/Models/TipoVivienda.php` | Eliminados campos booleanos (`tiene_cocina`, etc.). `costo_estimado` → `costo_referencial`. Removido SoftDeletes. Relación `viviendas()` → `unidadesFuncionales()`. |
| `app/Models/TipoProyecto.php` | Añadido `estado` a `$fillable`. |
| `app/Models/PlanillaPago.php` | Reescrito para nuevo esquema. Añadido SoftDeletes, `generadoPor()`, `codigo`, `periodo_mes`, `frecuencia`, `fecha_aprobacion`, `fecha_pago`. |
| `app/Models/DetallePlanilla.php` | Reescrito para nuevo esquema. `bono_productividad`, `otros_ingresos`, `descuento_afp`, `descuento_cns`, `banco`, `numero_cuenta`. |
| `app/Models/Proyecto.php` | Reescrito para nuevo esquema: `presupuesto_referencial`, `monto_contrato`, `avance_fisico`, `avance_financiero`, `responsable_id`, `creado_por_id`. Máquina de estados: `formulacion/licitacion/adjudicado/en_ejecucion/pausado/finalizado/cancelado`. Relaciones: `responsable()`, `creadoPor()`. |
| `app/Models/FaseProyecto.php` | Reescrito: `avance_porcentaje` (ex `porcentaje_avance_interno`). Estados: `pendiente/en_progreso/completada/suspendida`. Removido `creador()`. |

---

## Servicios actualizados

| Archivo | Cambios |
|---------|---------|
| `app/Services/Proyectos/AsignacionPersonalService.php` | Eliminada dependencia `AuditoriaService`. Comentadas 4 llamadas `$this->auditoria->...`. `estado` → `estado_laboral`. |
| `app/Services/Personal/PersonalCompetenciaService.php` | Eliminada dependencia `AuditoriaService`. Comentadas 3 llamadas `$this->auditoriaService->registrar(...)`. |
| `app/Services/Proyectos/CalculoAvanceService.php` | Reescrito para nuevo esquema: `porcentaje_avance` → `avance_fisico`, `porcentaje_avance_interno` → `avance_porcentaje`. Eliminada lógica `es_social/es_privado`. |
| `app/Services/Proyectos/FaseProyectoService.php` | Eliminada dependencia `AuditoriaService`. Estado `en_proceso` → `en_progreso`. Campo `porcentaje_avance_interno` → `avance_porcentaje`. Removidos `codigo`, `usuario_creador_id`, `peso_porcentual`. Relación `creador` → eliminada de eager loads. |
| `app/Services/Proyectos/ViviendaService.php` | Eliminada dependencia `AuditoriaService`. Comentadas 7 llamadas `$this->auditoria->...`. |
| `app/Services/Proyectos/ProyectoService.php` | Eliminadas importaciones de `Auditoria` y `AuditoriaService`. Comentadas 8 llamadas auditoria. Corregidos campos: `presupuesto_total` → `presupuesto_referencial`, `administrador_id` → `responsable_id`, `usuario_creador_id` → `creado_por_id`, `porcentaje_avance` → `avance_fisico`. Estados actualizados a nuevo esquema. Método `cambiarAdministrador` → `cambiarResponsable`. |

---

## Seeders actualizados / creados

| Archivo | Cambios |
|---------|---------|
| `database/seeders/RolSeeder.php` | Eliminado rol `trabajadora_social`. Quedan 6 roles. |
| `database/seeders/UserSeeder.php` | **NUEVO** (reemplaza a `UsuarioSeeder.php`). Tabla `users` (no `usuarios`). 8 usuarios bolivianos incluyendo `gerente@cakanagf.com`. `debe_cambiar_password = false` para todos. |
| `database/seeders/PersonalSeeder.php` | `DB::table('usuarios')` → `DB::table('users')`. Eliminada rama `trabajadora_social`. |
| `database/seeders/CompetenciaSeeder.php` | `duracion_validez_meses` → `vigencia_meses`. |
| `database/seeders/TipoViviendaSeeder.php` | Eliminados campos booleanos. `costo_estimado` → `costo_referencial`. |
| `database/seeders/ConfiguracionSistemaSeeder.php` | **NUEVO**. Datos iniciales: nombre empresa, NIT, dirección, moneda, zona horaria, etc. |
| `database/seeders/DatabaseSeeder.php` | Reescrito. Excluidos: `VisitaDomiciliariaSeeder`, `ProyectoSeeder`, `BeneficiarioSeeder`, `FaseProyectoSeeder`, `ViviendaSeeder`, `PlanillaPagoSeeder`, `DetallePlanillaSeeder`. Añadido `UserSeeder`, `ConfiguracionSistemaSeeder`. |

---

## Módulos excluidos / en pausa

| Módulo | Estado | Razón |
|--------|--------|-------|
| VisitaDomiciliaria | **Descartado** | Módulo eliminado definitivamente |
| Proyectos / Viviendas / Fases | **Pausa** | Sprint pendiente — servicios conservados con TODO comments |
| Planillas | **Pausa** | Sprint pendiente |
| Beneficiarios (seeder) | **Pausa** | Sprint pendiente |

---

## Auditoría (owen-it/laravel-auditing)

- El paquete `owen-it/laravel-auditing v14` está instalado (`composer.json`).
- `AuditoriaController` creado para consumir auditorías vía `Model::audits()`.
- El trait `Auditable` debe agregarse a los modelos cuando se active el sprint de auditoría.
- Todas las llamadas comentadas tienen el marcador `// TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría`.

---

## Verificación de integridad

- ✅ Ningún modelo declara `$table = 'usuarios'`
- ✅ Ningún servicio activo importa `App\Services\AuditoriaService` 
- ✅ Ningún servicio activo importa `App\Models\Auditoria`
- ✅ `VisitaDomiciliariaService` eliminado del código activo
- ✅ Seeders apuntan a `users`, no a `usuarios`
- ✅ `CompetenciaSeeder` usa `vigencia_meses`
- ✅ `TipoViviendaSeeder` usa `costo_referencial` sin campos booleanos
- ✅ `DatabaseSeeder` excluye seeders de módulos en pausa
