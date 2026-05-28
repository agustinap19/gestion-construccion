<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8">
<?php echo $__env->make('exports._base_styles', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
</head>
<body>
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Lista de Usuarios</div>
        <div class="reporte-sub">Usuarios registrados en el sistema</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado el <?php echo e(now()->format('d/m/Y H:i')); ?></div>
        <div class="reporte-sub">Por: <?php echo e($usuario); ?></div>
    </div>
</div>

<div class="kpi-row">
    <div class="kpi-cell">
        <div class="kpi-val"><?php echo e($usuarios->count()); ?></div>
        <div class="kpi-label">Total Usuarios</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val"><?php echo e($usuarios->where('estado','activo')->count()); ?></div>
        <div class="kpi-label">Activos</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val"><?php echo e($usuarios->where('es_admin_central',true)->count()); ?></div>
        <div class="kpi-label">Admins</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val"><?php echo e($usuarios->whereNotNull('tiene_2fa')->where('tiene_2fa',true)->count()); ?></div>
        <div class="kpi-label">Con 2FA</div>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th>Nombre Completo</th>
            <th>C.I.</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th style="text-align:center">2FA</th>
            <th style="text-align:center">Admin</th>
            <th>Registro</th>
        </tr>
    </thead>
    <tbody>
        <?php $__currentLoopData = $usuarios; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $u): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <?php $badge = $u->estado === 'activo' ? 'badge-ok' : ($u->estado === 'suspendido' ? 'badge-warn' : 'badge-gray'); ?>
        <tr>
            <td><strong><?php echo e($u->nombre); ?> <?php echo e($u->apellido_paterno); ?></strong></td>
            <td><?php echo e($u->ci); ?></td>
            <td style="font-size:9.5px"><?php echo e($u->email); ?></td>
            <td><?php echo e($u->rol?->nombre_visible ?? '—'); ?></td>
            <td><span class="badge <?php echo e($badge); ?>"><?php echo e(ucfirst($u->estado)); ?></span></td>
            <td style="text-align:center"><?php echo e($u->tiene_2fa ? '✓' : '—'); ?></td>
            <td style="text-align:center"><?php echo e($u->es_admin_central ? '✓' : '—'); ?></td>
            <td style="font-size:9.5px"><?php echo e(\Carbon\Carbon::parse($u->created_at)->format('d/m/Y')); ?></td>
        </tr>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </tbody>
</table>

<div class="footer">
    <div class="footer-left">CA &amp; KANAGF S.R.L. — Sistema ERP Construcción</div>
    <div class="footer-right">Total: <?php echo e($usuarios->count()); ?> usuarios</div>
</div>
</body>
</html>
<?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/exports/lista_usuarios.blade.php ENDPATH**/ ?>