# Migraciones Reconstruidas — Sistema CA & KANAGF S.R.L.

**Total:** 74 archivos de migración  
**Fecha de reconstrucción:** 2026-05-17  
**Motor:** InnoDB / utf8mb4  
**Framework:** Laravel 12 + MySQL

> La tabla `audits` la genera automáticamente owen-it/laravel-auditing v14 via `loadMigrationsFrom()`.  
> La tabla `visitas_domiciliarias` fue eliminada del sistema.

---

## Bloque Base (000000–000002)

| Timestamp | Tabla(s) |
|-----------|---------|
| 000000 | `users` — id, email, nombre, apellido_paterno, apellido_materno, ci, rol_id(sin FK), estado, datos faciales, softDeletes |
| 000001 | `cache`, `cache_locks` |
| 000002 | `jobs`, `job_batches`, `failed_jobs` |

---

## Bloque Seguridad (000010–000100)

| Timestamp | Tabla |
|-----------|-------|
| 000010 | `roles` — id, nombre(unique), nombre_visible, es_sistema, estado, softDeletes |
| 000011 | `permisos` — id, codigo(unique), nombre, nombre_visible, modulo, accion |
| 000012 | `rol_permiso` — pivot con cascade, unique(rol_id, permiso_id) |
| 000013 | `sesiones_usuario` — string PK, usuario_id(nullable FK→users), ip, user_agent |
| 000020 | `dispositivos_confiables` — usuario_id FK, token_hash(unique), plataforma, estado |
| 000021 | `codigos_otp` — usuario_id FK, codigo, tipo, usado, expira_en |
| 000022 | `tokens_recuperacion` — usuario_id FK, token_hash(unique), usado, expira_en |
| 000023 | `intentos_acceso` — usuario_id nullable, ip, exitoso, created_at only |
| 000024 | `notificaciones_sistema` — usuario_id FK, tipo, titulo, mensaje, icono, url, leida |
| 000025 | `personal_access_tokens` — Sanctum standard (morphs tokenable) |
| 000100 | Schema::table users → agrega FK `rol_id` → `roles` nullOnDelete |

---

## Bloque Catálogos (000200–000208)

| Timestamp | Tabla |
|-----------|-------|
| 000200 | `competencias` — nombre(unique), descripcion, categoria, vencimiento_requerido |
| 000201 | `tipos_proyecto` — nombre(unique), descripcion, requiere_licitacion |
| 000202 | `tipos_vivienda` — nombre(unique), descripcion, metros_cuadrados, cantidad_dormitorios, cantidad_banos, costo_referencial |
| 000203 | `tipos_actividad` — nombre(unique), descripcion, unidad_medida_default |
| 000204 | `categorias_material` — nombre(unique), descripcion |
| 000205 | `categorias_proveedor` — nombre(unique), descripcion |
| 000206 | `tipos_activo` — nombre(unique), descripcion |
| 000207 | `zonas_geograficas` — nombre, departamento, provincia, municipio, latitud/longitud centro, radio_km, codigo_postal, estado |
| 000208 | `configuracion_sistema` — clave(unique), valor, descripcion |

---

## Bloque Personal (000300–000304)

| Timestamp | Tabla |
|-----------|-------|
| 000300 | `personal` — usuario_id(unique nullable FK), codigo_empleado(unique), nombre, apellidos, ci(unique), tipo_contrato enum, salario_base, estado_laboral, fecha_desvinculacion, softDeletes |
| 000301 | `personal_competencia` — pivot: personal_id+competencia_id(unique), fecha_emision, fecha_vencimiento, entidad_emisora, estado |
| 000302 | `registros_asistencia` — personal_id FK, proyecto_id(sin FK), fecha, tipo, hora, latitud/longitud |
| 000303 | `planillas_pago` — codigo(unique), proyecto_id(sin FK), periodo_mes, frecuencia, totales, estado, softDeletes |
| 000304 | `detalles_planilla` — planilla_id+personal_id(unique), salario_base, días, horas_extra, bonos, descuentos, totales |

---

## Bloque Clientes / Beneficiarios (000400–000403)

