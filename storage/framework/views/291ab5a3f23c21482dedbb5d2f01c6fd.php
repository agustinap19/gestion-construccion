<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código de Reapertura</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            line-height: 1.6;
            margin: 0;
            padding: 0;
        }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header {
            background-color: #0f172a;
            padding: 30px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
        .header p  { color: #94a3b8; margin: 5px 0 0; font-size: 14px; }
        .content {
            background-color: #ffffff;
            padding: 40px 30px;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -1px rgba(0,0,0,.06);
        }
        .title { color: #0f172a; font-size: 20px; font-weight: 600; text-align: center; margin-top: 0; margin-bottom: 20px; }
        .message { margin-bottom: 30px; text-align: center; color: #475569; }
        .project-box {
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 25px;
            font-size: 14px;
        }
        .project-box strong { color: #1e40af; }
        .code-container { text-align: center; margin: 30px 0; }
        .code {
            display: inline-block;
            background-color: #fef3c7;
            color: #0f172a;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 6px;
            padding: 20px 40px;
            border-radius: 8px;
            border: 2px solid #f59e0b;
        }
        .warning {
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin-top: 30px;
            font-size: 14px;
            color: #92400e;
        }
        .footer { text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CA & KANAGF S.R.L.</h1>
            <p>Sistema de Gestión de Construcción</p>
        </div>
        <div class="content">
            <h2 class="title">Código de reapertura de registros</h2>

            <div class="message">
                <p><strong><?php echo e($solicitante); ?></strong> ha solicitado reabrir los registros de beneficiarios del siguiente proyecto:</p>
            </div>

            <div class="project-box">
                <p style="margin:0;font-size:16px;"><strong><?php echo e($nombreProyecto); ?></strong></p>
            </div>

            <p style="text-align:center;color:#475569;">Ingrese el siguiente código de un solo uso para confirmar la reapertura:</p>

            <div class="code-container">
                <div class="code"><?php echo e($codigo); ?></div>
            </div>

            <div class="warning">
                <strong>Importante:</strong> Este código expira en 15 minutos y solo puede utilizarse una vez.
                Si usted no solicitó esta reapertura, no comparta este código y contáctese con el administrador del sistema.
            </div>
        </div>
        <div class="footer">
            &copy; <?php echo e(date('Y')); ?> CA & KANAGF S.R.L. Todos los derechos reservados.<br>
            Este es un correo automático, por favor no respondas a este mensaje.
        </div>
    </div>
</body>
</html>
<?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/emails/codigo-reapertura.blade.php ENDPATH**/ ?>