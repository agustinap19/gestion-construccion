<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Catálogo de Materiales</title>
    <style>
        body { font-family: sans-serif; font-size: 10px; color: #333; }
        .header { text-align: center; margin-bottom: 20px; }
        .title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
        .subtitle { font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background-color: #f8fafc; font-weight: bold; color: #475569; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .badge { padding: 2px 6px; border-radius: 4px; font-size: 9px; }
        .badge-success { background-color: #dcfce7; color: #166534; }
        .badge-danger { background-color: #fee2e2; color: #991b1b; }
        .badge-warning { background-color: #fef3c7; color: #92400e; }
        .badge-info { background-color: #dbeafe; color: #1e40af; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">CATÁLOGO MAESTRO DE MATERIALES</div>
        <div class="subtitle">Generado el <?php echo e(now()->format('d/m/Y H:i')); ?></div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Código</th>
                <th>Material</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th class="text-right">Precio Ref.</th>
                <th class="text-right">Stock Mín.</th>
                <th class="text-center">Tipo</th>
                <th class="text-center">Estado</th>
            </tr>
        </thead>
        <tbody>
            <?php $__empty_1 = true; $__currentLoopData = $materiales; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $mat): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
            <tr>
                <td><?php echo e($mat->codigo); ?></td>
                <td><?php echo e($mat->nombre); ?><br><small style="color: #666;"><?php echo e($mat->marca); ?></small></td>
                <td><?php echo e($mat->categoria ? $mat->categoria->nombre : 'N/A'); ?></td>
                <td><?php echo e($mat->unidadMedida ? $mat->unidadMedida->simbolo : 'N/A'); ?></td>
                <td class="text-right">Bs. <?php echo e(number_format($mat->precio_referencial, 2)); ?></td>
                <td class="text-right"><?php echo e($mat->stock_minimo); ?></td>
                <td class="text-center">
                    <?php if($mat->tipo === 'especial'): ?>
                        <span class="badge badge-warning">Especial</span>
                    <?php else: ?>
                        <span class="badge badge-info">Maestro</span>
                    <?php endif; ?>
                </td>
                <td class="text-center">
                    <?php if($mat->activo): ?>
                        <span class="badge badge-success">Activo</span>
                    <?php else: ?>
                        <span class="badge badge-danger">Inactivo</span>
                    <?php endif; ?>
                </td>
            </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
            <tr>
                <td colspan="8" class="text-center" style="padding: 20px;">No se encontraron materiales para exportar.</td>
            </tr>
            <?php endif; ?>
        </tbody>
    </table>
</body>
</html>
<?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/exports/lista_materiales.blade.php ENDPATH**/ ?>