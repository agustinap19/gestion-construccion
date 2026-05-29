<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificación de Documento - CA & KANAGF</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .container { background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); max-width: 500px; width: 100%; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { width: 80px; height: 80px; background-color: #0f172a; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; margin-bottom: 10px; }
        .success { color: #15803d; }
        .error { color: #b91c1c; }
        .icon { font-size: 48px; margin-bottom: 10px; }
        .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
        .detail-label { font-weight: bold; color: #64748b; font-size: 14px; }
        .detail-value { font-weight: 500; text-align: right; font-size: 14px; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">CA</div>
            <h2>CA & KANAGF S.R.L.</h2>
            <p style="color: #64748b; margin-top: -10px;">Sistema de Verificación Documental</p>
        </div>

        <?php if($valido): ?>
            <div style="text-align: center; margin-bottom: 20px;">
                <div class="icon success">✓</div>
                <h3 class="success">Documento Auténtico</h3>
                <p>Este documento fue generado y firmado electrónicamente por nuestro sistema.</p>
            </div>

            <div class="details">
                <div class="detail-row">
                    <span class="detail-label">Tipo de Reporte:</span>
                    <span class="detail-value"><?php echo e(strtoupper(str_replace('_', ' ', $documento->tipo_reporte))); ?></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Fecha de Emisión:</span>
                    <span class="detail-value"><?php echo e($documento->fecha_emision->format('d/m/Y H:i:s')); ?></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Emitido por:</span>
                    <span class="detail-value"><?php echo e($documento->emisor->nombre ?? 'Sistema'); ?> <?php echo e($documento->emisor->apellido_paterno ?? ''); ?></span>
                </div>
                <?php if($documento->proyecto): ?>
                <div class="detail-row">
                    <span class="detail-label">Proyecto:</span>
                    <span class="detail-value"><?php echo e($documento->proyecto->nombre); ?></span>
                </div>
                <?php endif; ?>
                <div class="detail-row" style="border-bottom: none;">
                    <span class="detail-label">Hash Único:</span>
                    <span class="detail-value" style="font-size: 11px; word-break: break-all; text-align: left; margin-left: 10px;"><?php echo e($documento->hash); ?></span>
                </div>
            </div>
        <?php else: ?>
            <div style="text-align: center; margin-bottom: 20px;">
                <div class="icon error">✗</div>
                <h3 class="error">Documento No Válido</h3>
                <p><?php echo e($mensaje); ?></p>
                <p style="font-size: 13px; color: #64748b; margin-top: 20px;">Si cree que esto es un error, por favor contacte a la administración de CA & KANAGF.</p>
            </div>
        <?php endif; ?>

        <div class="footer">
            &copy; <?php echo e(date('Y')); ?> CA & KANAGF S.R.L. Todos los derechos reservados.
        </div>
    </div>
</body>
</html>
<?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/reportes/validacion.blade.php ENDPATH**/ ?>