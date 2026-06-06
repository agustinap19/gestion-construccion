<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contraseña Cambiada</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #334155; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .header { background-color: #0f172a; padding: 30px 20px; text-align: center; }
        .header h1 { color: #f8fafc; margin: 0; font-size: 24px; letter-spacing: 1px; }
        .header .accent { color: #10b981; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 20px; font-weight: 600; margin-bottom: 20px; color: #0f172a; }
        .success-banner { background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 15px 20px; border-radius: 8px; font-weight: 600; font-size: 16px; margin-bottom: 25px; display: flex; align-items: center; }
        .success-icon { font-size: 20px; margin-right: 10px; }
        .message { font-size: 15px; line-height: 1.6; margin-bottom: 25px; }
        .details-card { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .details-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        .detail-item { margin-bottom: 8px; font-size: 14px; }
        .detail-label { font-weight: 600; color: #475569; width: 100px; display: inline-block; }
        .detail-value { color: #0f172a; }
        .danger-card { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px 20px; margin-bottom: 20px; border-radius: 0 6px 6px 0; }
        .danger-card p { margin: 0; font-size: 14px; color: #991b1b; font-weight: 500; }
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
            
            <div class="success-banner">
                <span class="success-icon">✓</span> Tu contraseña fue cambiada exitosamente
            </div>
            
            <p class="message">
                Te escribimos para confirmar que la contraseña de tu cuenta ha sido actualizada. 
                Por motivos de seguridad, <strong>hemos cerrado todas tus sesiones activas</strong> y deberás iniciar sesión nuevamente en tus dispositivos. Además, el próximo inicio de sesión en cada dispositivo requerirá validación de dos factores.
            </p>
            
            <div class="details-card">
                <h3 class="details-title">Detalles del cambio</h3>
                <div class="detail-item">
                    <span class="detail-label">Fecha/Hora:</span>
                    <span class="detail-value">{{ $fecha }}</span>
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
            
            <div class="danger-card">
                <p>⚠ Si NO fuiste tú quien hizo este cambio, contacta INMEDIATAMENTE al administrador del sistema. Tu cuenta podría estar comprometida.</p>
            </div>
            
            <p class="security-notice">
                Si tú realizaste el cambio, puedes ignorar este mensaje. Recuerda no compartir tu contraseña con nadie.
            </p>
        </div>
        
        <div class="footer">
            &copy; {{ date('Y') }} CA & KANAGF S.R.L. Todos los derechos reservados.<br>
            Este es un mensaje automático, por favor no respondas a este correo.
        </div>
    </div>
</body>
</html>
