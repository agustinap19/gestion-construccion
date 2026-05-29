<?php $__env->startSection('title', 'Reporte Fotográfico'); ?>

<?php $__env->startSection('styles'); ?>
<style>
    .cover-page {
        text-align: center;
        padding-top: 50px;
        page-break-after: always;
    }
    .cover-title {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 30px;
    }
    .beneficiario-info {
        text-align: left;
        width: 80%;
        margin: 0 auto;
        border: 1px solid #cbd5e1;
        padding: 20px;
        border-radius: 8px;
        background-color: #f8fafc;
    }
    .info-row {
        margin-bottom: 10px;
        font-size: 14px;
    }
    .info-label {
        font-weight: bold;
        display: inline-block;
        width: 150px;
    }
    .timeline {
        margin-top: 20px;
    }
    .photo-container {
        text-align: center;
        margin-bottom: 40px;
        page-break-inside: avoid;
    }
    .photo-img {
        max-width: 90%;
        max-height: 400px;
        border: 2px solid #e2e8f0;
        padding: 4px;
        border-radius: 4px;
    }
    .photo-caption {
        margin-top: 10px;
        font-size: 12px;
        font-weight: bold;
        color: #334155;
    }
    .photo-date {
        font-size: 10px;
        color: #64748b;
    }
</style>
<?php $__env->stopSection(); ?>

<?php $__env->startSection('content'); ?>

    <!-- Portada -->
    <div class="cover-page">
        <div class="cover-title">REPORTE FOTOGRÁFICO DE ENTREGAS</div>
        
        <div class="beneficiario-info">
            <h3 style="margin-top: 0; text-align: center;">Datos del Beneficiario</h3>
            
            <div class="info-row">
                <span class="info-label">Nombre Completo:</span>
                <?php echo e($beneficiario->nombre); ?> <?php echo e($beneficiario->apellido_paterno); ?> <?php echo e($beneficiario->apellido_materno); ?>

            </div>
            <div class="info-row">
                <span class="info-label">C.I.:</span>
                <?php echo e($beneficiario->ci); ?> <?php echo e($beneficiario->expedido); ?>

            </div>
            <div class="info-row">
                <span class="info-label">Comunidad/Zona:</span>
                <?php echo e($beneficiario->comunidad); ?>

            </div>
            <div class="info-row">
                <span class="info-label">Vivienda Asignada:</span>
                <?php echo e($beneficiario->vivienda ? $beneficiario->vivienda->codigo : 'N/A'); ?>

            </div>
            <div class="info-row">
                <span class="info-label">GPS:</span>
                <?php echo e($beneficiario->latitud ?? 'N/A'); ?>, <?php echo e($beneficiario->longitud ?? 'N/A'); ?>

            </div>
            <div class="info-row">
                <span class="info-label">Fecha de Registro:</span>
                <?php echo e($beneficiario->created_at ? $beneficiario->created_at->format('d/m/Y') : 'N/A'); ?>

            </div>
        </div>
    </div>

    <!-- Fotos -->
    <div class="timeline">
        <?php if(count($fotos) === 0): ?>
            <div style="text-align: center; margin-top: 50px; font-size: 14px; color: #64748b;">
                Sin entregas fotográficas registradas al momento.
            </div>
        <?php else: ?>
            <?php $__currentLoopData = $fotos; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $foto): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <div class="photo-container">
                    <?php
                        // En local/storage real, debemos convertir la URL a path absoluto para DomPDF si es necesario
                        $url = public_path(str_replace(config('app.url').'/', '', $foto['url']));
                        if (!file_exists($url)) {
                            // Intento alternativo para dompdf si no resuelve
                            $url = $foto['url'];
                        }
                    ?>
                    <!-- Nota: Se usa un placeholder si la imagen física no existe localmente, para evitar errores de render -->
                    <img src="<?php echo e($url); ?>" class="photo-img" alt="Evidencia fotográfica" onerror="this.src='<?php echo e(public_path('placeholder.png')); ?>'">
                    
                    <div class="photo-caption"><?php echo e($foto['descripcion']); ?></div>
                    <div class="photo-date">Entregado el: <?php echo e(\Carbon\Carbon::parse($foto['fecha'])->format('d/m/Y H:i')); ?></div>
                </div>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        <?php endif; ?>
    </div>

<?php $__env->stopSection(); ?>

<?php echo $__env->make('reportes.layouts.oficial', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/reportes/beneficiarios/fotografico.blade.php ENDPATH**/ ?>