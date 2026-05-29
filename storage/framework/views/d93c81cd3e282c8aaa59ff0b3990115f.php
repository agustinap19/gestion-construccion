<?php $__env->startSection('title', 'Planilla de Entregas por Beneficiario'); ?>

<?php $__env->startSection('content'); ?>
    <h2 style="text-align: center; margin-bottom: 20px;">
        PLANILLA DE ENTREGAS DE MATERIALES<br>
        <span style="font-size: 14px; font-weight: normal; color: #475569;">Beneficiario: <?php echo e($beneficiario->nombre); ?> <?php echo e($beneficiario->apellido_paterno); ?></span>
    </h2>

    <div style="margin-bottom: 20px; font-size: 12px;">
        <strong>C.I.:</strong> <?php echo e($beneficiario->ci); ?> <?php echo e($beneficiario->expedido); ?> &nbsp;|&nbsp; 
        <strong>Comunidad:</strong> <?php echo e($beneficiario->comunidad); ?> &nbsp;|&nbsp; 
        <strong>Vivienda:</strong> <?php echo e($beneficiario->vivienda ? $beneficiario->vivienda->codigo : 'N/A'); ?>

    </div>

    <?php if($hay_descuadre): ?>
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; margin-bottom: 20px; font-size: 11px; color: #991b1b;">
        <strong>⚠️ ALERTA DE DESCUADRE:</strong> Se han detectado inconsistencias entre las salidas registradas para este beneficiario y el kardex contable del almacén. Por favor, solicite una reconciliación de datos.
    </div>
    <?php endif; ?>

    <table class="table">
        <thead>
            <tr>
                <th style="width: 15%;">Código</th>
                <th style="width: 40%;">Material</th>
                <th class="text-right" style="width: 15%;">Cant. Teórica</th>
                <th class="text-right" style="width: 15%;">Cant. Entregada</th>
                <th class="text-right" style="width: 15%;">Diferencia</th>
                <th class="text-right" style="width: 10%;">%</th>
            </tr>
        </thead>
        <tbody>
            <?php $__empty_1 = true; $__currentLoopData = $materiales; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $mat): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                <tr style="<?php echo e($mat['descuadre'] ? 'background-color: #fff1f2;' : ''); ?>">
                    <td><?php echo e($mat['codigo']); ?></td>
                    <td>
                        <?php echo e($mat['nombre']); ?>

                        <?php if($mat['descuadre']): ?>
                            <span style="color: #ef4444; font-weight: bold; font-size: 10px; margin-left: 5px;">(Descuadre detectado)</span>
                        <?php endif; ?>
                    </td>
                    <td class="text-right"><?php echo e(number_format($mat['teorico'], 2)); ?></td>
                    <td class="text-right font-bold"><?php echo e(number_format($mat['entregado'], 2)); ?></td>
                    <td class="text-right" style="color: <?php echo e($mat['diferencia'] > 0 ? '#ef4444' : ($mat['diferencia'] < 0 ? '#f59e0b' : '#15803d')); ?>">
                        <?php echo e($mat['diferencia'] > 0 ? '+' : ''); ?><?php echo e(number_format($mat['diferencia'], 2)); ?>

                    </td>
                    <td class="text-right" style="color: <?php echo e($mat['porcentaje'] > 100 ? '#ef4444' : '#334155'); ?>">
                        <?php echo e($mat['porcentaje']); ?>%
                    </td>
                </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                <tr>
                    <td colspan="6" class="text-center" style="padding: 20px;">No hay materiales entregados ni teóricos calculados para este beneficiario.</td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>

    <table class="signatures">
        <tr>
            <td>
                <div class="signature-line"></div>
                <strong><?php echo e($beneficiario->nombre); ?> <?php echo e($beneficiario->apellido_paterno); ?></strong><br>
                Firma del Beneficiario / C.I. <?php echo e($beneficiario->ci); ?>

            </td>
            <td>
                <div class="signature-line"></div>
                <strong><?php echo e($usuario_emisor->nombre ?? ''); ?> <?php echo e($usuario_emisor->apellido_paterno ?? ''); ?></strong><br>
                Responsable de Proyecto / Almacén
            </td>
        </tr>
    </table>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('reportes.layouts.oficial', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/reportes/beneficiarios/planilla.blade.php ENDPATH**/ ?>