<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 18px; }
    h1 { font-size: 15px; color: #0f172a; margin-bottom: 2px; }
    h2 { font-size: 12px; color: #0f172a; margin: 16px 0 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
    .subtitle { font-size: 9px; color: #64748b; margin-bottom: 14px; }
    .kpi-row { display: flex; gap: 10px; margin-bottom: 14px; }
    .kpi { padding: 6px 14px; background: #f8fafc; border-radius: 4px; text-align: center; border: 1px solid #e2e8f0; }
    .kpi-val { font-size: 18px; font-weight: bold; color: #059669; }
    .kpi-lbl { font-size: 8px; color: #94a3b8; text-transform: uppercase; }
    .info-grid { display: flex; gap: 16px; margin-bottom: 14px; }
    .info-block { flex: 1; background: #f8fafc; border-radius: 4px; padding: 8px 12px; border: 1px solid #e2e8f0; }
    .info-row { margin-bottom: 3px; }
    .info-lbl { font-size: 8px; color: #94a3b8; text-transform: uppercase; }
    .info-val { font-size: 10px; color: #1e293b; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; padding: 5px 7px; text-align: left; font-size: 8px; text-transform: uppercase; color: #475569; }
    td { padding: 4px 7px; border-bottom: 1px solid #f1f5f9; font-size: 9px; vertical-align: middle; }
    .prog-wrap { background: #e2e8f0; border-radius: 3px; height: 7px; width: 80px; display: inline-block; vertical-align: middle; }
    .prog-fill { border-radius: 3px; height: 7px; }
    .prog-green  { background: #059669; }
    .prog-yellow { background: #d97706; }
    .prog-gray   { background: #94a3b8; }
    .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: bold; }
    .badge-completado { background: #d1fae5; color: #065f46; }
    .badge-en_proceso { background: #fef3c7; color: #92400e; }
    .badge-pendiente  { background: #f1f5f9; color: #475569; }
    .badge-baja   { background: #d1fae5; color: #065f46; }
    .badge-media  { background: #fef3c7; color: #92400e; }
    .badge-alta   { background: #fed7aa; color: #9a3412; }
    .badge-critica { background: #fee2e2; color: #991b1b; }
    .reporte-card { border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 10px; margin-bottom: 8px; }
    .reporte-header { font-size: 9px; color: #64748b; margin-bottom: 4px; }
    .reporte-desc { font-size: 9px; color: #1e293b; margin-bottom: 4px; }
    .foto-grid { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .foto-img { width: 60px; height: 60px; object-fit: cover; border-radius: 3px; }
    .footer { margin-top: 20px; font-size: 8px; color: #94a3b8; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    .alerta { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 3px; padding: 3px 7px; font-size: 8px; color: #9a3412; display: inline-block; margin-bottom: 4px; }
    .no-data { font-size: 9px; color: #94a3b8; font-style: italic; }
</style>
</head>
<body>

<h1>Reporte de Avance Individual — <?php echo e($vivienda->beneficiario ? $vivienda->beneficiario->nombre . ' ' . $vivienda->beneficiario->apellido_paterno : 'Sin Asignar'); ?></h1>
<div class="subtitle">
    Proyecto: <?php echo e($vivienda->proyecto?->nombre ?? '—'); ?> (<?php echo e($vivienda->proyecto?->codigo ?? '—'); ?>)
    &mdash; Generado: <?php echo e(now()->format('d/m/Y H:i')); ?>

</div>


<div class="kpi-row">
    <div class="kpi">
        <div class="kpi-val"><?php echo e(number_format($vivienda->porcentaje_avance, 1)); ?>%</div>
        <div class="kpi-lbl">Avance Físico</div>
    </div>
    <div class="kpi">
        <div class="kpi-val"><?php echo e($vivienda->itemsChecklist->where('estado','completado')->count()); ?>/<?php echo e($vivienda->itemsChecklist->count()); ?></div>
        <div class="kpi-lbl">Items Completados</div>
    </div>
    <div class="kpi">
        <div class="kpi-val"><?php echo e($reportes->count()); ?></div>
        <div class="kpi-lbl">Últimos Reportes</div>
    </div>
    <div class="kpi">
        <div class="kpi-val"><?php echo e(ucfirst(str_replace('_', ' ', $vivienda->estado))); ?></div>
        <div class="kpi-lbl">Estado</div>
    </div>
</div>


<div class="info-grid">
    <div class="info-block">
        <div class="info-row"><span class="info-lbl">Tipología</span><br><span class="info-val"><?php echo e($vivienda->tipoVivienda?->nombre ?? '—'); ?></span></div>
        <div class="info-row"><span class="info-lbl">Código Vivienda</span><br><span class="info-val"><?php echo e($vivienda->codigo); ?></span></div>
    </div>
    <div class="info-block">
        <div class="info-row"><span class="info-lbl">CI Beneficiario</span><br><span class="info-val"><?php echo e($vivienda->beneficiario?->ci ?? '—'); ?></span></div>
        <div class="info-row"><span class="info-lbl">Comunidad</span><br><span class="info-val"><?php echo e($vivienda->beneficiario?->comunidad ?? '—'); ?></span></div>
    </div>
</div>


<h2>Checklist de Avance</h2>
<?php if($vivienda->itemsChecklist->isEmpty()): ?>
    <p class="no-data">No hay items de checklist registrados para esta vivienda.</p>
<?php else: ?>
<table>
    <thead>
        <tr>
            <th>#</th>
            <th>Item</th>
            <th>Ponderación</th>
            <th style="width:120px">Avance</th>
            <th>Estado</th>
            <th>Completado</th>
        </tr>
    </thead>
    <tbody>
        <?php $__currentLoopData = $vivienda->itemsChecklist; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <?php
            $pct = (float)($item->porcentaje_avance ?? 0);
            $colorClass = $pct >= 100 ? 'prog-green' : ($pct > 0 ? 'prog-yellow' : 'prog-gray');
        ?>
        <tr>
            <td><?php echo e($item->orden); ?></td>
            <td><?php echo e($item->nombre); ?></td>
            <td><?php echo e(number_format($item->ponderacion, 1)); ?>%</td>
            <td>
                <div class="prog-wrap">
                    <div class="prog-fill <?php echo e($colorClass); ?>" style="width: <?php echo e(min(100,$pct)); ?>%"></div>
                </div>
                <span style="font-size:8px;color:#64748b;margin-left:4px"><?php echo e(number_format($pct,1)); ?>%</span>
            </td>
            <td><span class="badge badge-<?php echo e($item->estado); ?>"><?php echo e(ucfirst(str_replace('_',' ',$item->estado))); ?></span></td>
            <td><?php echo e($item->fecha_completado ? $item->fecha_completado->format('d/m/Y') : '—'); ?></td>
        </tr>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </tbody>
</table>
<?php endif; ?>


<h2>Últimos <?php echo e($reportes->count()); ?> Reportes Técnicos</h2>
<?php if($reportes->isEmpty()): ?>
    <p class="no-data">No hay reportes registrados.</p>
<?php else: ?>
    <?php $__currentLoopData = $reportes; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $rep): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <div class="reporte-card">
        <div class="reporte-header">
            <strong><?php echo e($rep->fecha_reporte ? \Carbon\Carbon::parse($rep->fecha_reporte)->format('d/m/Y') : '—'); ?></strong>
            &mdash; Técnico: <?php echo e($rep->usuario?->nombre ?? '—'); ?> <?php echo e($rep->usuario?->apellido_paterno ?? ''); ?>

            &mdash; Estado: <span class="badge badge-<?php echo e($rep->estado === 'aprobado' ? 'completado' : 'en_proceso'); ?>"><?php echo e(ucfirst($rep->estado)); ?></span>
            <?php if($rep->alerta_distancia): ?>
                <span class="alerta">⚠ Fuera de rango (<?php echo e(number_format($rep->distancia_vivienda_metros,0)); ?> m)</span>
            <?php endif; ?>
        </div>

        <?php if($rep->descripcion): ?>
            <div class="reporte-desc"><?php echo e($rep->descripcion); ?></div>
        <?php endif; ?>

        <?php if($rep->observaciones): ?>
            <div class="reporte-desc" style="color:#64748b"><em>Obs: <?php echo e($rep->observaciones); ?></em></div>
        <?php endif; ?>

        <?php if($rep->incidencias->isNotEmpty()): ?>
        <div style="margin-top:4px">
            <?php $__currentLoopData = $rep->incidencias; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $inc): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <span class="badge badge-<?php echo e($inc->gravedad); ?>"><?php echo e(ucfirst($inc->tipo)); ?>: <?php echo e(Str::limit($inc->descripcion, 60)); ?></span>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </div>
        <?php endif; ?>

        <?php if($rep->fotos->isNotEmpty()): ?>
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 6px;">
            <tr>
            <?php $__currentLoopData = $rep->fotos->take(6); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $foto): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <?php
                    $parsedThumb = parse_url($foto->url_thumbnail ?? $foto->url_original, PHP_URL_PATH);
                    $relPath = preg_replace('#^/?storage/#', '', $parsedThumb);
                    $path = public_path('storage/' . ltrim($relPath, '/'));
                ?>
                <?php if($index > 0 && $index % 3 == 0): ?>
                    </tr><tr>
                <?php endif; ?>
                <td style="width: 33.33%; padding: 4px; vertical-align: top;">
                    <?php if(file_exists($path)): ?>
                        <img src="<?php echo e($path); ?>" alt="Foto" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0;">
                    <?php else: ?>
                        <div style="width: 100%; height: 100px; background: #f1f5f9; border-radius: 4px; border: 1px solid #e2e8f0; display: table;">
                            <div style="display: table-cell; vertical-align: middle; text-align: center; font-size: 8px; color: #94a3b8;">N/A</div>
                        </div>
                    <?php endif; ?>
                </td>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            <?php
                $count = min(6, $rep->fotos->count());
                $resto = $count % 3;
                if($resto > 0) {
                    for($i = 0; $i < (3 - $resto); $i++) {
                        echo '<td style="width: 33.33%; padding: 4px;"></td>';
                    }
                }
            ?>
            </tr>
        </table>
        <?php endif; ?>
    </div>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
<?php endif; ?>

<div class="footer">CA &amp; KANAGF S.R.L. &mdash; Sistema ERP &mdash; <?php echo e(now()->format('d/m/Y H:i')); ?></div>
</body>
</html>
<?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/exports/avance_individual.blade.php ENDPATH**/ ?>