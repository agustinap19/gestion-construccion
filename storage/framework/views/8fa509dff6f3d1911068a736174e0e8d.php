<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8">
<?php echo $__env->make('exports._base_styles', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
</head>
<body>
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Lista de Personal</div>
        <div class="reporte-sub">Nómina de empleados registrados</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado el <?php echo e(now()->format('d/m/Y H:i')); ?></div>
        <div class="reporte-sub">Por: <?php echo e($usuario); ?></div>
    </div>
</div>

<div class="kpi-row">
    <div class="kpi-cell">
        <div class="kpi-val"><?php echo e($personal->count()); ?></div>
        <div class="kpi-label">Total Empleados</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val"><?php echo e($personal->where('estado_laboral','activo')->count()); ?></div>
        <div class="kpi-label">Activos</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">Bs. <?php echo e(number_format($personal->avg('salario_base') ?? 0, 0)); ?></div>
        <div class="kpi-label">Salario Promedio</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val"><?php echo e($personal->whereNotNull('usuario_id')->count()); ?></div>
        <div class="kpi-label">Con Usuario</div>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th>Código</th>
            <th>Apellidos y Nombre</th>
            <th>C.I.</th>
            <th>Tipo</th>
            <th>Especialidad</th>
            <th>Estado</th>
            <th style="text-align:right">Salario (Bs.)</th>
            <th>Contratación</th>
        </tr>
    </thead>
    <tbody>
        <?php $__currentLoopData = $personal; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $p): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <?php
            $badge = $p->estado_laboral === 'activo' ? 'badge-ok' : ($p->estado_laboral === 'vacaciones' ? 'badge-warn' : 'badge-gray');
        ?>
        <tr>
            <td><strong><?php echo e($p->codigo_empleado); ?></strong></td>
            <td><?php echo e($p->apellido_paterno); ?> <?php echo e($p->apellido_materno ?? ''); ?>, <?php echo e($p->nombre); ?></td>
            <td><?php echo e($p->ci); ?><?php echo e($p->ci_complemento ? '-'.$p->ci_complemento : ''); ?></td>
            <td><?php echo e(ucfirst($p->tipo ?? '—')); ?></td>
            <td><?php echo e($p->especialidad ?? '—'); ?></td>
            <td><span class="badge <?php echo e($badge); ?>"><?php echo e(ucfirst($p->estado_laboral)); ?></span></td>
            <td style="text-align:right"><?php echo e(number_format($p->salario_base ?? 0, 2)); ?></td>
            <td><?php echo e($p->fecha_contratacion ? \Carbon\Carbon::parse($p->fecha_contratacion)->format('d/m/Y') : '—'); ?></td>
        </tr>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </tbody>
</table>

<div class="footer">
    <div class="footer-left">CA &amp; KANAGF S.R.L. — Sistema ERP Construcción</div>
    <div class="footer-right">Total: <?php echo e($personal->count()); ?> empleados</div>
</div>
</body>
</html>
<?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/exports/lista_personal.blade.php ENDPATH**/ ?>