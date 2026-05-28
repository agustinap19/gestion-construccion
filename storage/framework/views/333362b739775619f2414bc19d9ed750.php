<?php $__env->startSection('title', 'Reporte de Personal y Roles'); ?>

<?php $__env->startSection('content'); ?>
    <table>
        <thead>
            <tr>
                <th>Cód. Empleado</th>
                <th>Nombre Completo</th>
                <th>CI</th>
                <th>Tipo</th>
                <th>Email</th>
                <th>Rol en Sistema</th>
                <th>Estado Laboral</th>
            </tr>
        </thead>
        <tbody>
            <?php $__currentLoopData = $data; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $personal): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <tr>
                    <td><?php echo e($personal->codigo_empleado); ?></td>
                    <td><?php echo e($personal->nombre); ?> <?php echo e($personal->apellido_paterno); ?> <?php echo e($personal->apellido_materno); ?></td>
                    <td><?php echo e($personal->ci); ?></td>
                    <td><?php echo e(ucfirst($personal->tipo)); ?></td>
                    <td><?php echo e($personal->usuario ? $personal->usuario->email : 'Sin cuenta'); ?></td>
                    <td>
                        <?php if($personal->usuario && $personal->usuario->rol): ?>
                            <?php echo e($personal->usuario->rol->nombre_visible); ?>

                        <?php else: ?>
                            N/A
                        <?php endif; ?>
                    </td>
                    <td><?php echo e(ucfirst($personal->estado_laboral)); ?></td>
                </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </tbody>
    </table>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('reportes.layout', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/reportes/reporte1.blade.php ENDPATH**/ ?>