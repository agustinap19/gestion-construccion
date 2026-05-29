<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title><?php echo e($proyecto->nombre); ?> - Beneficiarios</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #333; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 16px; color: #1e3a8a; }
        .header h2 { margin: 5px 0; font-size: 14px; color: #1e40af; }
        .header p { margin: 2px 0; font-size: 10px; color: #64748b; }
        .info-section { margin-bottom: 15px; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .info-table th { text-align: left; background-color: #f8fafc; padding: 5px; border: 1px solid #e2e8f0; font-size: 10px; width: 15%; }
        .info-table td { padding: 5px; border: 1px solid #e2e8f0; font-size: 10px; }
        .kpi-row { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .kpi-row td { text-align: center; border: 1px solid #e2e8f0; padding: 10px; background: #f8fafc; width: 25%; }
        .kpi-val { font-size: 16px; font-weight: bold; color: #2563eb; display: block; margin-bottom: 2px; }
        .kpi-lbl { font-size: 9px; color: #64748b; text-transform: uppercase; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.data-table th, table.data-table td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; font-size: 9px; }
        table.data-table th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; text-transform: uppercase; }
        table.data-table tbody tr:nth-child(even) { background-color: #f8fafc; }
        .footer { position: fixed; bottom: -20px; left: 0; right: 0; text-align: center; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 5px; }
        .page-number:after { content: counter(page); }
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 8px; font-weight: bold; }
        .aceptado { background: #dbeafe; color: #1d4ed8; }
        .en_construccion { background: #fef3c7; color: #92400e; }
        .vivienda_entregada { background: #d1fae5; color: #065f46; }
        .candidato { background: #f1f5f9; color: #475569; }
        .retirado { background: #fed7aa; color: #9a3412; }
        .rechazado { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CA & KANAGF S.R.L.</h1>
        <h2><?php echo e($proyecto->nombre); ?> — Beneficiarios</h2>
        <p>Código de Proyecto: <?php echo e($proyecto->codigo); ?> | Generado: <?php echo e(now()->format('d/m/Y H:i')); ?> | Por: <?php echo e($usuario ?? 'Sistema'); ?></p>
    </div>

    <table class="kpi-row">
        <tr>
            <td>
                <span class="kpi-val"><?php echo e($stats['total']); ?></span>
                <span class="kpi-lbl">Total Beneficiarios</span>
            </td>
            <td>
                <span class="kpi-val"><?php echo e($stats['por_estado']['aceptado'] ?? 0); ?></span>
                <span class="kpi-lbl">Aceptados</span>
            </td>
            <td>
                <span class="kpi-val"><?php echo e($stats['por_estado']['en_construccion'] ?? 0); ?></span>
                <span class="kpi-lbl">En Construcción</span>
            </td>
            <td>
                <span class="kpi-val"><?php echo e($stats['por_estado']['vivienda_entregada'] ?? 0); ?></span>
                <span class="kpi-lbl">Entregadas</span>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th width="12%">Código</th>
                <th width="22%">Nombre Completo</th>
                <th width="10%">CI</th>
                <th width="15%">Comunidad</th>
                <th width="16%">Tipología</th>
                <th width="15%">Vivienda</th>
                <th width="10%" class="text-center">Estado</th>
            </tr>
        </thead>
        <tbody>
            <?php $__currentLoopData = $beneficiarios; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $b): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <tr>
                <td><strong><?php echo e($b->codigo_beneficiario); ?></strong></td>
                <td><?php echo e($b->nombre); ?> <?php echo e($b->apellido_paterno); ?><?php echo e($b->apellido_materno ? ' '.$b->apellido_materno : ''); ?></td>
                <td><?php echo e($b->ci); ?><?php echo e($b->ci_complemento ? '-'.$b->ci_complemento : ''); ?></td>
                <td><?php echo e($b->comunidad ?? '—'); ?></td>
                <td><?php echo e($b->tipoVivienda?->nombre ?? '—'); ?></td>
                <td><?php echo e($b->vivienda?->codigo ?? '—'); ?></td>
                <td class="text-center">
                    <span class="badge <?php echo e($b->estado_seleccion); ?>"><?php echo e(ucfirst(str_replace('_', ' ', $b->estado_seleccion))); ?></span>
                </td>
            </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            <?php if(count($beneficiarios) === 0): ?>
            <tr>
                <td colspan="7" class="text-center">No se encontraron beneficiarios con los filtros aplicados.</td>
            </tr>
            <?php endif; ?>
        </tbody>
    </table>

    <div class="footer">
        CA & KANAGF S.R.L. - Sistema ERP Integrado | Página <span class="page-number"></span>
    </div>
</body>
</html>
<?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/exports/lista_beneficiarios.blade.php ENDPATH**/ ?>