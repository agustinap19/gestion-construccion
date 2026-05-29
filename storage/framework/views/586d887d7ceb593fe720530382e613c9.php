<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #333; margin: 0; padding: 0; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; padding-top: 10px; }
    .header h1 { margin: 0; font-size: 16px; color: #1e3a8a; }
    .header h2 { margin: 5px 0; font-size: 14px; color: #1e40af; }
    .header p { margin: 2px 0; font-size: 10px; color: #64748b; }
    h2 { font-size: 11px; color: #0f172a; margin: 14px 0 5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
    .kpi-row { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .kpi-row td { text-align: center; border: 1px solid #e2e8f0; padding: 10px; background: #f8fafc; width: 25%; }
    .kpi-val { font-size: 16px; font-weight: bold; color: #2563eb; display: block; margin-bottom: 2px; }
    .kpi-lbl { font-size: 9px; color: #64748b; text-transform: uppercase; }
    .foto-header { font-size: 9px; color: #475569; margin-bottom: 6px; padding: 5px 8px; background: #f8fafc; border-radius: 3px; border-left: 3px solid #0284c7; }
    .foto-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .foto-item { width: 160px; break-inside: avoid; }
    .foto-img { width: 160px; height: 120px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0; }
    .foto-caption { font-size: 8px; color: #64748b; margin-top: 2px; }
    .foto-geo { font-size: 7px; color: #94a3b8; }
    .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: bold; }
    .badge-ok   { background: #d1fae5; color: #065f46; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .no-data { font-size: 9px; color: #94a3b8; font-style: italic; }
    .footer { margin-top: 20px; font-size: 8px; color: #94a3b8; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    .page-break { page-break-after: always; }
</style>
</head>
<body>

    <div class="header">
        <h1>CA & KANAGF S.R.L.</h1>
        <h2>Reporte Fotográfico de Vivienda</h2>
        <p>Beneficiario: <?php echo e($vivienda->beneficiario ? $vivienda->beneficiario->nombre . ' ' . $vivienda->beneficiario->apellido_paterno : 'Sin Asignar'); ?> | Proyecto: <?php echo e($vivienda->proyecto?->codigo ?? '—'); ?> | Generado: <?php echo e(now()->format('d/m/Y H:i')); ?></p>
    </div>

    
    <table class="kpi-row">
        <tr>
            <td>
                <span class="kpi-val"><?php echo e($fotos->count()); ?></span>
                <span class="kpi-lbl">Total Fotos</span>
            </td>
            <td>
                <span class="kpi-val"><?php echo e($fotos->unique(fn($f) => $f->reporte_id)->count()); ?></span>
                <span class="kpi-lbl">Reportes</span>
            </td>
            <td>
                <span class="kpi-val"><?php echo e($fotos->unique(fn($f) => $f->reporte?->usuario_id)->count()); ?></span>
                <span class="kpi-lbl">Técnicos</span>
            </td>
            <td>
                <span class="kpi-val"><?php echo e($fotos->filter(fn($f) => $f->latitud)->count()); ?></span>
                <span class="kpi-lbl">Geo-etiquetadas</span>
            </td>
        </tr>
    </table>


<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px 12px;margin-bottom:14px;font-size:9px">
    <strong>Código Vivienda:</strong> <?php echo e($vivienda->codigo); ?>

    &mdash;
    <?php if($vivienda->beneficiario): ?>
        <strong>CI:</strong> <?php echo e($vivienda->beneficiario->ci); ?>

    <?php endif; ?>
    &mdash;
    <strong>Avance:</strong> <?php echo e(number_format($vivienda->porcentaje_avance, 1)); ?>%
    &mdash;
    <strong>Estado:</strong> <?php echo e(ucfirst(str_replace('_', ' ', $vivienda->estado))); ?>

</div>


<?php if($fotos->isEmpty()): ?>
    <p class="no-data">No hay fotos registradas para esta vivienda.</p>
<?php else: ?>
    <?php $porReporte = $fotos->groupBy('reporte_id'); ?>

    <?php $__currentLoopData = $porReporte; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $reporteId => $grupoFotos): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <?php $primerFoto = $grupoFotos->first(); $rep = $primerFoto->reporte; ?>
    <div class="foto-section">
        <div class="foto-header">
            <strong>Reporte #<?php echo e($reporteId); ?></strong>
            &mdash;
            <?php echo e($rep?->fecha_reporte ? \Carbon\Carbon::parse($rep->fecha_reporte)->format('d/m/Y') : '—'); ?>

            &mdash;
            Técnico: <?php echo e($rep?->usuario?->nombre ?? '—'); ?> <?php echo e($rep?->usuario?->apellido_paterno ?? ''); ?>

            &mdash;
            <?php echo e($grupoFotos->count()); ?> foto(s)
        </div>
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
            <?php $__currentLoopData = $grupoFotos; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $foto): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <?php
                    // Robust path resolution for DOMPDF
                    $parsedThumb = parse_url($foto->url_thumbnail ?? $foto->url_original, PHP_URL_PATH);
                    $relPath = preg_replace('#^/?storage/#', '', $parsedThumb);
                    $thumbPath = public_path('storage/' . ltrim($relPath, '/'));
                ?>
                <?php if($index > 0 && $index % 3 == 0): ?>
                    </tr><tr>
                <?php endif; ?>
                <td style="width: 33.33%; vertical-align: top; padding: 4px;">
                    <div class="foto-item" style="width: 100%;">
                        <?php if(file_exists($thumbPath)): ?>
                            <img src="<?php echo e($thumbPath); ?>" alt="Foto" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0;">
                        <?php else: ?>
                            <div style="width: 100%; height: 140px; background: #f1f5f9; border-radius: 4px; border: 1px solid #e2e8f0; display: table;">
                                <div style="display: table-cell; vertical-align: middle; text-align: center; font-size: 8px; color: #94a3b8;">Sin imagen</div>
                            </div>
                        <?php endif; ?>
                        <?php if($foto->caption): ?>
                            <div class="foto-caption" style="margin-top: 4px; font-size: 8px; color: #64748b; line-height: 1.2;"><?php echo e($foto->caption); ?></div>
                        <?php endif; ?>
                        <?php if($foto->latitud && $foto->longitud): ?>
                            <div class="foto-geo" style="margin-top: 2px; font-size: 7px; color: #94a3b8;">📍 <?php echo e(number_format($foto->latitud,5)); ?>, <?php echo e(number_format($foto->longitud,5)); ?></div>
                        <?php endif; ?>
                    </div>
                </td>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            <?php
                $resto = $grupoFotos->count() % 3;
                if($resto > 0) {
                    for($i = 0; $i < (3 - $resto); $i++) {
                        echo '<td style="width: 33.33%; padding: 4px;"></td>';
                    }
                }
            ?>
            </tr>
        </table>
    </div>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
<?php endif; ?>

<div class="footer">CA &amp; KANAGF S.R.L. &mdash; Sistema ERP &mdash; Reporte Fotográfico &mdash; <?php echo e(now()->format('d/m/Y H:i')); ?></div>
</body>
</html>
<?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/exports/reporte_fotografico.blade.php ENDPATH**/ ?>