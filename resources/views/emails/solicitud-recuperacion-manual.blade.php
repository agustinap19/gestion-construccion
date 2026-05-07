<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solicitud de Recuperación Manual</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #334155; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .header { background-color: #0f172a; padding: 30px 20px; text-align: center; border-bottom: 4px solid #8b5cf6; }
        .header h1 { color: #f8fafc; margin: 0; font-size: 20px; letter-spacing: 1px; text-transform: uppercase; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; font-weight: 600; margin-bottom: 20px; color: #0f172a; }
        .message { font-size: 15px; line-height: 1.6; margin-bottom: 25px; }
        .details-card { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .detail-item { margin-bottom: 10px; font-size: 15px; }
        .detail-label { font-weight: 600; color: #475569; width: 120px; display: inline-block; }
        .detail-value { color: #0f172a; font-weight: 500; }
        .info-card { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px 20px; margin-bottom: 30px; border-radius: 0 6px 6px 0; }
        .info-card p { margin: 0; font-size: 14px; color: #1d4ed8; }
        .btn-container { text-align: center; margin: 35px 0; }
        .btn { background-color: #8b5cf6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Atención Requerida</h1>
        </div>
        
        <div class="content">
            <div class="greeting">Estimado Administrador,</div>
            
            <p class="message">
                Un usuario ha intentado utilizar el sistema automático de recuperación de contraseñas, pero el proceso ha sido interrumpido porque <strong>no cuenta con un registro biométrico (rostro)</strong> en el sistema.
            </p>
            
            <div class="details-card">
                <div class="detail-item">
                    <span class="detail-label">Usuario:</span>
                    <span class="detail-value">{{ $usuario->nombres }} {{ $usuario->apellidos }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Correo:</span>
                    <span class="detail-value">{{ $usuario->email }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Motivo:</span>
                    <span class="detail-value" style="color: #ea580c;">Sin rostro registrado</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Fecha:</span>
                    <span class="detail-value">{{ now()->format('d/m/Y H:i') }}</span>
                </div>
            </div>
            
            <div class="info-card">
                <p><strong>Acción requerida:</strong> Deberás contactar a este usuario por canales internos para verificar su identidad y, si corresponde, generar una nueva contraseña temporal desde el panel de administración de usuarios.</p>
            </div>
            
            <div class="btn-container">
                <a href="{{ env('FRONTEND_URL', 'http://127.0.0.1:8000') }}/dashboard" class="btn">Ir al Panel de Administración</a>
            </div>
        </div>
        
        <div class="footer">
            Sistema automatizado de seguridad CA & KANAGF S.R.L.
        </div>
    </div>
</body>
</html>
