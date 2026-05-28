<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8">
<?php echo $__env->make('exports._base_styles', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
</head>
<body>
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Lista de Proyectos</div>
        <div class="reporte-sub"><?php echo e($subtitulo ?? 'Listado completo'); ?></div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado el <?php echo e(now()->format('d/m/Y H:i')); ?></div>
        <div class="reporte-sub">Por: <?php echo e($usuario); ?></div>
    </div>
</div>

<div class="kpi-row">
    <div class="kpi-cell">
        <div class="kpi-val"><?php echo e($proyectos->count()); ?></div>
        <div class="kpi-label">Total Proyectos</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val"><?php echo e($proyectos->where('estado', 'en_ejecucion')->count()); ?></div>
        <div class="kpi-label">En Ejecución</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val"><?php echo e($proyectos->where('categoria', 'social')->count()); ?></div>
        <div class="kpi-label">Sociales</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">Bs. <?php echo e(number_format($proyectos->sum('presupuesto_referencial'), 0, '.', ',')); ?></div>
        <div class="kpi-label">Presupuesto Total</div>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th>Código</th>
            <th>Nombre del Proyecto</th>
            <th>Categoría</th>
            <th>Estado</th>
            <th>Responsable</th>
            <th>Presupuesto (Bs.)</th>
            <th style="text-align:center">Avance</th>
            <th>Fin Planificado</th>
        </tr>
    </thead>
    <tbody>
        <?php $__currentLoopData = $proyectos; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $p): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <?php
            $avance = floatval($p->avance_fisico ?? 0);
            $badgeColor = 'badge-gray';
            if ($p->estado === 'en_ejecucion') $badgeColor = 'badge-ok';
            elseif ($p->estado === 'finalizado') $badgeColor = 'badge-blue';
            elseif ($p->estado === 'cancelado') $badgeColor = 'badge-danger';
            elseif (in_array($p->estado, ['formulacion','licitacion'])) $badgeColor = 'badge-purple';
            $contraparte = $p->categoria === 'social'
                ? ($p->entidadEstatal->nombre ?? '—')
                : ($p->cliente->nombre_completo ?? $p->cliente->nombre_visible ?? '—');
        ?>
        <tr>
            <td><strong><?php echo e($p->codigo); ?></strong></td>
            <td><?php echo e($p->nombre); ?></td>
            <td><?php echo e(ucfirst($p->categoria)); ?></td>
            <td><span class="badge <?php echo e($badgeColor); ?>"><?php echo e(ucfirst(str_replace('_', ' ', $p->estado))); ?></span></td>
            <td><?php echo e($p->responsable ? $p->responsable->nombre . ' ' . $p->responsable->apellido_paterno : '—'); ?></td>
            <td style="text-align:right"><?php echo e($p->presupuesto_referencial ? number_format($p->presupuesto_referencial, 0, '.', ',') : '—'); ?></td>
            <td style="text-align:center; min-width:70px">
                <div class="prog-wrap"><div class="prog-fill" style="width:<?php echo e(min(100, $avance)); ?>%"></div></div>
                <span style="font-size:9px;color:#475569"><?php echo e(number_format($avance, 1)); ?>%</span>
            </td>
            <td><?php echo e($p->fecha_fin_planificada ? \Carbon\Carbon::parse($p->fecha_fin_planificada)->format('d/m/Y') : '—'); ?></td>
        </tr>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </tbody>
</table>

<div class="footer">
    <div class="footer-left">CA &amp; KANAGF S.R.L. — Sistema ERP Construcción</div>
    <div class="footer-right">Total: <?php echo e($proyectos->count()); ?> proyectos</div>
</div>
</body>
</html>
<?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/exports/lista_proyectos.blade.php ENDPATH**/ ?>