| Timestamp | Tabla |
|-----------|-------|
| 000400 | `clientes` — tipo enum, nombre_completo, documento_tipo+numero(unique), zona_id FK, latitud/longitud, estado, origen, cliente_referido_por(self-FK), usuario_creador_id FK, softDeletes |
| 000401 | `entidades_estatales` — nombre, sigla, nivel, nit(unique), zona_id FK, representante_legal, tipo_proyectos_que_otorga, estado, softDeletes |
| 000402 | `proyectos` — codigo(unique), tipo_proyecto_id FK, cliente_id FK, entidad_estatal_id FK, estado(7 valores), fechas planificadas/reales, avance_fisico/financiero, responsable_id FK, softDeletes |
| 000403 | `beneficiarios` — codigo_beneficiario(unique), proyecto_id FK, ci(unique), estado_seleccion(6 valores), tipo_vivienda_id FK, softDeletes |

---

## Bloque Unidades (000500–000502)

| Timestamp | Tabla |
|-----------|-------|
| 000500 | `unidades_medida` — nombre(unique), simbolo(unique), tipo, activa |
| 000501 | `partidas` — codigo(unique), nombre, unidad_medida_id FK, partida_padre_id(self-FK), nivel, es_hoja |
| 000502 | `unidades_funcionales` — proyecto_id FK, tipo_vivienda_id FK, beneficiario_id FK, codigo(unique con proyecto), area_terreno, area_construccion, estado, softDeletes |

---

## Bloque Contratos (000600–000604)

| Timestamp | Tabla |
|-----------|-------|
| 000600 | `contratos` — numero_contrato(unique), proyecto_id FK, tipo_contrato, modalidad, cliente_id FK, entidad_estatal_id FK, monto_original, monto_vigente, plazo_dias, estado(6 valores), softDeletes |
| 000601 | `garantias_contrato` — contrato_id FK, tipo, entidad_emisora, monto, fechas, estado |
| 000602 | `adendas_contrato` — contrato_id FK, numero_adenda(unique con contrato), variacion_monto, variacion_plazo_dias, motivo |
| 000603 | `contrato_personal` — contrato_id FK, personal_id FK, rol_en_contrato, fechas, honorario_mensual, estado |
| 000604 | `contrato_entidad` — contrato_id+entidad_estatal_id(unique), rol_entidad |

---

## Bloque Cronograma (000700–000706)

| Timestamp | Tabla |
|-----------|-------|
| 000700 | `fases_proyecto` — proyecto_id FK, nombre, orden, fechas, avance_porcentaje, estado, fase_prerrequisito_id(self-FK) |
| 000701 | `actividades` — fase_id FK, partida_id FK, unidad_medida_id FK, metrado planificado/ejecutado, costo unitario/total, avance_porcentaje, responsable_id FK |
| 000702 | `actividad_recurso` — actividad_id FK, tipo_recurso enum, recurso_id(polymorphic manual), cantidad, unidad_medida_id FK |
| 000703 | `hitos` — proyecto_id FK, fase_id FK, fecha_planificada, tipo, es_critico, estado |
| 000704 | `avances_actividad` — actividad_id FK, registrado_por_id FK, fecha, metrado_avance, porcentaje_avance, validado |
| 000705 | `problemas_obra` — proyecto_id FK, fase_id FK, categoria, prioridad, estado, afecta_cronograma, dias_impacto, softDeletes |
| 000706 | `imagenes_avance` — morphs(imageable), subido_por_id FK, url, tipo_mime, es_principal |

---

## Bloque Almacenes (000800–000806)

| Timestamp | Tabla |
|-----------|-------|
| 000800 | `almacenes` — codigo(unique), proyecto_id FK, tipo(central/obra/temporal), responsable_id FK, softDeletes |
| 000801 | `materiales` — codigo(unique), categoria_id FK, unidad_medida_id FK, precio_referencial, stock_minimo, es_perecedero, softDeletes |
| 000802 | `stock_material` — almacen_id+material_id(unique), cantidad, cantidad_reservada, cantidad_disponible(virtual), costo_promedio |
| 000803 | `movimientos_inventario` — almacen_id+material_id FK, tipo_movimiento enum, cantidad, costos, proyecto_id FK, actividad_id FK, registrado_por_id FK |
| 000804 | `transferencias_inventario` — codigo(unique), almacen_origen_id FK, almacen_destino_id FK, estado |
| 000805 | `solicitudes_material` — codigo(unique), proyecto_id FK, actividad_id FK, almacen_id FK, prioridad, estado, softDeletes |
| 000806 | `detalles_solicitud` — solicitud_id FK, material_id FK, cantidades solicitada/aprobada/entregada, estado |

