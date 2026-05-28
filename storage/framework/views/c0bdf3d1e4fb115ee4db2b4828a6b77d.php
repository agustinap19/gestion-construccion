<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8">
<?php echo $__env->make('exports._base_styles', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
<style>
    .acta-titulo { font-size: 16px; font-weight: bold; text-align: center; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.1em; margin: 10px 0; }
    .acta-sub    { font-size: 10px; text-align: center; color: #64748b; margin-bottom: 14px; }
    .check-grid  { display: table; width: 100%; }
    .check-col   { display: table-cell; width: 50%; vertical-align: top; padding-right: 10px; }
    .check-row   { display: table; width: 100%; border-bottom: 1px solid #f1f5f9; padding: 4px 0; }
    .check-lbl   { display: table-cell; font-size: 10px; color: #475569; }
    .check-box   { display: table-cell; width: 18px; text-align: center; }
    .firma-line  { border-top: 1px solid #1e293b; margin-top: 48px; padding-top: 4px; font-size: 9px; color: #475569; }
    .nro-acta    { font-size: 11px; text-align: right; color: #64748b; font-weight: bold; }
</style>
</head>
<body>
<div style="display:table; width:100%; margin-bottom:8px;">
    <div style="display:table-cell; vertical-align:middle;">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
    </div>
    <div style="display:table-cell; text-align:right; vertical-align:middle;">
        <div class="nro-acta">Acta N° <?php echo e(str_pad($acta_numero ?? $vivienda->id, 4, '0', STR_PAD_LEFT)); ?></div>
        <div style="font-size:9px; color:#94a3b8">Fecha: <?php echo e(now()->format('d/m/Y')); ?></div>
    </div>
</div>
<hr style="border:none; border-top:3px solid #1e3a5f; margin-bottom:10px;">

<div class="acta-titulo">Acta de Entrega Individual de Vivienda</div>
<div class="acta-sub">Proyecto: <?php echo e($proyecto->codigo); ?> — <?php echo e($proyecto->nombre); ?></div>

<div class="section-title">Datos del Beneficiario</div>
<div class="info-grid">
    <div class="info-cell">
        <div class="info-row"><div class="info-label">Nombre Completo</div><div class="info-value"><?php echo e($beneficiario->nombre); ?> <?php echo e($beneficiario->apellido_paterno); ?> <?php echo e($beneficiario->apellido_materno ?? ''); ?></div></div>
        <div class="info-row"><div class="info-label">Cédula de Identidad</div><div class="info-value"><?php echo e($beneficiario->ci); ?><?php echo e($beneficiario->ci_complemento ? '-'.$beneficiario->ci_complemento : ''); ?></div></div>
        <div class="info-row"><div class="info-label">Comunidad</div><div class="info-value"><?php echo e($beneficiario->comunidad ?? '—'); ?></div></div>
    </div>
    <div class="info-cell">
        <div class="info-row"><div class="info-label">Tipología</div><div class="info-value"><?php echo e($beneficiario->tipoVivienda->nombre ?? '—'); ?></div></div>
        <div class="info-row"><div class="info-label">Dirección del Terreno</div><div class="info-value"><?php echo e($beneficiario->direccion_terreno ?? '—'); ?></div></div>
        <div class="info-row"><div class="info-label">Teléfono</div><div class="info-value"><?php echo e($beneficiario->telefono_principal ?? '—'); ?></div></div>
    </div>
</div>

<div class="section-title">Datos de la Vivienda Entregada</div>
<div class="info-grid">
    <div class="info-cell">
        <div class="info-row"><div class="info-label">Código de Vivienda</div><div class="info-value"><?php echo e($vivienda->codigo); ?></div></div>
        <div class="info-row"><div class="info-label">Estado Final</div><div class="info-value"><?php echo e(ucfirst(str_replace('_', ' ', $vivienda->estado))); ?></div></div>
    </div>
    <div class="info-cell">
        <div class="info-row"><div class="info-label">Avance Final</div><div class="info-value"><?php echo e(number_format($vivienda->porcentaje_avance ?? 0, 1)); ?>%</div></div>
        <div class="info-row"><div class="info-label">Fecha de Entrega</div><div class="info-value"><?php echo e(now()->format('d \d\e F \d\e Y')); ?></div></div>
    </div>
</div>

<?php if(isset($items) && $items->count() > 0): ?>
<div class="section-title">Checklist de Recepción</div>
<div class="check-grid">
    <?php $chunks = $items->chunk(ceil($items->count()/2)); ?>
    <?php $__currentLoopData = $chunks; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $col): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <div class="check-col">
        <?php $__currentLoopData = $col; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <div class="check-row">
            <div class="check-lbl"><?php echo e($item->nombre); ?></div>
            <div class="check-box">
                <?php if($item->estado === 'completado'): ?>
                    <span style="color:#059669; font-weight:bold">✓</span>
                <?php else: ?>
                    <span style="color:#e2e8f0">□</span>
                <?php endif; ?>
            </div>
        </div>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </div>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
</div>
<?php endif; ?>

<p style="font-size:10px; color:#475569; margin-top:12px; border:1px solid #e2e8f0; padding:8px; border-radius:4px; background:#f8fafc;">
    En la fecha indicada, el beneficiario recibe a plena conformidad la vivienda descrita en el presente documento, comprometiéndose
    a conservarla y darle uso habitacional. CA &amp; KANAGF S.R.L. certifica la terminación de la construcción conforme a las
    especificaciones técnicas del proyecto.
</p>

<div style="display:table; width:100%; margin-top:24px;">
    <div style="display:table-cell; width:45%; padding-right:20px;">
        <div class="firma-line">Firma del Beneficiario</div>
        <p style="font-size:9px; color:#94a3b8;"><?php echo e($beneficiario->nombre); ?> <?php echo e($beneficiario->apellido_paterno); ?><br>C.I.: <?php echo e($beneficiario->ci); ?></p>
    </div>
    <div style="display:table-cell; width:10%;"></div>
    <div style="display:table-cell; width:45%;">
        <div class="firma-line">Representante Legal — CA &amp; KANAGF S.R.L.</div>
        <p style="font-size:9px; color:#94a3b8;">Nombre y Sello</p>
    </div>
</div>

<div class="footer">
    <div class="footer-left">CA &amp; KANAGF S.R.L. — <?php echo e($proyecto->codigo); ?> — Documento oficial</div>
    <div class="footer-right">Generado por: <?php echo e($usuario); ?> el <?php echo e(now()->format('d/m/Y H:i')); ?></div>
</div>
</body>
</html>
<?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/exports/acta_entrega_vivienda.blade.php ENDPATH**/ ?>