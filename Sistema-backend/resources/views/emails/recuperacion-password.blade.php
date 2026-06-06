<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperación de contraseña</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #334155; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .header { background-color: #0f172a; padding: 30px 20px; text-align: center; }
        .header h1 { color: #f8fafc; margin: 0; font-size: 24px; letter-spacing: 1px; }
        .header .accent { color: #10b981; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 20px; font-weight: 600; margin-bottom: 20px; color: #0f172a; }
        .message { font-size: 15px; line-height: 1.6; margin-bottom: 30px; }
        .btn-container { text-align: center; margin: 35px 0; }
        .btn { background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; }
        .url-fallback { font-size: 12px; color: #64748b; word-break: break-all; text-align: center; margin-bottom: 30px; background-color: #f1f5f9; padding: 10px; border-radius: 6px; }
        .warning-card { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin-bottom: 30px; border-radius: 0 6px 6px 0; }
        .warning-card p { margin: 0; font-size: 14px; color: #92400e; font-weight: 500; }
        .details-card { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .details-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        .detail-item { margin-bottom: 8px; font-size: 14px; }
        .detail-label { font-weight: 600; color: #475569; width: 100px; display: inline-block; }
        .detail-value { color: #0f172a; }
        .security-notice { font-size: 13px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CA & KANAGF <span class="accent">S.R.L.</span></h1>
        </div>
        
        <div class="content">
            <div class="greeting">Hola {{ $usuario->nombres }},</div>
            
            <p class="message">
                Recibimos una solicitud para recuperar el acceso a tu cuenta en el sistema de gestión. 
                Si fuiste tú quien realizó esta solicitud, haz clic en el siguiente botón para verificar tu identidad y crear una nueva contraseña:
            </p>
            
            <div class="warning-card">
                <p>⚠ Por seguridad, este enlace es de un solo uso y expirará en 1 hora.</p>
            </div>
            
            <div class="btn-container">
                <a href="{{ $urlRecuperacion }}" class="btn">Recuperar contraseña</a>
            </div>
            
            <div class="url-fallback">
                O copia este enlace en tu navegador:<br>
                {{ $urlRecuperacion }}
            </div>
            
            <div class="details-card">
                <h3 class="details-title">Detalles de la solicitud</h3>
                <div class="detail-item">
                    <span class="detail-label">Fecha/Hora:</span>
                    <span class="detail-value">{{ now()->format('d/m/Y H:i:s') }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Dispositivo:</span>
                    <span class="detail-value">{{ $dispositivo ?: 'Desconocido' }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">IP:</span>
                    <span class="detail-value">{{ $ip }}</span>
                </div>
            </div>
            
            <p class="security-notice">
                <strong>¿No solicitaste este cambio?</strong><br>
                Si no fuiste tú quien solicitó restablecer la contraseña, puedes ignorar este correo de forma segura. Tu contraseña actual seguirá funcionando. Te recomendamos contactar al administrador del sistema si sospechas actividad inusual.
            </p>
        </div>
        
        <div class="footer">
            &copy; {{ date('Y') }} CA & KANAGF S.R.L. Todos los derechos reservados.<br>
            Este es un mensaje automático, por favor no respondas a este correo.
        </div>
    </div>
</body>
</html>
