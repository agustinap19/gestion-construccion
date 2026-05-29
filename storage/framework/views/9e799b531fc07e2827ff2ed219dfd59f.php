<?php $__env->startSection('title', 'Kardex ' . ucfirst($variante)); ?>

<?php $__env->startSection('content'); ?>
    <h2 style="text-align: center; margin-bottom: 20px;">
        KARDEX DE EXISTENCIAS <?php echo e(strtoupper($variante)); ?><br>
        <span style="font-size: 14px; font-weight: normal; color: #475569;">Almacén: <?php echo e($almacen->nombre); ?></span>
    </h2>

    <?php $__currentLoopData = $materiales; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $material): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <div style="margin-bottom: 30px;">
            <div style="background-color: #f8fafc; padding: 10px; border: 1px solid #cbd5e1; border-bottom: none; font-weight: bold; font-size: 12px;">
                Producto: <?php echo e($material['codigo']); ?> - <?php echo e($material['nombre']); ?>

            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th rowspan="2" class="text-center" style="width: 70px;">Fecha</th>
                        <th rowspan="2">Documento</th>
                        <th rowspan="2">Detalle / Tipo</th>
                        <th colspan="3" class="text-center">ENTRADAS</th>
                        <th colspan="3" class="text-center">SALIDAS</th>
                        <th colspan="3" class="text-center">SALDOS</th>
                    </tr>
                    <tr>
                        <th class="text-right">Cant.</th>
                        <th class="text-right">C.U.</th>
                        <th class="text-right">Total</th>
                        <th class="text-right">Cant.</th>
                        <th class="text-right">C.U.</th>
                        <th class="text-right">Total</th>
                        <th class="text-right">Cant.</th>
                        <th class="text-right">C.U.</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                        $saldoCant = 0;
                        $saldoTotal = 0;
                    ?>
                    <?php $__empty_1 = true; $__currentLoopData = $material['movimientos_filtrados'] ?? []; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $det): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                        <?php
                            $mov = $det['movimiento'] ?? [];
                            $tipo = $mov['tipo'] ?? 'Desconocido';
                            $esEntrada = in_array($tipo, ['entrada_compra', 'entrada_devolucion', 'entrada_traspaso', 'entrada_ajuste']);
                            
                            // Lógica básica de PMP / Saldos para la presentación (la BD ya tiene costo_unitario, pero reconstruimos el saldo móvil para el kardex)
                            $cant = (float)$det['cantidad'];
                            $cu = (float)$det['precio_unitario'];
                            $total = $cant * $cu;

                            if ($esEntrada) {
                                $saldoCant += $cant;
                                $saldoTotal += $total;
                            } else {
                                $saldoCant -= $cant;
                                $saldoTotal -= $total;
                            }
                            $saldoCu = $saldoCant > 0 ? $saldoTotal / $saldoCant : 0;
                        ?>
                        <tr>
                            <td class="text-center"><?php echo e(\Carbon\Carbon::parse($mov['fecha_movimiento'] ?? '')->format('d/m/Y')); ?></td>
                            <td><?php echo e($mov['codigo'] ?? '-'); ?></td>
                            <td><?php echo e(strtoupper(str_replace('_', ' ', $tipo))); ?></td>
                            
                            <!-- ENTRADAS -->
                            <td class="text-right"><?php echo e($esEntrada ? number_format($cant, 2) : ''); ?></td>
                            <td class="text-right"><?php echo e($esEntrada ? number_format($cu, 2) : ''); ?></td>
                            <td class="text-right"><?php echo e($esEntrada ? number_format($total, 2) : ''); ?></td>
                            
                            <!-- SALIDAS -->
                            <td class="text-right"><?php echo e(!$esEntrada ? number_format($cant, 2) : ''); ?></td>
                            <td class="text-right"><?php echo e(!$esEntrada ? number_format($cu, 2) : ''); ?></td>
                            <td class="text-right"><?php echo e(!$esEntrada ? number_format($total, 2) : ''); ?></td>
                            
                            <!-- SALDOS -->
                            <td class="text-right"><?php echo e(number_format($saldoCant, 2)); ?></td>
                            <td class="text-right"><?php echo e(number_format($saldoCu, 2)); ?></td>
                            <td class="text-right font-bold"><?php echo e(number_format($saldoTotal, 2)); ?></td>
                        </tr>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                        <tr>
                            <td colspan="12" class="text-center" style="padding: 20px;">Sin movimientos registrados para los filtros aplicados.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

    <table class="signatures">
        <tr>
            <td>
                <div class="signature-line"></div>
                <strong>Almacenaje y Despacho</strong><br>
                Firma Responsable
            </td>
            <td>
                <div class="signature-line"></div>
                <strong>VoBo Administración</strong><br>
                Aprobación Final
            </td>
        </tr>
    </table>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('reportes.layouts.oficial', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/reportes/almacenes/kardex.blade.php ENDPATH**/ ?>