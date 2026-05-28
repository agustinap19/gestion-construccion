# FASE 2 — ROLES Y PERMISOS: REPORTE FINAL

## Estado

- Tests Roles: 11/11 PASS
- Tests Auth: 14/14 PASS (sin regresión)
- Build frontend: OK

---

## Archivos Creados

| Archivo | Descripción |
|---|---|
| `app/Exceptions/Roles/RolDelSistemaNoEliminableException.php` | Excepción 403 al intentar eliminar rol del sistema |
| `app/Exceptions/Roles/RolConUsuariosException.php` | Excepción 422 con cantidad de usuarios |
| `app/Exceptions/Roles/EscaladaPrivilegiosException.php` | Excepción 403 anti-escalada de privilegios |
| `app/Services/Roles/RolService.php` | Servicio principal con todas las reglas de negocio |
| `tests/Feature/Roles/RolTest.php` | 11 tests de feature para roles y permisos |
| `FASE2_REPORTE.md` | Este reporte |

## Archivos Modificados

| Archivo | Cambios |
|---|---|
| `app/Models/Rol.php` | Agregados casts, scopes (activos, delSistema, personalizados), softDeletes, accessor getCantidadUsuarios |
| `app/Models/Permiso.php` | Agregado `nombre` al fillable, scope `porModulo()` |
| `app/Http/Controllers/Api/RolController.php` | Reescrito: usa nuevo RolService, agrega `cambiarEstado()`, `matrizPermisos()`, manejo de excepciones tipado |
| `routes/api.php` | Agregadas rutas: `PATCH /roles/{id}/estado` y `GET /permisos/matriz` |

---

## Endpoints Finales de Roles

```
GET    /api/roles                      — Lista roles (filtros: search, tipo, estado, per_page)
POST   /api/roles                      — Crear rol personalizado
GET    /api/roles/permisos/agrupados   — Permisos agrupados por módulo (para UI)
GET    /api/roles/{id}                 — Detalle de rol con permisos y usuarios
PUT    /api/roles/{id}                 — Actualizar rol (nombre_visible, descripcion, estado, permiso_ids)
PATCH  /api/roles/{id}/estado          — Alternar activo/inactivo
PATCH  /api/roles/{id}/permisos        — Actualizar solo permisos
POST   /api/roles/{id}/duplicar        — Duplicar rol con sus permisos
DELETE /api/roles/{id}                 — Eliminar rol (solo personalizados sin usuarios)
GET    /api/roles/{id}/usuarios        — Usuarios asignados al rol (paginado)
GET    /api/permisos/matriz            — Matriz de permisos estructurada por módulo
```

Todos requieren: `Authorization: Bearer {token}` + contraseña ya cambiada (middleware `ForzarCambioPassword`).

---

## Reglas de Negocio Implementadas

### Creación de roles
- Nombre único (ValidationException si ya existe)
- Siempre se crea en estado `activo`
- Dependencia automática: marcar "crear/editar/eliminar" agrega "ver" del mismo módulo
- Anti-escalada: usuarios que no son gerente/super_admin/es_admin_central no pueden asignar permisos que ellos mismos no tienen

### Actualización
- Roles del sistema: solo permite cambiar `nombre_visible` y `descripcion` (no `nombre`)
- Permisos: aplica dependencia y anti-escalada igual que al crear
- Registra diff (agregados/removidos) en notificación de auditoría

### Cambio de estado
- Alterna activo ↔ inactivo
- Si se desactiva y tiene usuarios: permite pero registra auditoría con advertencia
- Retorna el rol actualizado con `usuarios_count`

### Eliminación
- `es_sistema = true` → RolDelSistemaNoEliminableException (HTTP 403)
- Usuarios asignados > 0 → RolConUsuariosException (HTTP 422) con cantidad
- Si pasa: detach permisos + soft delete + auditoría

### Anti-escalada
- Gerente, super_admin o `es_admin_central = true`: sin restricción
- Otros: no pueden asignar permisos que no poseen → HTTP 403

---

## Resultado Tests

```
php artisan test --filter=Rol
Tests: 11 passed (33 assertions) — Duration: ~11s

php artisan test --filter=Auth
Tests: 14 passed (54 assertions) — Duration: ~11s
```

---

## Comandos para Correr

```bash
# Migrar y sembrar base de datos
php artisan migrate:fresh --seed

# Ejecutar tests de roles
php artisan test --filter=Rol

# Ejecutar todos los tests
php artisan test

# Compilar frontend
npm run build

# Servidor de desarrollo
npm run dev
php artisan serve
```

---

## Checklist Manual

- [ ] Acceder a `/dashboard/roles` y verificar que se listan los 7 roles del sistema
- [ ] Filtrar por tipo "Sistema" y ver solo roles de sistema
- [ ] Filtrar por tipo "Personalizado" y ver lista vacía (o roles creados)
- [ ] Crear un nuevo rol con permisos: verificar que al seleccionar "crear" se auto-selecciona "ver"
- [ ] Intentar eliminar rol "Gerente General" — debe mostrar error 403
- [ ] Crear rol personalizado con usuarios asignados e intentar eliminarlo — debe mostrar error 422
- [ ] Cambiar estado de un rol personalizado (toggle activo/inactivo)
- [ ] Duplicar un rol existente
- [ ] Editar nombre visible de un rol del sistema
- [ ] Verificar que usuario sin permisos recibe 401 al acceder a `/api/roles`