---

## Bloque Compras (000900–000907)

| Timestamp | Tabla |
|-----------|-------|
| 000900 | `proveedores` — codigo(unique), razon_social, nit(unique), categoria_id FK, zona_id FK, calificacion, estado, softDeletes |
| 000901 | `ordenes_compra` — numero_orden(unique), proyecto_id FK, proveedor_id FK, almacen_destino_id FK, estado(7 valores), moneda, softDeletes |
| 000902 | `detalles_orden_compra` — orden_compra_id FK, material_id FK, cantidades, precio_unitario, estado |
| 000903 | `recepciones_material` — codigo(unique), orden_compra_id FK, almacen_id FK, estado |
| 000904 | `detalles_recepcion` — recepcion_id FK, detalle_orden_id FK, material_id FK, cantidades, condicion |
| 000905 | `facturas_proveedor` — proveedor_id+numero_factura(unique), orden_compra_id FK, totales, saldo_pendiente(virtual), estado, softDeletes |
| 000906 | `pagos_proveedor` — factura_id FK, proveedor_id FK, monto, metodo_pago, numero_referencia |
| 000907 | `cotizaciones` — codigo(unique), proyecto_id FK, fecha_limite_respuesta, estado, softDeletes |

---

## Bloque Campo (001000–001001)

| Timestamp | Tabla |
|-----------|-------|
| 001000 | `maquinaria_equipo` — codigo(unique), tipo enum, serie(unique), estado, propiedad, costo_hora, costo_dia, vida_util, softDeletes |
| 001001 | `uso_maquinaria` — maquinaria_id FK, proyecto_id FK, actividad_id FK, operador_id FK, fecha, horas_uso, horometro_inicio/fin, combustible |

---

## Bloque Finanzas (001100–001102)

| Timestamp | Tabla |
|-----------|-------|
| 001100 | `presupuestos` — codigo(unique), proyecto_id FK, contrato_id FK, tipo, estado, monto_directo, gastos_generales, utilidad, impuestos, total, version, softDeletes |
| 001101 | `items_presupuesto` — presupuesto_id FK, partida_id FK, item_padre_id(self-FK), nivel, es_hoja, metrado, precio_unitario, subtotal |
| 001102 | `transacciones_financieras` — codigo(unique), proyecto_id FK, tipo(ingreso/egreso/ajuste), categoria(8 valores), monto, fecha_transaccion, estado, softDeletes |

---

## Bloque Activos (001200–001204)

| Timestamp | Tabla |
|-----------|-------|
| 001200 | `activos` — codigo(unique), tipo_activo_id FK, estado, propiedad, proyecto_actual_id FK, responsable_id FK, metodo_depreciacion, tasa_depreciacion, softDeletes |
| 001201 | `mantenimientos_activo` — activo_id FK, tipo(preventivo/correctivo/predictivo), fechas, costo, estado |
| 001202 | `depreciaciones_activo` — activo_id+periodo(unique), valor_inicio, monto_depreciacion, depreciacion_acumulada, valor_neto |
| 001203 | `asignaciones_activo` — activo_id FK, proyecto_id FK, personal_id FK, fechas, estado, condicion_entrega/devolucion |
| 001204 | `seguros_activo` — activo_id FK, aseguradora, numero_poliza, tipo_seguro, valor_asegurado, fechas, estado |

---

## Bloque Pública (001300–001301)

| Timestamp | Tabla |
|-----------|-------|
| 001300 | `solicitudes_informacion` — codigo(unique), proyecto_id FK, nombre/ci/email solicitante, tipo_informacion, canal, estado, atendido_por_id FK |
| 001301 | `documentos_publicos` — proyecto_id FK, titulo, categoria, archivo_url, es_publico, descargas, softDeletes |

---

## Notas importantes

- `registros_asistencia.proyecto_id` y `planillas_pago.proyecto_id`: columnas `unsignedBigInteger` **sin FK** (proyectos se crea después en 000402 y ambas tablas dependen de personal que va primero)
- `stock_material.cantidad_disponible` y `facturas_proveedor.saldo_pendiente`: columnas virtuales (`virtualAs`)
- FK circular `users.rol_id ↔ roles`: resuelta con migración diferida 000100
- owen-it/laravel-auditing v14 auto-crea la tabla `audits` — no hay migración manual para ella
