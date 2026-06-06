<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cambio de rol</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background-color: #0f172a; padding: 40px 20px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">CA & <span style="color: #10b981;">KANAGF S.R.L.</span></h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #334155; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                                Hola <strong>{{ $usuario->nombre }} {{ $usuario->apellido_paterno }}</strong>,
                            </p>
                            <p style="color: #334155; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
                                Te informamos que tu rol en el sistema ha sido modificado.
                            </p>

                            <!-- Change Card -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #eff6ff; border-radius: 6px; margin-bottom: 24px; border-left: 4px solid #3b82f6;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Rol anterior:</p>
                                        <p style="margin: 0 0 16px 0; font-size: 16px; color: #ef4444; font-weight: 600; text-decoration: line-through;">{{ $rolAnterior->nombre_visible }}</p>
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Nuevo rol:</p>
                                        <p style="margin: 0; font-size: 18px; color: #10b981; font-weight: bold;">{{ $rolNuevo->nombre_visible }}</p>
                                    </td>
                                </tr>
                            </table>

                            @if($razon)
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; border-radius: 6px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">Razón del cambio:</p>
                                        <p style="margin: 0; font-size: 14px; color: #334155;">{{ $razon }}</p>
                                    </td>
                                </tr>
                            </table>
                            @endif

                            <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0;">
                                Tus permisos de acceso han sido actualizados de acuerdo con tu nuevo rol. Si tienes alguna pregunta, contacta al administrador del sistema.
                            </p>

                            @if($actor)
                            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                Cambio realizado por: {{ $actor->nombre }} {{ $actor->apellido_paterno }}
                            </p>
                            @endif
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0;">&copy; {{ date('Y') }} CA & KANAGF S.R.L. Todos los derechos reservados.</p>
                            <p style="color: #cbd5e1; font-size: 11px; margin: 0;">Este es un mensaje automático, por favor no responder.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
