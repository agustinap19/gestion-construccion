<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estado de cuenta</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td align="center" style="background-color: #0f172a; padding: 40px 20px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">CA & <span style="color: #10b981;">KANAGF S.R.L.</span></h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #334155; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                                Hola <strong><?php echo e($usuario->nombre); ?> <?php echo e($usuario->apellido_paterno); ?></strong>,
                            </p>

                            <?php if($estadoNuevo === 'suspendido'): ?>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border-radius: 6px; margin-bottom: 24px; border-left: 4px solid #ef4444;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 8px 0; font-size: 18px; color: #dc2626; font-weight: bold;">⚠️ Cuenta Suspendida</p>
                                        <p style="margin: 0 0 12px 0; font-size: 14px; color: #334155; line-height: 1.5;">
                                            Tu cuenta en el sistema de gestión ha sido suspendida por un administrador. No podrás acceder al sistema hasta que se resuelva.
                                        </p>
                                        <?php if($razon): ?>
                                        <p style="margin: 0; font-size: 14px; color: #64748b;">
                                            <strong>Razón:</strong> <?php echo e($razon); ?>

                                        </p>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #334155; font-size: 14px; line-height: 1.5;">
                                Si crees que esto es un error, contacta al administrador del sistema para solicitar una revisión de tu caso.
                            </p>
                            <?php elseif($estadoNuevo === 'activo'): ?>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border-radius: 6px; margin-bottom: 24px; border-left: 4px solid #22c55e;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 8px 0; font-size: 18px; color: #16a34a; font-weight: bold;">✅ Cuenta Reactivada</p>
                                        <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">
                                            ¡Buenas noticias! Tu cuenta ha sido reactivada. Ya puedes acceder al sistema normalmente con tus credenciales habituales.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                                <tr>
                                    <td align="center">
                                        <a href="http://127.0.0.1:8000/login" style="display: inline-block; padding: 14px 28px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Ingresar al sistema</a>
                                    </td>
                                </tr>
                            </table>
                            <?php elseif($estadoNuevo === 'inactivo'): ?>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border-radius: 6px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 8px 0; font-size: 18px; color: #d97706; font-weight: bold;">⏸️ Cuenta Desactivada</p>
                                        <p style="margin: 0 0 12px 0; font-size: 14px; color: #334155; line-height: 1.5;">
                                            Tu cuenta ha sido desactivada temporalmente. Para solicitar la reactivación, contacta al administrador del sistema.
                                        </p>
                                        <?php if($razon): ?>
                                        <p style="margin: 0; font-size: 14px; color: #64748b;">
                                            <strong>Razón:</strong> <?php echo e($razon); ?>

                                        </p>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            </table>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0;">&copy; <?php echo e(date('Y')); ?> CA & KANAGF S.R.L. Todos los derechos reservados.</p>
                            <p style="color: #cbd5e1; font-size: 11px; margin: 0;">Este es un mensaje automático, por favor no responder.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
<?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/emails/estado-cuenta.blade.php ENDPATH**/ ?>