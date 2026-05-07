<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código de Verificación</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            line-height: 1.6;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #0f172a;
            padding: 30px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header p {
            color: #94a3b8;
            margin: 5px 0 0;
            font-size: 14px;
        }
        .content {
            background-color: #ffffff;
            padding: 40px 30px;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .title {
            color: #0f172a;
            font-size: 20px;
            font-weight: 600;
            margin-top: 0;
            margin-bottom: 20px;
            text-align: center;
        }
        .message {
            margin-bottom: 30px;
            text-align: center;
            color: #475569;
        }
        .details-box {
            background-color: #f1f5f9;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .details-box p {
            margin: 5px 0;
        }
        .details-box strong {
            color: #1e293b;
        }
        .code-container {
            text-align: center;
            margin: 30px 0;
        }
        .code {
            display: inline-block;
            background-color: #d1fae5; /* emerald-100 */
            color: #0f172a; /* slate-900 */
            font-size: 40px;
            font-weight: 700;
            letter-spacing: 8px;
            padding: 20px 40px;
            border-radius: 8px;
            border: 2px solid #34d399; /* emerald-400 */
        }
        .warning {
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin-top: 30px;
            font-size: 14px;
            color: #92400e;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #94a3b8;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CA & KANAGF S.R.L.</h1>
            <p>Sistema de Gestión de Construcción</p>
        </div>
        <div class="content">
            <h2 class="title">Código de verificación</h2>
            
            <div class="message">
                <p>Se detectó un inicio de sesión desde un dispositivo nuevo o no reconocido en tu cuenta.</p>
                <p>Para continuar, por favor ingresa el siguiente código de verificación:</p>
            </div>

            <div class="code-container">
                <div class="code">{{ $codigo }}</div>
            </div>

            <div class="details-box">
                <p><strong>Detalles del intento:</strong></p>
                <p><strong>Dispositivo:</strong> {{ $nombreDispositivo }}</p>
                <p><strong>Dirección IP:</strong> {{ $ip }}</p>
                <p><strong>Fecha y hora:</strong> {{ now()->format('d/m/Y H:i:s') }}</p>
            </div>

            <div class="warning">
                <strong>Importante:</strong> Este código expira en 10 minutos. Si no fuiste tú quien intentó iniciar sesión, te recomendamos cambiar tu contraseña inmediatamente y contactar a soporte.
            </div>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} CA & KANAGF S.R.L. Todos los derechos reservados.<br>
            Este es un correo automático, por favor no respondas a este mensaje.
        </div>
    </div>
</body>
</html>
