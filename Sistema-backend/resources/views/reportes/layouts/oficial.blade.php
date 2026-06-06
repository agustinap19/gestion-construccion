<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>@yield('title', 'Reporte Oficial')</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #333;
            margin: 0;
            padding: 0;
        }
        @page {
            margin: 120px 40px 100px 40px; /* Top, Right, Bottom, Left */
        }
        header {
            position: fixed;
            top: -90px;
            left: 0px;
            right: 0px;
            height: 70px;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 10px;
        }
        footer {
            position: fixed;
            bottom: -70px;
            left: 0px;
            right: 0px;
            height: 50px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            font-size: 9px;
            color: #64748b;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
        }
        .header-table td {
            vertical-align: middle;
        }
        .logo {
            width: 60px;
            height: auto;
        }
        .company-info {
            text-align: left;
            padding-left: 15px;
        }
        .company-name {
            font-size: 16px;
            font-weight: bold;
            color: #0f172a;
            margin: 0 0 3px 0;
        }
        .doc-title {
            text-align: right;
            font-size: 14px;
            font-weight: bold;
            color: #1e293b;
        }
        .doc-meta {
            text-align: right;
            font-size: 9px;
            color: #475569;
            margin-top: 4px;
        }
        .filters-banner {
            background-color: #f1f5f9;
            padding: 8px;
            margin-bottom: 15px;
            border-left: 3px solid #3b82f6;
            font-size: 10px;
        }
        .page-number:before {
            content: "Página " counter(page) " de " counter(pages);
        }
        .footer-table {
            width: 100%;
        }
        .footer-table td {
            vertical-align: middle;
        }
        .qr-cell {
            width: 70px;
            text-align: right;
        }
        .qr-image {
            width: 50px;
            height: 50px;
        }
        /* Tablas comunes */
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .table th, .table td {
            border: 1px solid #cbd5e1;
            padding: 6px;
            text-align: left;
        }
        .table th {
            background-color: #f8fafc;
            font-weight: bold;
            color: #334155;
            font-size: 10px;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        
        /* Firmas */
        .signatures {
            width: 100%;
            margin-top: 50px;
            page-break-inside: avoid;
        }
        .signatures td {
            text-align: center;
            vertical-align: bottom;
            width: 50%;
        }
        .signature-line {
            width: 200px;
            border-top: 1px solid #334155;
            margin: 0 auto 5px auto;
        }
        @yield('styles')
    </style>
</head>
<body>

    <header>
        <table class="header-table">
            <tr>
                <td width="80">
                    <!-- Placeholder de logo -->
                    <div style="width: 60px; height: 60px; background-color: #0f172a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; text-align: center; line-height: 60px; font-size: 20px;">
                        CA
                    </div>
                </td>
                <td class="company-info">
                    <h1 class="company-name">CA & KANAGF S.R.L.</h1>
                    <div>NIT: 1234567890 | ERP de Gestión de Construcción</div>
                    @if(isset($proyecto))
                        <div style="margin-top: 3px; font-weight: bold; color: #3b82f6;">Proyecto: {{ $proyecto->nombre }}</div>
                    @endif
                </td>
                <td class="doc-title" width="300">
                    <div>@yield('title', 'Documento Oficial')</div>
                    <div class="doc-meta">
                        Emisión: {{ now()->format('d/m/Y H:i') }}<br>
                        Usuario: {{ $usuario_emisor->nombre ?? 'Sistema' }} {{ $usuario_emisor->apellido_paterno ?? '' }}
                    </div>
                </td>
            </tr>
        </table>
    </header>

    <footer>
        <table class="footer-table">
            <tr>
                <td>
                    Documento generado electrónicamente por ERP CA & KANAGF.<br>
                    Para verificar la autenticidad de este documento, escanee el código QR o visite nuestro portal.<br>
                    Hash de verificación: <strong>{{ $hash_validacion ?? 'N/A' }}</strong>
                </td>
                <td class="text-right" style="width: 100px;">
                    <span class="page-number"></span>
                </td>
                <td class="qr-cell">
                    @if(isset($qr_image))
                        <img src="data:image/svg+xml;base64,{{ $qr_image }}" class="qr-image" alt="QR Verificación">
                    @endif
                </td>
            </tr>
        </table>
    </footer>

    <main>
        @if(isset($texto_filtros))
        <div class="filters-banner">
            <strong>Filtros aplicados:</strong> {{ $texto_filtros }}
        </div>
        @endif

        @yield('content')
    </main>

</body>
</html>
