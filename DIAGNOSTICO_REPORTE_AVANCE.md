# Diagnóstico: Reporte de Avance con Items Reales

## 1. Formulario de reporte
- **Archivo**: `resources/js/pages/admin/proyectos/DetalleProyecto.jsx`
- **Componente**: `ReporteTecnicoModal` (línea 701)
- **Cómo cargaba items**: Usaba `unidad.items_checklist` → datos de la tabla `items_checklist` (categorías genéricas)
- **Endpoint usado**: `POST /api/reportes-tecnicos` (servicio `ReporteTecnicoService`)

## 2. Selector de items (problema original)
- El campo `avances_items` enviaba pares `{itemChecklistId: porcentaje}`
- Los `ItemChecklist` son categorías genéricas hardcodeadas (9 × 11.11%)
- NO usaba `presupuesto_items_proyecto`

## 3. Estructura de tabla de reportes
- **Tabla existente**: `reportes_tecnicos` — reporte general por vivienda (sin FK a PIP)
- **Tabla creada**: `reportes_avance` — reporte específico por ítem de presupuesto

## 4. Botones de avance en checklist
- **Archivo**: `resources/js/pages/admin/proyectos/ChecklistVivienda.jsx`
- **Línea**: `BOTONES_RAPIDOS = [0, 25, 50, 75, 100]` — eliminados completamente
- **Reemplazados por**: Barras de progreso solo lectura + botón "Registrar avance" en cabecera
