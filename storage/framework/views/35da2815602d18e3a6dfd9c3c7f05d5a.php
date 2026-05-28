<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenido a CA & KANAGF S.R.L.</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background-color: #0f172a; padding: 40px 20px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">CA & <span style="color: #10b981;">KANAGF S.R.L.</span></h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="color: #334155; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                                Hola <strong><?php echo e($usuario->nombre); ?> <?php echo e($usuario->apellido_paterno); ?></strong>,
                            </p>
                            <p style="color: #334155; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
                                Has sido registrado exitosamente en el sistema de gestión. A continuación, encontrarás tus credenciales temporales de acceso:
                            </p>
                            
                            <!-- Credentials Table -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; border-radius: 6px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">Correo Electrónico:</p>
                                        <p style="margin: 0 0 20px 0; font-size: 16px; color: #0f172a; font-weight: 600;"><?php echo e($usuario->email); ?></p>
                                        
                                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">Contraseña Temporal:</p>
                                        <p style="margin: 0; font-size: 20px; color: #10b981; font-weight: bold; letter-spacing: 1px;"><?php echo e($passwordTemporal); ?></p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Warning -->
                            <p style="color: #ea580c; font-size: 14px; line-height: 1.5; margin: 0 0 30px 0; padding: 12px; background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 0 4px 4px 0;">
                                <strong>⚠️ Importante:</strong> Por seguridad, deberás cambiar esta contraseña obligatoriamente en tu primer inicio de sesión.
                            </p>
                            
                            <!-- CTA Button -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="http://127.0.0.1:8000/login" style="display: inline-block; padding: 14px 28px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Ingresar al sistema</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Instructions -->
                            <h3 style="color: #0f172a; font-size: 16px; margin: 0 0 16px 0;">Instrucciones para tu primer acceso:</h3>
                            <ol style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 0 0; padding-left: 20px;">
                                <li style="margin-bottom: 8px;">Haz clic en el botón "Ingresar al sistema".</li>
                                <li style="margin-bottom: 8px;">Ingresa tu correo y la contraseña temporal proporcionada.</li>
                                <li style="margin-bottom: 8px;">El sistema te pedirá que ingreses una nueva contraseña segura.</li>
                                <li>Una vez cambiada, podrás acceder a tus módulos correspondientes.</li>
                            </ol>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0;">
                                &copy; <?php echo e(date('Y')); ?> CA & KANAGF S.R.L. Todos los derechos reservados.
                            </p>
                            <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
                                Este es un mensaje automático, por favor no responder a este correo.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
<?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/emails/usuario-creado.blade.php ENDPATH**/ ?>