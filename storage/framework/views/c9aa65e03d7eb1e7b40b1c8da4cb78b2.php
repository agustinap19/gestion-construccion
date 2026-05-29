<?php $__env->startSection('title', 'Balance Consolidado del Proyecto'); ?>

<?php $__env->startSection('content'); ?>
    <h2 style="text-align: center; margin-bottom: 20px;">
        BALANCE CONSOLIDADO DE MATERIALES<br>
        <span style="font-size: 14px; font-weight: normal; color: #475569;">Proyecto: <?php echo e($proyecto->nombre); ?></span>
    </h2>

    <div style="display: table; width: 100%; margin-bottom: 20px;">
        <div style="display: table-cell; width: 33%; padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Presupuestado vs Comprado</div>
            <div style="font-size: 14px; font-weight: bold; margin-top: 5px;">Bs. <?php echo e(number_format($stats['total_comprado'], 2)); ?> / Bs. <?php echo e(number_format($stats['total_presupuestado'], 2)); ?></div>
        </div>
        <div style="display: table-cell; width: 33%; padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Total Entregado a Obra</div>
            <div style="font-size: 14px; font-weight: bold; margin-top: 5px;">Bs. <?php echo e(number_format($stats['total_entregado'], 2)); ?></div>
        </div>
        <div style="display: table-cell; width: 33%; padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Indicadores de Salud</div>
            <div style="font-size: 11px; margin-top: 5px;">
                <span style="color: #ef4444; font-weight: bold;">● <?php echo e($stats['sobre_consumos']); ?></span> Sobre-consumos<br>
                <span style="color: #f59e0b; font-weight: bold;">● <?php echo e($stats['sub_consumos']); ?></span> Sub-consumos
            </div>
        </div>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th style="width: 10%;">Código</th>
                <th style="width: 30%;">Material</th>
                <th class="text-right">Planificado</th>
                <th class="text-right">Comprado</th>
                <th class="text-right">En Almacén</th>
                <th class="text-right">Devuelto Central</th>
                <th class="text-right">Entregado Obra</th>
                <th class="text-right">Saldo Operativo</th>
            </tr>
        </thead>
        <tbody>
            <?php $__empty_1 = true; $__currentLoopData = $materiales; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $mat): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                <?php
                    $bgColor = '';
                    if ($mat['estado_salud'] === 'sobre_consumo') $bgColor = '#fef2f2'; // Rojo claro
                    if ($mat['estado_salud'] === 'sub_consumo') $bgColor = '#fffbeb'; // Amarillo claro
                ?>
                <tr style="background-color: <?php echo e($bgColor); ?>;">
                    <td><?php echo e($mat['codigo']); ?></td>
                    <td>
                        <?php echo e($mat['nombre']); ?>

                        <?php if(!$mat['identidad_ok']): ?>
                            <span style="color: #ef4444; font-weight: bold; font-size: 10px; margin-left: 5px;">(⚠ Desfase: <?php echo e($mat['desfase']); ?>)</span>
                        <?php endif; ?>
                    </td>
                    <td class="text-right"><?php echo e(number_format($mat['planificado'], 2)); ?></td>
                    <td class="text-right"><?php echo e(number_format($mat['comprado'], 2)); ?></td>
                    <td class="text-right"><?php echo e(number_format($mat['en_almacen'], 2)); ?></td>
                    <td class="text-right"><?php echo e(number_format($mat['devuelto'], 2)); ?></td>
                    <td class="text-right"><?php echo e(number_format($mat['entregado'], 2)); ?></td>
                    <td class="text-right font-bold"><?php echo e(number_format($mat['saldo'], 2)); ?></td>
                </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                <tr>
                    <td colspan="8" class="text-center" style="padding: 20px;">No hay datos en el presupuesto de materiales para los filtros aplicados.</td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>

    <table class="signatures">
        <tr>
            <td>
                <div class="signature-line"></div>
                <strong>Residente de Obra</strong><br>
                Firma y Sello
            </td>
            <td>
                <div class="signature-line"></div>
                <strong>Gerencia Técnica</strong><br>
                Aprobación Final
            </td>
        </tr>
    </table>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('reportes.layouts.oficial', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/reportes/proyectos/balance-consolidado.blade.php ENDPATH**/ ?>