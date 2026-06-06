/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `actividad_recurso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actividad_recurso` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `actividad_id` bigint unsigned NOT NULL,
  `tipo_recurso` enum('personal','material','maquinaria','subcontrato') COLLATE utf8mb4_unicode_ci NOT NULL,
  `recurso_id` bigint unsigned NOT NULL,
  `recurso_descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cantidad_planificada` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `cantidad_ejecutada` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `unidad_medida_id` bigint unsigned DEFAULT NULL,
  `costo_unitario` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `costo_total` decimal(14,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `actividad_recurso_unidad_medida_id_foreign` (`unidad_medida_id`),
  KEY `actividad_recurso_actividad_id_index` (`actividad_id`),
  KEY `actividad_recurso_tipo_recurso_recurso_id_index` (`tipo_recurso`,`recurso_id`),
  CONSTRAINT `actividad_recurso_actividad_id_foreign` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE CASCADE,
  CONSTRAINT `actividad_recurso_unidad_medida_id_foreign` FOREIGN KEY (`unidad_medida_id`) REFERENCES `unidades_medida` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `actividades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actividades` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `fase_id` bigint unsigned NOT NULL,
  `partida_id` bigint unsigned DEFAULT NULL,
  `unidad_medida_id` bigint unsigned DEFAULT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `metrado_planificado` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `metrado_ejecutado` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `costo_unitario` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `costo_total_planificado` decimal(14,2) NOT NULL DEFAULT '0.00',
  `costo_total_ejecutado` decimal(14,2) NOT NULL DEFAULT '0.00',
  `fecha_inicio_planificada` date DEFAULT NULL,
  `fecha_fin_planificada` date DEFAULT NULL,
  `fecha_inicio_real` date DEFAULT NULL,
  `fecha_fin_real` date DEFAULT NULL,
  `avance_porcentaje` decimal(5,2) NOT NULL DEFAULT '0.00',
  `estado` enum('pendiente','en_progreso','completada','suspendida') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `orden` int NOT NULL DEFAULT '0',
  `responsable_id` bigint unsigned DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `actividades_partida_id_foreign` (`partida_id`),
  KEY `actividades_unidad_medida_id_foreign` (`unidad_medida_id`),
  KEY `actividades_responsable_id_foreign` (`responsable_id`),
  KEY `actividades_fase_id_index` (`fase_id`),
  CONSTRAINT `actividades_fase_id_foreign` FOREIGN KEY (`fase_id`) REFERENCES `fases_proyecto` (`id`) ON DELETE CASCADE,
  CONSTRAINT `actividades_partida_id_foreign` FOREIGN KEY (`partida_id`) REFERENCES `partidas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `actividades_responsable_id_foreign` FOREIGN KEY (`responsable_id`) REFERENCES `personal` (`id`) ON DELETE SET NULL,
  CONSTRAINT `actividades_unidad_medida_id_foreign` FOREIGN KEY (`unidad_medida_id`) REFERENCES `unidades_medida` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `activos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo_activo_id` bigint unsigned DEFAULT NULL,
  `marca` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modelo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serie` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `anio_fabricacion` year DEFAULT NULL,
  `fecha_adquisicion` date DEFAULT NULL,
  `valor_adquisicion` decimal(14,2) DEFAULT NULL,
  `valor_actual` decimal(14,2) DEFAULT NULL,
  `estado` enum('activo','en_uso','mantenimiento','baja','vendido') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `propiedad` enum('propio','arrendado','en_comodato') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'propio',
  `ubicacion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `proyecto_actual_id` bigint unsigned DEFAULT NULL,
  `responsable_id` bigint unsigned DEFAULT NULL,
  `vida_util_anios` int DEFAULT NULL,
  `metodo_depreciacion` enum('lineal','saldo_decreciente','unidades_produccion') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tasa_depreciacion` decimal(5,2) DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `activos_codigo_unique` (`codigo`),
  KEY `activos_proyecto_actual_id_foreign` (`proyecto_actual_id`),
  KEY `activos_responsable_id_foreign` (`responsable_id`),
  KEY `activos_tipo_activo_id_index` (`tipo_activo_id`),
  KEY `activos_estado_index` (`estado`),
  CONSTRAINT `activos_proyecto_actual_id_foreign` FOREIGN KEY (`proyecto_actual_id`) REFERENCES `proyectos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `activos_responsable_id_foreign` FOREIGN KEY (`responsable_id`) REFERENCES `personal` (`id`) ON DELETE SET NULL,
  CONSTRAINT `activos_tipo_activo_id_foreign` FOREIGN KEY (`tipo_activo_id`) REFERENCES `tipos_activo` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `adendas_contrato`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adendas_contrato` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `contrato_id` bigint unsigned NOT NULL,
  `numero_adenda` int NOT NULL,
  `fecha_firma` date NOT NULL,
  `variacion_monto` decimal(14,2) NOT NULL DEFAULT '0.00',
  `variacion_plazo_dias` int NOT NULL DEFAULT '0',
  `motivo` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `documento_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aprobado_por_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `adendas_contrato_contrato_id_numero_adenda_unique` (`contrato_id`,`numero_adenda`),
  KEY `adendas_contrato_aprobado_por_id_foreign` (`aprobado_por_id`),
  CONSTRAINT `adendas_contrato_aprobado_por_id_foreign` FOREIGN KEY (`aprobado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `adendas_contrato_contrato_id_foreign` FOREIGN KEY (`contrato_id`) REFERENCES `contratos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `almacenes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `almacenes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `proyecto_id` bigint unsigned DEFAULT NULL,
  `ubicacion` text COLLATE utf8mb4_unicode_ci,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `tipo` enum('central','obra','temporal') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'obra',
  `estado` enum('activo','inactivo','cerrado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `responsable_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `almacenes_codigo_unique` (`codigo`),
  KEY `almacenes_responsable_id_foreign` (`responsable_id`),
  KEY `almacenes_proyecto_id_index` (`proyecto_id`),
  CONSTRAINT `almacenes_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `almacenes_responsable_id_foreign` FOREIGN KEY (`responsable_id`) REFERENCES `personal` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `asignaciones_activo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asignaciones_activo` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `activo_id` bigint unsigned NOT NULL,
  `proyecto_id` bigint unsigned DEFAULT NULL,
  `personal_id` bigint unsigned DEFAULT NULL,
  `fecha_asignacion` date NOT NULL,
  `fecha_devolucion` date DEFAULT NULL,
  `estado` enum('activa','devuelta','perdida') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activa',
  `condicion_entrega` text COLLATE utf8mb4_unicode_ci,
  `condicion_devolucion` text COLLATE utf8mb4_unicode_ci,
  `asignado_por_id` bigint unsigned DEFAULT NULL,
  `recibido_por_id` bigint unsigned DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asignaciones_activo_personal_id_foreign` (`personal_id`),
  KEY `asignaciones_activo_asignado_por_id_foreign` (`asignado_por_id`),
  KEY `asignaciones_activo_recibido_por_id_foreign` (`recibido_por_id`),
  KEY `asignaciones_activo_activo_id_index` (`activo_id`),
  KEY `asignaciones_activo_proyecto_id_index` (`proyecto_id`),
  CONSTRAINT `asignaciones_activo_activo_id_foreign` FOREIGN KEY (`activo_id`) REFERENCES `activos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asignaciones_activo_asignado_por_id_foreign` FOREIGN KEY (`asignado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asignaciones_activo_personal_id_foreign` FOREIGN KEY (`personal_id`) REFERENCES `personal` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asignaciones_activo_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asignaciones_activo_recibido_por_id_foreign` FOREIGN KEY (`recibido_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `avances_actividad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `avances_actividad` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `actividad_id` bigint unsigned NOT NULL,
  `registrado_por_id` bigint unsigned DEFAULT NULL,
  `fecha` date NOT NULL,
  `metrado_avance` decimal(12,4) NOT NULL,
  `porcentaje_avance` decimal(5,2) NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `requiere_validacion` tinyint(1) NOT NULL DEFAULT '0',
  `validado` tinyint(1) NOT NULL DEFAULT '0',
  `validado_por_id` bigint unsigned DEFAULT NULL,
  `fecha_validacion` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `avances_actividad_registrado_por_id_foreign` (`registrado_por_id`),
  KEY `avances_actividad_validado_por_id_foreign` (`validado_por_id`),
  KEY `avances_actividad_actividad_id_index` (`actividad_id`),
  CONSTRAINT `avances_actividad_actividad_id_foreign` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE CASCADE,
  CONSTRAINT `avances_actividad_registrado_por_id_foreign` FOREIGN KEY (`registrado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `avances_actividad_validado_por_id_foreign` FOREIGN KEY (`validado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `beneficiarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `beneficiarios` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo_beneficiario` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proyecto_id` bigint unsigned DEFAULT NULL,
  `usuario_registrador_id` bigint unsigned DEFAULT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido_paterno` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido_materno` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apellido_conyuge` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ci` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ci_complemento` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `estado_civil` enum('soltero','casado','divorciado','viudo','union_libre') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `genero` enum('masculino','femenino','otro') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_principal` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono_alternativo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cantidad_familiares` int NOT NULL DEFAULT '0',
  `personas_dependientes` int NOT NULL DEFAULT '0',
  `ingreso_mensual_familiar` decimal(10,2) DEFAULT NULL,
  `direccion_actual` text COLLATE utf8mb4_unicode_ci,
  `comunidad` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion_terreno` text COLLATE utf8mb4_unicode_ci,
  `latitud_terreno` decimal(10,7) DEFAULT NULL,
  `longitud_terreno` decimal(10,7) DEFAULT NULL,
  `foto_titular_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `documento_propiedad_terreno_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado_seleccion` enum('candidato','aceptado','rechazado','en_construccion','vivienda_entregada','retirado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'candidato',
  `fecha_aceptacion` date DEFAULT NULL,
  `fecha_entrega_vivienda` date DEFAULT NULL,
  `tipo_vivienda_id` bigint unsigned DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `beneficiarios_codigo_beneficiario_unique` (`codigo_beneficiario`),
  UNIQUE KEY `beneficiarios_proyecto_ci_unique` (`proyecto_id`,`ci`),
  KEY `beneficiarios_usuario_registrador_id_foreign` (`usuario_registrador_id`),
  KEY `beneficiarios_tipo_vivienda_id_foreign` (`tipo_vivienda_id`),
  KEY `beneficiarios_estado_seleccion_index` (`estado_seleccion`),
  KEY `beneficiarios_proyecto_id_index` (`proyecto_id`),
  CONSTRAINT `beneficiarios_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `beneficiarios_tipo_vivienda_id_foreign` FOREIGN KEY (`tipo_vivienda_id`) REFERENCES `tipos_vivienda` (`id`) ON DELETE SET NULL,
  CONSTRAINT `beneficiarios_usuario_registrador_id_foreign` FOREIGN KEY (`usuario_registrador_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `categorias_material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias_material` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categorias_material_nombre_unique` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `categorias_proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias_proveedor` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categorias_proveedor_nombre_unique` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tipo` enum('persona_natural','empresa') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_completo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_comercial` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `documento_tipo` enum('ci','nit','pasaporte','cedula_extranjera') COLLATE utf8mb4_unicode_ci NOT NULL,
  `documento_numero` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `documento_complemento` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_principal` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono_alternativo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` text COLLATE utf8mb4_unicode_ci,
  `zona_id` bigint unsigned DEFAULT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `representante_legal` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cargo_representante` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sector` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `estado` enum('activo','inactivo','potencial','bloqueado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `origen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_referido_por` bigint unsigned DEFAULT NULL,
  `usuario_creador_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clientes_documento_tipo_documento_numero_unique` (`documento_tipo`,`documento_numero`),
  KEY `clientes_zona_id_foreign` (`zona_id`),
  KEY `clientes_cliente_referido_por_foreign` (`cliente_referido_por`),
  KEY `clientes_usuario_creador_id_foreign` (`usuario_creador_id`),
  CONSTRAINT `clientes_cliente_referido_por_foreign` FOREIGN KEY (`cliente_referido_por`) REFERENCES `clientes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `clientes_usuario_creador_id_foreign` FOREIGN KEY (`usuario_creador_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `clientes_zona_id_foreign` FOREIGN KEY (`zona_id`) REFERENCES `zonas_geograficas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `codigos_otp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `codigos_otp` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint unsigned NOT NULL,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_temporal` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fingerprint_dispositivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expira_en` timestamp NOT NULL,
  `usado` tinyint(1) NOT NULL DEFAULT '0',
  `intentos_fallidos` tinyint NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigos_otp_token_temporal_unique` (`token_temporal`),
  KEY `codigos_otp_usuario_id_foreign` (`usuario_id`),
  CONSTRAINT `codigos_otp_usuario_id_foreign` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `competencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `competencias` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requiere_renovacion` tinyint(1) NOT NULL DEFAULT '0',
  `vigencia_meses` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `competencias_nombre_unique` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `configuracion_sistema`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion_sistema` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `clave` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `configuracion_sistema_clave_unique` (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contrato_entidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contrato_entidad` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `contrato_id` bigint unsigned NOT NULL,
  `entidad_estatal_id` bigint unsigned NOT NULL,
  `rol_entidad` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contrato_entidad_contrato_id_entidad_estatal_id_unique` (`contrato_id`,`entidad_estatal_id`),
  KEY `contrato_entidad_entidad_estatal_id_foreign` (`entidad_estatal_id`),
  CONSTRAINT `contrato_entidad_contrato_id_foreign` FOREIGN KEY (`contrato_id`) REFERENCES `contratos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contrato_entidad_entidad_estatal_id_foreign` FOREIGN KEY (`entidad_estatal_id`) REFERENCES `entidades_estatales` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contrato_personal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contrato_personal` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `contrato_id` bigint unsigned NOT NULL,
  `personal_id` bigint unsigned NOT NULL,
  `rol_en_contrato` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `honorario_mensual` decimal(10,2) DEFAULT NULL,
  `estado` enum('activo','finalizado','retirado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `contrato_personal_contrato_id_index` (`contrato_id`),
  KEY `contrato_personal_personal_id_index` (`personal_id`),
  CONSTRAINT `contrato_personal_contrato_id_foreign` FOREIGN KEY (`contrato_id`) REFERENCES `contratos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contrato_personal_personal_id_foreign` FOREIGN KEY (`personal_id`) REFERENCES `personal` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contratos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contratos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `numero_contrato` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proyecto_id` bigint unsigned NOT NULL,
  `tipo_contrato` enum('obra','consultoria','supervision','suministro','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `modalidad` enum('suma_alzada','precios_unitarios','administracion_delegada','llave_en_mano') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_id` bigint unsigned DEFAULT NULL,
  `entidad_estatal_id` bigint unsigned DEFAULT NULL,
  `fecha_firma` date NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin_planificada` date NOT NULL,
  `fecha_fin_real` date DEFAULT NULL,
  `monto_original` decimal(14,2) NOT NULL,
  `monto_vigente` decimal(14,2) NOT NULL,
  `plazo_dias` int NOT NULL,
  `estado` enum('borrador','vigente','en_ejecucion','finalizado','rescindido','suspendido') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'borrador',
  `documento_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `objeto_contrato` text COLLATE utf8mb4_unicode_ci,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `creado_por_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contratos_numero_contrato_unique` (`numero_contrato`),
  KEY `contratos_cliente_id_foreign` (`cliente_id`),
  KEY `contratos_entidad_estatal_id_foreign` (`entidad_estatal_id`),
  KEY `contratos_creado_por_id_foreign` (`creado_por_id`),
  KEY `contratos_proyecto_id_index` (`proyecto_id`),
  KEY `contratos_estado_index` (`estado`),
  CONSTRAINT `contratos_cliente_id_foreign` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `contratos_creado_por_id_foreign` FOREIGN KEY (`creado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `contratos_entidad_estatal_id_foreign` FOREIGN KEY (`entidad_estatal_id`) REFERENCES `entidades_estatales` (`id`) ON DELETE SET NULL,
  CONSTRAINT `contratos_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cotizaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cotizaciones` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proyecto_id` bigint unsigned DEFAULT NULL,
  `solicitado_por_id` bigint unsigned DEFAULT NULL,
  `fecha_solicitud` date NOT NULL,
  `fecha_limite_respuesta` date DEFAULT NULL,
  `estado` enum('abierta','con_respuestas','adjudicada','cancelada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'abierta',
  `descripcion_necesidad` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cotizaciones_codigo_unique` (`codigo`),
  KEY `cotizaciones_solicitado_por_id_foreign` (`solicitado_por_id`),
  KEY `cotizaciones_proyecto_id_index` (`proyecto_id`),
  CONSTRAINT `cotizaciones_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cotizaciones_solicitado_por_id_foreign` FOREIGN KEY (`solicitado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `depreciaciones_activo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `depreciaciones_activo` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `activo_id` bigint unsigned NOT NULL,
  `periodo` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor_inicio_periodo` decimal(14,2) NOT NULL,
  `monto_depreciacion` decimal(12,2) NOT NULL,
  `depreciacion_acumulada` decimal(14,2) NOT NULL,
  `valor_neto_contable` decimal(14,2) NOT NULL,
  `calculado_por_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `depreciaciones_activo_activo_id_periodo_unique` (`activo_id`,`periodo`),
  KEY `depreciaciones_activo_calculado_por_id_foreign` (`calculado_por_id`),
  CONSTRAINT `depreciaciones_activo_activo_id_foreign` FOREIGN KEY (`activo_id`) REFERENCES `activos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `depreciaciones_activo_calculado_por_id_foreign` FOREIGN KEY (`calculado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `detalles_orden_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_orden_compra` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `orden_compra_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned NOT NULL,
  `cantidad_ordenada` decimal(12,4) NOT NULL,
  `cantidad_recibida` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `precio_unitario` decimal(12,4) NOT NULL,
  `descuento_unitario` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `subtotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  `especificaciones` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('pendiente','parcialmente_recibido','recibido','cancelado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `detalles_orden_compra_material_id_foreign` (`material_id`),
  KEY `detalles_orden_compra_orden_compra_id_index` (`orden_compra_id`),
  CONSTRAINT `detalles_orden_compra_material_id_foreign` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `detalles_orden_compra_orden_compra_id_foreign` FOREIGN KEY (`orden_compra_id`) REFERENCES `ordenes_compra` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `detalles_planilla`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_planilla` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `planilla_id` bigint unsigned NOT NULL,
  `personal_id` bigint unsigned NOT NULL,
  `salario_base` decimal(10,2) NOT NULL,
  `dias_trabajados` int NOT NULL DEFAULT '0',
  `horas_extra` int NOT NULL DEFAULT '0',
  `bono_productividad` decimal(10,2) NOT NULL DEFAULT '0.00',
  `otros_ingresos` decimal(10,2) NOT NULL DEFAULT '0.00',
  `descuento_afp` decimal(10,2) NOT NULL DEFAULT '0.00',
  `descuento_cns` decimal(10,2) NOT NULL DEFAULT '0.00',
  `otros_descuentos` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_bruto` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_neto` decimal(10,2) NOT NULL DEFAULT '0.00',
  `banco` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_cuenta` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `detalles_planilla_planilla_id_personal_id_unique` (`planilla_id`,`personal_id`),
  KEY `detalles_planilla_personal_id_foreign` (`personal_id`),
  CONSTRAINT `detalles_planilla_personal_id_foreign` FOREIGN KEY (`personal_id`) REFERENCES `personal` (`id`) ON DELETE CASCADE,
  CONSTRAINT `detalles_planilla_planilla_id_foreign` FOREIGN KEY (`planilla_id`) REFERENCES `planillas_pago` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `detalles_recepcion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_recepcion` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `recepcion_id` bigint unsigned NOT NULL,
  `detalle_orden_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned NOT NULL,
  `cantidad_recibida` decimal(12,4) NOT NULL,
  `cantidad_rechazada` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `motivo_rechazo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condicion` enum('buena','aceptable','defectuosa') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'buena',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `detalles_recepcion_detalle_orden_id_foreign` (`detalle_orden_id`),
  KEY `detalles_recepcion_material_id_foreign` (`material_id`),
  KEY `detalles_recepcion_recepcion_id_index` (`recepcion_id`),
  CONSTRAINT `detalles_recepcion_detalle_orden_id_foreign` FOREIGN KEY (`detalle_orden_id`) REFERENCES `detalles_orden_compra` (`id`) ON DELETE CASCADE,
  CONSTRAINT `detalles_recepcion_material_id_foreign` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `detalles_recepcion_recepcion_id_foreign` FOREIGN KEY (`recepcion_id`) REFERENCES `recepciones_material` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `detalles_solicitud`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_solicitud` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `solicitud_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned NOT NULL,
  `cantidad_solicitada` decimal(12,4) NOT NULL,
  `cantidad_aprobada` decimal(12,4) DEFAULT NULL,
  `cantidad_entregada` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `especificaciones` text COLLATE utf8mb4_unicode_ci,
  `estado` enum('pendiente','aprobado','entregado','rechazado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `detalles_solicitud_material_id_foreign` (`material_id`),
  KEY `detalles_solicitud_solicitud_id_index` (`solicitud_id`),
  CONSTRAINT `detalles_solicitud_material_id_foreign` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `detalles_solicitud_solicitud_id_foreign` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes_material` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dispositivos_confiables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispositivos_confiables` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint unsigned NOT NULL,
  `fingerprint` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_dispositivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_registro` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ultimo_uso` timestamp NULL DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `dispositivos_confiables_usuario_id_foreign` (`usuario_id`),
  CONSTRAINT `dispositivos_confiables_usuario_id_foreign` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `documentos_publicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documentos_publicos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `proyecto_id` bigint unsigned DEFAULT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `categoria` enum('contrato','plano','informe_avance','fotografia','acta','certificacion','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `archivo_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_archivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_mime` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tamanio_bytes` bigint unsigned DEFAULT NULL,
  `es_publico` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_documento` date DEFAULT NULL,
  `subido_por_id` bigint unsigned DEFAULT NULL,
  `descargas` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `documentos_publicos_subido_por_id_foreign` (`subido_por_id`),
  KEY `documentos_publicos_proyecto_id_index` (`proyecto_id`),
  KEY `documentos_publicos_es_publico_index` (`es_publico`),
  CONSTRAINT `documentos_publicos_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `documentos_publicos_subido_por_id_foreign` FOREIGN KEY (`subido_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `entidades_estatales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entidades_estatales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sigla` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nivel` enum('nacional','departamental','municipal','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nit` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` text COLLATE utf8mb4_unicode_ci,
  `zona_id` bigint unsigned DEFAULT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `telefono_principal` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_oficial` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sitio_web` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `representante_legal` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cargo_representante` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_proyectos_que_otorga` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('activa','inactiva') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activa',
  `notas` text COLLATE utf8mb4_unicode_ci,
  `usuario_creador_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `entidades_estatales_nit_unique` (`nit`),
  KEY `entidades_estatales_zona_id_foreign` (`zona_id`),
  KEY `entidades_estatales_usuario_creador_id_foreign` (`usuario_creador_id`),
  CONSTRAINT `entidades_estatales_usuario_creador_id_foreign` FOREIGN KEY (`usuario_creador_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `entidades_estatales_zona_id_foreign` FOREIGN KEY (`zona_id`) REFERENCES `zonas_geograficas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `facturas_proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `facturas_proveedor` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `numero_factura` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proveedor_id` bigint unsigned NOT NULL,
  `orden_compra_id` bigint unsigned DEFAULT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `subtotal` decimal(14,2) NOT NULL,
  `impuesto` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total` decimal(14,2) NOT NULL,
  `monto_pagado` decimal(14,2) NOT NULL DEFAULT '0.00',
  `saldo_pendiente` decimal(14,2) GENERATED ALWAYS AS ((`total` - `monto_pagado`)) VIRTUAL,
  `estado` enum('pendiente','parcialmente_pagada','pagada','vencida','anulada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `documento_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `registrado_por_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `facturas_proveedor_proveedor_id_numero_factura_unique` (`proveedor_id`,`numero_factura`),
  KEY `facturas_proveedor_orden_compra_id_foreign` (`orden_compra_id`),
  KEY `facturas_proveedor_registrado_por_id_foreign` (`registrado_por_id`),
  KEY `facturas_proveedor_estado_index` (`estado`),
  CONSTRAINT `facturas_proveedor_orden_compra_id_foreign` FOREIGN KEY (`orden_compra_id`) REFERENCES `ordenes_compra` (`id`) ON DELETE SET NULL,
  CONSTRAINT `facturas_proveedor_proveedor_id_foreign` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `facturas_proveedor_registrado_por_id_foreign` FOREIGN KEY (`registrado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fases_proyecto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fases_proyecto` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `proyecto_id` bigint unsigned NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `orden` int NOT NULL,
  `fecha_inicio_planificada` date DEFAULT NULL,
  `fecha_fin_planificada` date DEFAULT NULL,
  `fecha_inicio_real` date DEFAULT NULL,
  `fecha_fin_real` date DEFAULT NULL,
  `avance_porcentaje` decimal(5,2) NOT NULL DEFAULT '0.00',
  `estado` enum('pendiente','en_progreso','completada','suspendida') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `fase_prerrequisito_id` bigint unsigned DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fases_proyecto_fase_prerrequisito_id_foreign` (`fase_prerrequisito_id`),
  KEY `fases_proyecto_proyecto_id_index` (`proyecto_id`),
  CONSTRAINT `fases_proyecto_fase_prerrequisito_id_foreign` FOREIGN KEY (`fase_prerrequisito_id`) REFERENCES `fases_proyecto` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fases_proyecto_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `garantias_contrato`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `garantias_contrato` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `contrato_id` bigint unsigned NOT NULL,
  `tipo` enum('seriedad_oferta','cumplimiento','correcta_inversion','buena_ejecucion','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad_emisora` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_garantia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monto` decimal(12,2) NOT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `estado` enum('vigente','vencida','ejecutada','devuelta') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'vigente',
  `documento_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `garantias_contrato_contrato_id_index` (`contrato_id`),
  CONSTRAINT `garantias_contrato_contrato_id_foreign` FOREIGN KEY (`contrato_id`) REFERENCES `contratos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `hitos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hitos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `proyecto_id` bigint unsigned NOT NULL,
  `fase_id` bigint unsigned DEFAULT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `fecha_planificada` date NOT NULL,
  `fecha_cumplimiento` date DEFAULT NULL,
  `tipo` enum('entrega_parcial','entrega_final','pago','inspeccion','otro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'otro',
  `es_critico` tinyint(1) NOT NULL DEFAULT '0',
  `estado` enum('pendiente','cumplido','vencido','pospuesto') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `documento_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hitos_fase_id_foreign` (`fase_id`),
  KEY `hitos_proyecto_id_index` (`proyecto_id`),
  CONSTRAINT `hitos_fase_id_foreign` FOREIGN KEY (`fase_id`) REFERENCES `fases_proyecto` (`id`) ON DELETE SET NULL,
  CONSTRAINT `hitos_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `imagenes_avance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `imagenes_avance` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `imageable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `imageable_id` bigint unsigned NOT NULL,
  `subido_por_id` bigint unsigned DEFAULT NULL,
  `url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_archivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_mime` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tamanio_bytes` bigint unsigned DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `es_principal` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `imagenes_avance_imageable_type_imageable_id_index` (`imageable_type`,`imageable_id`),
  KEY `imagenes_avance_subido_por_id_foreign` (`subido_por_id`),
  CONSTRAINT `imagenes_avance_subido_por_id_foreign` FOREIGN KEY (`subido_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `intentos_acceso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `intentos_acceso` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `exitoso` tinyint(1) NOT NULL,
  `motivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `items_checklist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items_checklist` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `fase_id` bigint unsigned DEFAULT NULL,
  `vivienda_id` bigint unsigned DEFAULT NULL,
  `item_plantilla_id` bigint unsigned DEFAULT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden` int NOT NULL DEFAULT '0',
  `ponderacion` decimal(5,2) NOT NULL DEFAULT '0.00',
  `estado` enum('pendiente','en_proceso','completado','observado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `notas` text COLLATE utf8mb4_unicode_ci,
  `fecha_completado` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `items_checklist_item_plantilla_id_foreign` (`item_plantilla_id`),
  KEY `items_checklist_fase_id_estado_index` (`fase_id`,`estado`),
  KEY `items_checklist_vivienda_id_estado_index` (`vivienda_id`,`estado`),
  CONSTRAINT `items_checklist_fase_id_foreign` FOREIGN KEY (`fase_id`) REFERENCES `fases_proyecto` (`id`) ON DELETE CASCADE,
  CONSTRAINT `items_checklist_item_plantilla_id_foreign` FOREIGN KEY (`item_plantilla_id`) REFERENCES `items_plantilla` (`id`) ON DELETE SET NULL,
  CONSTRAINT `items_checklist_vivienda_id_foreign` FOREIGN KEY (`vivienda_id`) REFERENCES `viviendas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `items_plantilla`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items_plantilla` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `plantilla_id` bigint unsigned NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden` int NOT NULL DEFAULT '0',
  `ponderacion` decimal(5,2) NOT NULL DEFAULT '0.00',
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `items_plantilla_plantilla_id_index` (`plantilla_id`),
  CONSTRAINT `items_plantilla_plantilla_id_foreign` FOREIGN KEY (`plantilla_id`) REFERENCES `plantillas_checklist` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `items_presupuesto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items_presupuesto` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `presupuesto_id` bigint unsigned NOT NULL,
  `partida_id` bigint unsigned DEFAULT NULL,
  `item_padre_id` bigint unsigned DEFAULT NULL,
  `codigo_item` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nivel` int NOT NULL DEFAULT '1',
  `es_hoja` tinyint(1) NOT NULL DEFAULT '1',
  `unidad_medida_id` bigint unsigned DEFAULT NULL,
  `metrado` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `precio_unitario` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `subtotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  `orden` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `items_presupuesto_partida_id_foreign` (`partida_id`),
  KEY `items_presupuesto_item_padre_id_foreign` (`item_padre_id`),
  KEY `items_presupuesto_unidad_medida_id_foreign` (`unidad_medida_id`),
  KEY `items_presupuesto_presupuesto_id_index` (`presupuesto_id`),
  CONSTRAINT `items_presupuesto_item_padre_id_foreign` FOREIGN KEY (`item_padre_id`) REFERENCES `items_presupuesto` (`id`) ON DELETE SET NULL,
  CONSTRAINT `items_presupuesto_partida_id_foreign` FOREIGN KEY (`partida_id`) REFERENCES `partidas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `items_presupuesto_presupuesto_id_foreign` FOREIGN KEY (`presupuesto_id`) REFERENCES `presupuestos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `items_presupuesto_unidad_medida_id_foreign` FOREIGN KEY (`unidad_medida_id`) REFERENCES `unidades_medida` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mantenimientos_activo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mantenimientos_activo` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `activo_id` bigint unsigned NOT NULL,
  `tipo` enum('preventivo','correctivo','predictivo') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_programada` date NOT NULL,
  `fecha_realizado` date DEFAULT NULL,
  `proveedor_servicio` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `costo` decimal(12,2) DEFAULT NULL,
  `descripcion_trabajo` text COLLATE utf8mb4_unicode_ci,
  `numero_orden_trabajo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('programado','en_proceso','completado','cancelado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'programado',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `registrado_por_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mantenimientos_activo_registrado_por_id_foreign` (`registrado_por_id`),
  KEY `mantenimientos_activo_activo_id_index` (`activo_id`),
  CONSTRAINT `mantenimientos_activo_activo_id_foreign` FOREIGN KEY (`activo_id`) REFERENCES `activos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mantenimientos_activo_registrado_por_id_foreign` FOREIGN KEY (`registrado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `maquinaria_equipo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maquinaria_equipo` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('maquinaria_pesada','vehiculo','herramienta','equipo_medicion','equipo_seguridad','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `marca` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modelo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serie` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `anio_fabricacion` year DEFAULT NULL,
  `capacidad` decimal(10,2) DEFAULT NULL,
  `unidad_capacidad` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('disponible','en_uso','mantenimiento','reparacion','baja') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'disponible',
  `propiedad` enum('propio','arrendado','prestado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'propio',
  `costo_hora` decimal(10,2) DEFAULT NULL,
  `costo_dia` decimal(10,2) DEFAULT NULL,
  `fecha_adquisicion` date DEFAULT NULL,
  `valor_adquisicion` decimal(12,2) DEFAULT NULL,
  `fecha_ultimo_mantenimiento` date DEFAULT NULL,
  `fecha_proximo_mantenimiento` date DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `maquinaria_equipo_codigo_unique` (`codigo`),
  UNIQUE KEY `maquinaria_equipo_serie_unique` (`serie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `materiales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materiales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `categoria_id` bigint unsigned DEFAULT NULL,
  `unidad_medida_id` bigint unsigned DEFAULT NULL,
  `precio_referencial` decimal(12,4) DEFAULT NULL,
  `stock_minimo` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `marca` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modelo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `es_perecedero` tinyint(1) NOT NULL DEFAULT '0',
  `dias_vencimiento` int DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `materiales_codigo_unique` (`codigo`),
  KEY `materiales_categoria_id_foreign` (`categoria_id`),
  KEY `materiales_unidad_medida_id_foreign` (`unidad_medida_id`),
  CONSTRAINT `materiales_categoria_id_foreign` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_material` (`id`) ON DELETE SET NULL,
  CONSTRAINT `materiales_unidad_medida_id_foreign` FOREIGN KEY (`unidad_medida_id`) REFERENCES `unidades_medida` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `movimientos_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimientos_inventario` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `almacen_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned NOT NULL,
  `tipo_movimiento` enum('entrada','salida','ajuste','traslado_entrada','traslado_salida','devolucion') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad` decimal(12,4) NOT NULL,
  `costo_unitario` decimal(12,4) DEFAULT NULL,
  `costo_total` decimal(14,2) DEFAULT NULL,
  `stock_anterior` decimal(12,4) DEFAULT NULL,
  `stock_posterior` decimal(12,4) DEFAULT NULL,
  `proyecto_id` bigint unsigned DEFAULT NULL,
  `actividad_id` bigint unsigned DEFAULT NULL,
  `referencia_documento` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `motivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registrado_por_id` bigint unsigned DEFAULT NULL,
  `fecha_movimiento` timestamp NOT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `movimientos_inventario_material_id_foreign` (`material_id`),
  KEY `movimientos_inventario_proyecto_id_foreign` (`proyecto_id`),
  KEY `movimientos_inventario_actividad_id_foreign` (`actividad_id`),
  KEY `movimientos_inventario_registrado_por_id_foreign` (`registrado_por_id`),
  KEY `movimientos_inventario_almacen_id_material_id_index` (`almacen_id`,`material_id`),
  KEY `movimientos_inventario_tipo_movimiento_index` (`tipo_movimiento`),
  KEY `movimientos_inventario_fecha_movimiento_index` (`fecha_movimiento`),
  CONSTRAINT `movimientos_inventario_actividad_id_foreign` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE SET NULL,
  CONSTRAINT `movimientos_inventario_almacen_id_foreign` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `movimientos_inventario_material_id_foreign` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `movimientos_inventario_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `movimientos_inventario_registrado_por_id_foreign` FOREIGN KEY (`registrado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notificaciones_sistema`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones_sistema` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint unsigned NOT NULL,
  `tipo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `icono` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT '0',
  `data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notificaciones_sistema_usuario_id_foreign` (`usuario_id`),
  CONSTRAINT `notificaciones_sistema_usuario_id_foreign` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ordenes_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordenes_compra` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `numero_orden` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proyecto_id` bigint unsigned DEFAULT NULL,
  `proveedor_id` bigint unsigned NOT NULL,
  `almacen_destino_id` bigint unsigned DEFAULT NULL,
  `solicitado_por_id` bigint unsigned DEFAULT NULL,
  `aprobado_por_id` bigint unsigned DEFAULT NULL,
  `fecha_orden` date NOT NULL,
  `fecha_entrega_estimada` date DEFAULT NULL,
  `fecha_entrega_real` date DEFAULT NULL,
  `subtotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  `descuento` decimal(14,2) NOT NULL DEFAULT '0.00',
  `impuesto` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total` decimal(14,2) NOT NULL DEFAULT '0.00',
  `estado` enum('borrador','pendiente_aprobacion','aprobada','enviada','parcialmente_recibida','recibida','cancelada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'borrador',
  `moneda` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BOB',
  `condiciones_pago` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ordenes_compra_numero_orden_unique` (`numero_orden`),
  KEY `ordenes_compra_proyecto_id_foreign` (`proyecto_id`),
  KEY `ordenes_compra_almacen_destino_id_foreign` (`almacen_destino_id`),
  KEY `ordenes_compra_solicitado_por_id_foreign` (`solicitado_por_id`),
  KEY `ordenes_compra_aprobado_por_id_foreign` (`aprobado_por_id`),
  KEY `ordenes_compra_proveedor_id_index` (`proveedor_id`),
  KEY `ordenes_compra_estado_index` (`estado`),
  CONSTRAINT `ordenes_compra_almacen_destino_id_foreign` FOREIGN KEY (`almacen_destino_id`) REFERENCES `almacenes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ordenes_compra_aprobado_por_id_foreign` FOREIGN KEY (`aprobado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ordenes_compra_proveedor_id_foreign` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ordenes_compra_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ordenes_compra_solicitado_por_id_foreign` FOREIGN KEY (`solicitado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pagos_proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagos_proveedor` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `factura_id` bigint unsigned NOT NULL,
  `proveedor_id` bigint unsigned NOT NULL,
  `fecha_pago` date NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `metodo_pago` enum('efectivo','transferencia','cheque','otro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'transferencia',
  `numero_referencia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `banco` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comprobante_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `registrado_por_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pagos_proveedor_registrado_por_id_foreign` (`registrado_por_id`),
  KEY `pagos_proveedor_factura_id_index` (`factura_id`),
  KEY `pagos_proveedor_proveedor_id_index` (`proveedor_id`),
  CONSTRAINT `pagos_proveedor_factura_id_foreign` FOREIGN KEY (`factura_id`) REFERENCES `facturas_proveedor` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pagos_proveedor_proveedor_id_foreign` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pagos_proveedor_registrado_por_id_foreign` FOREIGN KEY (`registrado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `partidas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partidas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `unidad_medida_id` bigint unsigned DEFAULT NULL,
  `partida_padre_id` bigint unsigned DEFAULT NULL,
  `nivel` int NOT NULL DEFAULT '1',
  `es_hoja` tinyint(1) NOT NULL DEFAULT '1',
  `rendimiento_unitario` decimal(10,4) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `partidas_codigo_unique` (`codigo`),
  KEY `partidas_unidad_medida_id_foreign` (`unidad_medida_id`),
  KEY `partidas_partida_padre_id_index` (`partida_padre_id`),
  CONSTRAINT `partidas_partida_padre_id_foreign` FOREIGN KEY (`partida_padre_id`) REFERENCES `partidas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `partidas_unidad_medida_id_foreign` FOREIGN KEY (`unidad_medida_id`) REFERENCES `unidades_medida` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permisos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_visible` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modulo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permisos_codigo_unique` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint unsigned DEFAULT NULL,
  `codigo_empleado` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido_paterno` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido_materno` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ci` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ci_complemento` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` text COLLATE utf8mb4_unicode_ci,
  `fecha_nacimiento` date DEFAULT NULL,
  `tipo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `especialidad` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `categoria` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_contratacion` date NOT NULL,
  `tipo_contrato` enum('indefinido','plazo_fijo','obra','consultoria') COLLATE utf8mb4_unicode_ci NOT NULL,
  `salario_base` decimal(10,2) NOT NULL,
  `frecuencia_pago` enum('semanal','quincenal','mensual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `banco` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_cuenta` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_cuenta` enum('ahorro','corriente') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado_laboral` enum('activo','vacaciones','licencia','desvinculado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `fecha_desvinculacion` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_codigo_empleado_unique` (`codigo_empleado`),
  UNIQUE KEY `personal_ci_unique` (`ci`),
  UNIQUE KEY `personal_usuario_id_unique` (`usuario_id`),
  CONSTRAINT `personal_usuario_id_foreign` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personal_competencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_competencia` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `personal_id` bigint unsigned NOT NULL,
  `competencia_id` bigint unsigned NOT NULL,
  `fecha_emision` date DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `entidad_emisora` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_certificado` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `archivo_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('vigente','vencida','por_vencer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'vigente',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_competencia_personal_id_competencia_id_unique` (`personal_id`,`competencia_id`),
  KEY `personal_competencia_competencia_id_foreign` (`competencia_id`),
  CONSTRAINT `personal_competencia_competencia_id_foreign` FOREIGN KEY (`competencia_id`) REFERENCES `competencias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `personal_competencia_personal_id_foreign` FOREIGN KEY (`personal_id`) REFERENCES `personal` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `planillas_pago`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `planillas_pago` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proyecto_id` bigint unsigned DEFAULT NULL,
  `generado_por_id` bigint unsigned DEFAULT NULL,
  `periodo_mes` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio_periodo` date NOT NULL,
  `fecha_fin_periodo` date NOT NULL,
  `frecuencia` enum('semanal','quincenal','mensual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_bruto` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_descuentos` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_neto` decimal(12,2) NOT NULL DEFAULT '0.00',
  `estado` enum('borrador','aprobada','pagada','anulada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'borrador',
  `fecha_aprobacion` date DEFAULT NULL,
  `fecha_pago` date DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `planillas_pago_codigo_unique` (`codigo`),
  KEY `planillas_pago_generado_por_id_foreign` (`generado_por_id`),
  KEY `planillas_pago_proyecto_id_index` (`proyecto_id`),
  CONSTRAINT `planillas_pago_generado_por_id_foreign` FOREIGN KEY (`generado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `plantillas_checklist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plantillas_checklist` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `clave` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_obra` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `es_predeterminada` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plantillas_checklist_clave_unique` (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `presupuestos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `presupuestos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proyecto_id` bigint unsigned NOT NULL,
  `contrato_id` bigint unsigned DEFAULT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('referencial','detallado','reformulado','final') COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('borrador','revision','aprobado','vigente','cerrado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'borrador',
  `monto_directo` decimal(14,2) NOT NULL DEFAULT '0.00',
  `gastos_generales` decimal(14,2) NOT NULL DEFAULT '0.00',
  `utilidad` decimal(14,2) NOT NULL DEFAULT '0.00',
  `impuestos` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total` decimal(14,2) NOT NULL DEFAULT '0.00',
  `fecha_elaboracion` date NOT NULL,
  `fecha_aprobacion` date DEFAULT NULL,
  `version` int NOT NULL DEFAULT '1',
  `elaborado_por_id` bigint unsigned DEFAULT NULL,
  `aprobado_por_id` bigint unsigned DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `presupuestos_codigo_unique` (`codigo`),
  KEY `presupuestos_contrato_id_foreign` (`contrato_id`),
  KEY `presupuestos_elaborado_por_id_foreign` (`elaborado_por_id`),
  KEY `presupuestos_aprobado_por_id_foreign` (`aprobado_por_id`),
  KEY `presupuestos_proyecto_id_index` (`proyecto_id`),
  CONSTRAINT `presupuestos_aprobado_por_id_foreign` FOREIGN KEY (`aprobado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `presupuestos_contrato_id_foreign` FOREIGN KEY (`contrato_id`) REFERENCES `contratos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `presupuestos_elaborado_por_id_foreign` FOREIGN KEY (`elaborado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `presupuestos_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `problemas_obra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `problemas_obra` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `proyecto_id` bigint unsigned NOT NULL,
  `fase_id` bigint unsigned DEFAULT NULL,
  `reportado_por_id` bigint unsigned DEFAULT NULL,
  `asignado_a_id` bigint unsigned DEFAULT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` enum('tecnico','administrativo','seguridad','calidad','ambiental','otro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'otro',
  `prioridad` enum('baja','media','alta','critica') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'media',
  `estado` enum('abierto','en_proceso','resuelto','cerrado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'abierto',
  `fecha_reporte` date NOT NULL,
  `fecha_limite` date DEFAULT NULL,
  `fecha_resolucion` date DEFAULT NULL,
  `solucion_aplicada` text COLLATE utf8mb4_unicode_ci,
  `costo_solucion` decimal(12,2) DEFAULT NULL,
  `afecta_cronograma` tinyint(1) NOT NULL DEFAULT '0',
  `dias_impacto` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `problemas_obra_fase_id_foreign` (`fase_id`),
  KEY `problemas_obra_reportado_por_id_foreign` (`reportado_por_id`),
  KEY `problemas_obra_asignado_a_id_foreign` (`asignado_a_id`),
  KEY `problemas_obra_proyecto_id_index` (`proyecto_id`),
  KEY `problemas_obra_estado_index` (`estado`),
  CONSTRAINT `problemas_obra_asignado_a_id_foreign` FOREIGN KEY (`asignado_a_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `problemas_obra_fase_id_foreign` FOREIGN KEY (`fase_id`) REFERENCES `fases_proyecto` (`id`) ON DELETE SET NULL,
  CONSTRAINT `problemas_obra_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `problemas_obra_reportado_por_id_foreign` FOREIGN KEY (`reportado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `productos_contractuales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos_contractuales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `proyecto_id` bigint unsigned NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `porcentaje` decimal(5,2) NOT NULL,
  `monto_calculado` decimal(14,2) NOT NULL DEFAULT '0.00',
  `fecha_planificada_cobro` date NOT NULL,
  `fecha_cobro_real` date DEFAULT NULL,
  `estado` enum('pendiente','en_proceso','cobrado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `orden` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `productos_contractuales_proyecto_id_index` (`proyecto_id`),
  CONSTRAINT `productos_contractuales_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `proveedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedores` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `razon_social` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_comercial` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nit` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `categoria_id` bigint unsigned DEFAULT NULL,
  `tipo` enum('persona_natural','empresa') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'empresa',
  `contacto_nombre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contacto_telefono` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contacto_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_principal` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_oficial` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` text COLLATE utf8mb4_unicode_ci,
  `zona_id` bigint unsigned DEFAULT NULL,
  `sitio_web` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `productos_servicios` text COLLATE utf8mb4_unicode_ci,
  `estado` enum('activo','inactivo','bloqueado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `calificacion` decimal(3,2) DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `registrado_por_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `proveedores_codigo_unique` (`codigo`),
  UNIQUE KEY `proveedores_nit_unique` (`nit`),
  KEY `proveedores_categoria_id_foreign` (`categoria_id`),
  KEY `proveedores_zona_id_foreign` (`zona_id`),
  KEY `proveedores_registrado_por_id_foreign` (`registrado_por_id`),
  CONSTRAINT `proveedores_categoria_id_foreign` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_proveedor` (`id`) ON DELETE SET NULL,
  CONSTRAINT `proveedores_registrado_por_id_foreign` FOREIGN KEY (`registrado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `proveedores_zona_id_foreign` FOREIGN KEY (`zona_id`) REFERENCES `zonas_geograficas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `proyectos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proyectos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `categoria` enum('social','privado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'social',
  `prioridad` enum('baja','media','alta','critica') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'media',
  `cantidad_unidades` int DEFAULT NULL,
  `cantidad_beneficiarios` int DEFAULT NULL,
  `tipo_proyecto_id` bigint unsigned DEFAULT NULL,
  `tipo_obra` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_id` bigint unsigned DEFAULT NULL,
  `entidad_estatal_id` bigint unsigned DEFAULT NULL,
  `zona_id` bigint unsigned DEFAULT NULL,
  `direccion_obra` text COLLATE utf8mb4_unicode_ci,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `estado` enum('formulacion','licitacion','adjudicado','en_ejecucion','pausado','finalizado','cancelado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'formulacion',
  `fecha_inicio_planificada` date DEFAULT NULL,
  `fecha_fin_planificada` date DEFAULT NULL,
  `plazo_dias` int DEFAULT NULL,
  `fecha_inicio_real` date DEFAULT NULL,
  `fecha_fin_real` date DEFAULT NULL,
  `presupuesto_referencial` decimal(14,2) DEFAULT NULL,
  `monto_contrato` decimal(14,2) DEFAULT NULL,
  `contrato_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avance_fisico` decimal(5,2) NOT NULL DEFAULT '0.00',
  `avance_financiero` decimal(5,2) NOT NULL DEFAULT '0.00',
  `responsable_id` bigint unsigned DEFAULT NULL,
  `creado_por_id` bigint unsigned DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `proyectos_codigo_unique` (`codigo`),
  KEY `proyectos_tipo_proyecto_id_foreign` (`tipo_proyecto_id`),
  KEY `proyectos_zona_id_foreign` (`zona_id`),
  KEY `proyectos_responsable_id_foreign` (`responsable_id`),
  KEY `proyectos_creado_por_id_foreign` (`creado_por_id`),
  KEY `proyectos_estado_index` (`estado`),
  KEY `proyectos_cliente_id_index` (`cliente_id`),
  KEY `proyectos_entidad_estatal_id_index` (`entidad_estatal_id`),
  CONSTRAINT `proyectos_cliente_id_foreign` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `proyectos_creado_por_id_foreign` FOREIGN KEY (`creado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `proyectos_entidad_estatal_id_foreign` FOREIGN KEY (`entidad_estatal_id`) REFERENCES `entidades_estatales` (`id`) ON DELETE SET NULL,
  CONSTRAINT `proyectos_responsable_id_foreign` FOREIGN KEY (`responsable_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `proyectos_tipo_proyecto_id_foreign` FOREIGN KEY (`tipo_proyecto_id`) REFERENCES `tipos_proyecto` (`id`) ON DELETE SET NULL,
  CONSTRAINT `proyectos_zona_id_foreign` FOREIGN KEY (`zona_id`) REFERENCES `zonas_geograficas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `recepciones_material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recepciones_material` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden_compra_id` bigint unsigned NOT NULL,
  `almacen_id` bigint unsigned NOT NULL,
  `recibido_por_id` bigint unsigned DEFAULT NULL,
  `fecha_recepcion` date NOT NULL,
  `numero_remision` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('completa','parcial','con_observaciones') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completa',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `recepciones_material_codigo_unique` (`codigo`),
  KEY `recepciones_material_almacen_id_foreign` (`almacen_id`),
  KEY `recepciones_material_recibido_por_id_foreign` (`recibido_por_id`),
  KEY `recepciones_material_orden_compra_id_index` (`orden_compra_id`),
  CONSTRAINT `recepciones_material_almacen_id_foreign` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recepciones_material_orden_compra_id_foreign` FOREIGN KEY (`orden_compra_id`) REFERENCES `ordenes_compra` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recepciones_material_recibido_por_id_foreign` FOREIGN KEY (`recibido_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `registros_asistencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registros_asistencia` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `personal_id` bigint unsigned NOT NULL,
  `proyecto_id` bigint unsigned DEFAULT NULL,
  `fecha` date NOT NULL,
  `tipo` enum('entrada','salida','descanso') COLLATE utf8mb4_unicode_ci NOT NULL,
  `hora` time NOT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `metodo_registro` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `registros_asistencia_proyecto_id_index` (`proyecto_id`),
  KEY `registros_asistencia_personal_id_fecha_index` (`personal_id`,`fecha`),
  CONSTRAINT `registros_asistencia_personal_id_foreign` FOREIGN KEY (`personal_id`) REFERENCES `personal` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rol_permiso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rol_permiso` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `rol_id` bigint unsigned NOT NULL,
  `permiso_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rol_permiso_rol_id_permiso_id_unique` (`rol_id`,`permiso_id`),
  KEY `rol_permiso_permiso_id_foreign` (`permiso_id`),
  CONSTRAINT `rol_permiso_permiso_id_foreign` FOREIGN KEY (`permiso_id`) REFERENCES `permisos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rol_permiso_rol_id_foreign` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_visible` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `es_sistema` tinyint(1) NOT NULL DEFAULT '0',
  `estado` enum('activo','inactivo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_nombre_unique` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `seguros_activo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `seguros_activo` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `activo_id` bigint unsigned NOT NULL,
  `aseguradora` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_poliza` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_seguro` enum('todo_riesgo','responsabilidad_civil','robo','incendio','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor_asegurado` decimal(14,2) NOT NULL,
  `prima_anual` decimal(12,2) DEFAULT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `estado` enum('vigente','vencido','cancelado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'vigente',
  `documento_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `seguros_activo_activo_id_index` (`activo_id`),
  CONSTRAINT `seguros_activo_activo_id_foreign` FOREIGN KEY (`activo_id`) REFERENCES `activos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sesiones_usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sesiones_usuario` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sesiones_usuario_usuario_id_foreign` (`usuario_id`),
  KEY `sesiones_usuario_last_activity_index` (`last_activity`),
  CONSTRAINT `sesiones_usuario_usuario_id_foreign` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `solicitudes_informacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_informacion` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proyecto_id` bigint unsigned DEFAULT NULL,
  `nombre_solicitante` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ci_solicitante` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_solicitante` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_solicitante` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion_solicitud` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_informacion` enum('avance_obra','documentos','estado_beneficiario','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `canal` enum('presencial','email','telefono','web') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'presencial',
  `fecha_solicitud` date NOT NULL,
  `fecha_respuesta_limite` date DEFAULT NULL,
  `fecha_respuesta_real` date DEFAULT NULL,
  `estado` enum('recibida','en_proceso','respondida','archivada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'recibida',
  `respuesta` text COLLATE utf8mb4_unicode_ci,
  `atendido_por_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `solicitudes_informacion_codigo_unique` (`codigo`),
  KEY `solicitudes_informacion_atendido_por_id_foreign` (`atendido_por_id`),
  KEY `solicitudes_informacion_proyecto_id_index` (`proyecto_id`),
  KEY `solicitudes_informacion_estado_index` (`estado`),
  CONSTRAINT `solicitudes_informacion_atendido_por_id_foreign` FOREIGN KEY (`atendido_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `solicitudes_informacion_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `solicitudes_material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_material` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proyecto_id` bigint unsigned NOT NULL,
  `actividad_id` bigint unsigned DEFAULT NULL,
  `almacen_id` bigint unsigned DEFAULT NULL,
  `solicitado_por_id` bigint unsigned DEFAULT NULL,
  `aprobado_por_id` bigint unsigned DEFAULT NULL,
  `fecha_solicitud` date NOT NULL,
  `fecha_necesidad` date DEFAULT NULL,
  `estado` enum('pendiente','aprobada','parcialmente_atendida','atendida','rechazada','cancelada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `prioridad` enum('baja','normal','alta','urgente') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `justificacion` text COLLATE utf8mb4_unicode_ci,
  `observaciones_aprobacion` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `solicitudes_material_codigo_unique` (`codigo`),
  KEY `solicitudes_material_actividad_id_foreign` (`actividad_id`),
  KEY `solicitudes_material_almacen_id_foreign` (`almacen_id`),
  KEY `solicitudes_material_solicitado_por_id_foreign` (`solicitado_por_id`),
  KEY `solicitudes_material_aprobado_por_id_foreign` (`aprobado_por_id`),
  KEY `solicitudes_material_proyecto_id_index` (`proyecto_id`),
  KEY `solicitudes_material_estado_index` (`estado`),
  CONSTRAINT `solicitudes_material_actividad_id_foreign` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE SET NULL,
  CONSTRAINT `solicitudes_material_almacen_id_foreign` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `solicitudes_material_aprobado_por_id_foreign` FOREIGN KEY (`aprobado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `solicitudes_material_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `solicitudes_material_solicitado_por_id_foreign` FOREIGN KEY (`solicitado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `stock_material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_material` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `almacen_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned NOT NULL,
  `cantidad` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `cantidad_reservada` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `cantidad_disponible` decimal(12,4) GENERATED ALWAYS AS ((`cantidad` - `cantidad_reservada`)) VIRTUAL,
  `costo_promedio` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `ultima_actualizacion` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stock_material_almacen_id_material_id_unique` (`almacen_id`,`material_id`),
  KEY `stock_material_material_id_index` (`material_id`),
  CONSTRAINT `stock_material_almacen_id_foreign` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_material_material_id_foreign` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tipos_actividad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_actividad` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `orden` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tipos_actividad_nombre_unique` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tipos_activo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_activo` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tipos_activo_nombre_unique` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tipos_proyecto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_proyecto` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `categoria` enum('social','privado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'privado',
  `requiere_beneficiarios` tinyint(1) NOT NULL DEFAULT '0',
  `requiere_entidad_estatal` tinyint(1) NOT NULL DEFAULT '0',
  `estado` enum('activo','inactivo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tipos_proyecto_nombre_unique` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tipos_vivienda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_vivienda` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `plano_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metros_cuadrados` decimal(8,2) DEFAULT NULL,
  `cantidad_dormitorios` int DEFAULT NULL,
  `cantidad_banos` int DEFAULT NULL,
  `costo_referencial` decimal(12,2) DEFAULT NULL,
  `estado` enum('activo','inactivo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tokens_recuperacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens_recuperacion` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint unsigned NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expira_en` timestamp NOT NULL,
  `usado` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tokens_recuperacion_usuario_id_foreign` (`usuario_id`),
  CONSTRAINT `tokens_recuperacion_usuario_id_foreign` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `transacciones_financieras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transacciones_financieras` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proyecto_id` bigint unsigned DEFAULT NULL,
  `tipo` enum('ingreso','egreso','ajuste') COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` enum('anticipo_cliente','cobro_valorizacion','pago_proveedor','pago_planilla','gasto_administrativo','gasto_financiero','devolucion','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `monto` decimal(14,2) NOT NULL,
  `moneda` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BOB',
  `fecha_transaccion` date NOT NULL,
  `referencia_documento` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metodo_pago` enum('efectivo','transferencia','cheque','otro') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `banco` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_cuenta` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `registrado_por_id` bigint unsigned DEFAULT NULL,
  `aprobado_por_id` bigint unsigned DEFAULT NULL,
  `estado` enum('pendiente','confirmada','anulada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'confirmada',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transacciones_financieras_codigo_unique` (`codigo`),
  KEY `transacciones_financieras_registrado_por_id_foreign` (`registrado_por_id`),
  KEY `transacciones_financieras_aprobado_por_id_foreign` (`aprobado_por_id`),
  KEY `transacciones_financieras_proyecto_id_index` (`proyecto_id`),
  KEY `transacciones_financieras_tipo_index` (`tipo`),
  KEY `transacciones_financieras_fecha_transaccion_index` (`fecha_transaccion`),
  CONSTRAINT `transacciones_financieras_aprobado_por_id_foreign` FOREIGN KEY (`aprobado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `transacciones_financieras_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `transacciones_financieras_registrado_por_id_foreign` FOREIGN KEY (`registrado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `transferencias_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transferencias_inventario` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `almacen_origen_id` bigint unsigned NOT NULL,
  `almacen_destino_id` bigint unsigned NOT NULL,
  `solicitado_por_id` bigint unsigned DEFAULT NULL,
  `aprobado_por_id` bigint unsigned DEFAULT NULL,
  `fecha_solicitud` date NOT NULL,
  `fecha_transferencia` date DEFAULT NULL,
  `estado` enum('pendiente','aprobada','en_transito','recibida','rechazada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `motivo` text COLLATE utf8mb4_unicode_ci,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transferencias_inventario_codigo_unique` (`codigo`),
  KEY `transferencias_inventario_almacen_origen_id_foreign` (`almacen_origen_id`),
  KEY `transferencias_inventario_almacen_destino_id_foreign` (`almacen_destino_id`),
  KEY `transferencias_inventario_solicitado_por_id_foreign` (`solicitado_por_id`),
  KEY `transferencias_inventario_aprobado_por_id_foreign` (`aprobado_por_id`),
  CONSTRAINT `transferencias_inventario_almacen_destino_id_foreign` FOREIGN KEY (`almacen_destino_id`) REFERENCES `almacenes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transferencias_inventario_almacen_origen_id_foreign` FOREIGN KEY (`almacen_origen_id`) REFERENCES `almacenes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transferencias_inventario_aprobado_por_id_foreign` FOREIGN KEY (`aprobado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `transferencias_inventario_solicitado_por_id_foreign` FOREIGN KEY (`solicitado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `unidades_funcionales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `unidades_funcionales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `proyecto_id` bigint unsigned NOT NULL,
  `tipo_vivienda_id` bigint unsigned DEFAULT NULL,
  `beneficiario_id` bigint unsigned DEFAULT NULL,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('vivienda','infraestructura','equipamiento','otro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'vivienda',
  `area_terreno` decimal(10,2) DEFAULT NULL,
  `area_construccion` decimal(10,2) DEFAULT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `estado` enum('libre','asignada','en_construccion','entregada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'libre',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unidades_funcionales_proyecto_id_codigo_unique` (`proyecto_id`,`codigo`),
  KEY `unidades_funcionales_tipo_vivienda_id_foreign` (`tipo_vivienda_id`),
  KEY `unidades_funcionales_beneficiario_id_foreign` (`beneficiario_id`),
  KEY `unidades_funcionales_proyecto_id_index` (`proyecto_id`),
  CONSTRAINT `unidades_funcionales_beneficiario_id_foreign` FOREIGN KEY (`beneficiario_id`) REFERENCES `beneficiarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `unidades_funcionales_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `unidades_funcionales_tipo_vivienda_id_foreign` FOREIGN KEY (`tipo_vivienda_id`) REFERENCES `tipos_vivienda` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `unidades_medida`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `unidades_medida` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `simbolo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unidades_medida_nombre_unique` (`nombre`),
  UNIQUE KEY `unidades_medida_simbolo_unique` (`simbolo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apellido_paterno` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apellido_materno` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ci` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ci_complemento` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` text COLLATE utf8mb4_unicode_ci,
  `fecha_nacimiento` date DEFAULT NULL,
  `foto_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rol_id` bigint unsigned DEFAULT NULL,
  `estado` enum('activo','inactivo','suspendido') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `debe_cambiar_password` tinyint(1) NOT NULL DEFAULT '1',
  `intentos_fallidos` int NOT NULL DEFAULT '0',
  `bloqueado_hasta` timestamp NULL DEFAULT NULL,
  `rostro_registrado` tinyint(1) NOT NULL DEFAULT '0',
  `descriptor_facial` longtext COLLATE utf8mb4_unicode_ci,
  `rostro_base64` longtext COLLATE utf8mb4_unicode_ci,
  `rostro_registrado_en` timestamp NULL DEFAULT NULL,
  `password_cambiado_en` timestamp NULL DEFAULT NULL,
  `es_admin_central` tinyint(1) NOT NULL DEFAULT '0',
  `ultimo_acceso` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_ci_unique` (`ci`),
  KEY `users_rol_id_foreign` (`rol_id`),
  CONSTRAINT `users_rol_id_foreign` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `uso_maquinaria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `uso_maquinaria` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `maquinaria_id` bigint unsigned NOT NULL,
  `proyecto_id` bigint unsigned DEFAULT NULL,
  `actividad_id` bigint unsigned DEFAULT NULL,
  `operador_id` bigint unsigned DEFAULT NULL,
  `fecha` date NOT NULL,
  `horas_uso` decimal(8,2) NOT NULL DEFAULT '0.00',
  `costo_total` decimal(12,2) DEFAULT NULL,
  `horometro_inicio` decimal(10,2) DEFAULT NULL,
  `horometro_fin` decimal(10,2) DEFAULT NULL,
  `combustible_consumido` decimal(10,2) DEFAULT NULL,
  `trabajo_realizado` text COLLATE utf8mb4_unicode_ci,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `registrado_por_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `uso_maquinaria_actividad_id_foreign` (`actividad_id`),
  KEY `uso_maquinaria_operador_id_foreign` (`operador_id`),
  KEY `uso_maquinaria_registrado_por_id_foreign` (`registrado_por_id`),
  KEY `uso_maquinaria_maquinaria_id_fecha_index` (`maquinaria_id`,`fecha`),
  KEY `uso_maquinaria_proyecto_id_index` (`proyecto_id`),
  CONSTRAINT `uso_maquinaria_actividad_id_foreign` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE SET NULL,
  CONSTRAINT `uso_maquinaria_maquinaria_id_foreign` FOREIGN KEY (`maquinaria_id`) REFERENCES `maquinaria_equipo` (`id`) ON DELETE CASCADE,
  CONSTRAINT `uso_maquinaria_operador_id_foreign` FOREIGN KEY (`operador_id`) REFERENCES `personal` (`id`) ON DELETE SET NULL,
  CONSTRAINT `uso_maquinaria_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `uso_maquinaria_registrado_por_id_foreign` FOREIGN KEY (`registrado_por_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `viviendas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `viviendas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `proyecto_id` bigint unsigned NOT NULL,
  `beneficiario_id` bigint unsigned DEFAULT NULL,
  `tipo_vivienda_id` bigint unsigned DEFAULT NULL,
  `usuario_creador_id` bigint unsigned DEFAULT NULL,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('planificada','terreno_preparado','cimentacion','obra_gruesa','obra_fina','acabados','entregada','con_observaciones') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'planificada',
  `porcentaje_avance` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tiene_observaciones_activas` tinyint(1) NOT NULL DEFAULT '0',
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `viviendas_proyecto_id_codigo_unique` (`proyecto_id`,`codigo`),
  KEY `viviendas_beneficiario_id_foreign` (`beneficiario_id`),
  KEY `viviendas_tipo_vivienda_id_foreign` (`tipo_vivienda_id`),
  KEY `viviendas_usuario_creador_id_foreign` (`usuario_creador_id`),
  KEY `viviendas_proyecto_id_index` (`proyecto_id`),
  CONSTRAINT `viviendas_beneficiario_id_foreign` FOREIGN KEY (`beneficiario_id`) REFERENCES `beneficiarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `viviendas_proyecto_id_foreign` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `viviendas_tipo_vivienda_id_foreign` FOREIGN KEY (`tipo_vivienda_id`) REFERENCES `tipos_vivienda` (`id`) ON DELETE SET NULL,
  CONSTRAINT `viviendas_usuario_creador_id_foreign` FOREIGN KEY (`usuario_creador_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `zonas_geograficas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zonas_geograficas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `departamento` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provincia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `municipio` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitud_centro` decimal(10,7) DEFAULT NULL,
  `longitud_centro` decimal(10,7) DEFAULT NULL,
  `radio_km` decimal(6,2) DEFAULT NULL,
  `codigo_postal` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('activa','inactiva') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activa',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (1,'0001_01_01_000000_create_users_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (2,'0001_01_01_000001_create_cache_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (3,'0001_01_01_000002_create_jobs_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (4,'0001_01_01_000003_create_sessions_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (5,'0001_01_01_000010_create_roles_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (6,'0001_01_01_000011_create_permisos_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (7,'0001_01_01_000012_create_rol_permiso_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (8,'0001_01_01_000013_create_sesiones_usuario_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (9,'0001_01_01_000020_create_dispositivos_confiables_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (10,'0001_01_01_000021_create_codigos_otp_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (11,'0001_01_01_000022_create_tokens_recuperacion_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (12,'0001_01_01_000023_create_intentos_acceso_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (13,'0001_01_01_000024_create_notificaciones_sistema_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (14,'0001_01_01_000025_create_personal_access_tokens_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (15,'0001_01_01_000026_add_fields_to_codigos_otp_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (16,'0001_01_01_000100_add_rol_fk_to_users',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (17,'0001_01_01_000200_create_competencias_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (18,'0001_01_01_000201_create_tipos_proyecto_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (19,'0001_01_01_000202_create_tipos_vivienda_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (20,'0001_01_01_000203_create_tipos_actividad_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (21,'0001_01_01_000204_create_categorias_material_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (22,'0001_01_01_000205_create_categorias_proveedor_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (23,'0001_01_01_000206_create_tipos_activo_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (24,'0001_01_01_000207_create_zonas_geograficas_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (25,'0001_01_01_000208_create_configuracion_sistema_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (26,'0001_01_01_000300_create_personal_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (27,'0001_01_01_000301_create_personal_competencia_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (28,'0001_01_01_000302_create_registros_asistencia_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (29,'0001_01_01_000303_create_planillas_pago_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (30,'0001_01_01_000304_create_detalles_planilla_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (31,'0001_01_01_000400_create_clientes_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (32,'0001_01_01_000401_create_entidades_estatales_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (33,'0001_01_01_000402_create_proyectos_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (34,'0001_01_01_000403_create_beneficiarios_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (35,'0001_01_01_000404_create_viviendas_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (36,'0001_01_01_000405_create_productos_contractuales_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (37,'0001_01_01_000406_create_plantillas_checklist_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (38,'0001_01_01_000408_add_contrato_fields_to_proyectos',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (39,'0001_01_01_000500_create_unidades_medida_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (40,'0001_01_01_000501_create_partidas_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (41,'0001_01_01_000502_create_unidades_funcionales_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (42,'0001_01_01_000600_create_contratos_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (43,'0001_01_01_000601_create_garantias_contrato_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (44,'0001_01_01_000602_create_adendas_contrato_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (45,'0001_01_01_000603_create_contrato_personal_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (46,'0001_01_01_000604_create_contrato_entidad_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (47,'0001_01_01_000700_create_fases_proyecto_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (48,'0001_01_01_000701_create_actividades_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (49,'0001_01_01_000701_create_items_checklist_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (50,'0001_01_01_000702_create_actividad_recurso_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (51,'0001_01_01_000703_create_hitos_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (52,'0001_01_01_000704_create_avances_actividad_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (53,'0001_01_01_000705_create_problemas_obra_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (54,'0001_01_01_000706_create_imagenes_avance_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (55,'0001_01_01_000800_create_almacenes_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (56,'0001_01_01_000801_create_materiales_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (57,'0001_01_01_000802_create_stock_material_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (58,'0001_01_01_000803_create_movimientos_inventario_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (59,'0001_01_01_000804_create_transferencias_inventario_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (60,'0001_01_01_000805_create_solicitudes_material_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (61,'0001_01_01_000806_create_detalles_solicitud_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (62,'0001_01_01_000900_create_proveedores_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (63,'0001_01_01_000901_create_ordenes_compra_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (64,'0001_01_01_000902_create_detalles_orden_compra_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (65,'0001_01_01_000903_create_recepciones_material_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (66,'0001_01_01_000904_create_detalles_recepcion_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (67,'0001_01_01_000905_create_facturas_proveedor_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (68,'0001_01_01_000906_create_pagos_proveedor_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (69,'0001_01_01_000907_create_cotizaciones_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (70,'0001_01_01_001000_create_maquinaria_equipo_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (71,'0001_01_01_001001_create_uso_maquinaria_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (72,'0001_01_01_001100_create_presupuestos_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (73,'0001_01_01_001101_create_items_presupuesto_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (74,'0001_01_01_001102_create_transacciones_financieras_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (75,'0001_01_01_001200_create_activos_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (76,'0001_01_01_001201_create_mantenimientos_activo_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (77,'0001_01_01_001202_create_depreciaciones_activo_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (78,'0001_01_01_001203_create_asignaciones_activo_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (79,'0001_01_01_001204_create_seguros_activo_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (80,'0001_01_01_001300_create_solicitudes_informacion_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (81,'0001_01_01_001301_create_documentos_publicos_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (82,'2026_05_21_134107_add_subfase_c_fields',1);
