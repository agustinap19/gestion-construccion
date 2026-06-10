<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte</title>
    @include('exports._base_styles')
    @yield('styles')
    <style>
        /* Márgenes adaptados al nuevo diseño formal */
        @page {
            margin: 110px 40px 90px 40px;
        }

        body {
            margin: 0;
            padding: 0;
            background-color: #ffffff; /* Fondo completamente blanco */
        }

        /* HEADER */
        header {
            position: fixed;
            top: -110px;
            left: 0px;
            right: 0px;
            height: 90px;
        }
        
        .header-logo-cell {
            position: absolute;
            left: 0;
            top: 0;
            width: 150px;
        }
        
        /* El logo debe estar en public/img/logo.png */
        .header-logo-cell img {
            max-width: 130px;
            max-height: 80px;
        }

        .header-text-cell {
            position: absolute;
            right: 0;
            top: 15px;
            width: 400px;
            text-align: right;
        }

        .header-title {
            font-family: Arial, sans-serif;
            font-size: 14px;
            color: #475569;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .header-subtitle {
            font-family: Georgia, serif;
            font-size: 20px;
            font-weight: bold;
            color: #312349; /* Morado corporativo */
            margin: 4px 0 0 0;
            letter-spacing: 2px;
        }

        /* FOOTER */
        footer {
            position: fixed;
            bottom: -90px;
            left: 0px;
            right: 0px;
            height: 70px;
            text-align: center;
        }

        .footer-slogan {
            text-align: right;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            color: #94a3b8; /* Gris claro */
            margin-bottom: 6px;
            letter-spacing: 1px;
        }

        /* Línea separadora estilo bandera / corporativa */
        .footer-line {
            width: 100%;
            height: 4px;
            background: linear-gradient(to right, #312349 50%, #16a34a 50%); /* Mitad morado, mitad verde */
            margin-bottom: 8px;
        }

        .footer-info {
            font-family: Arial, sans-serif;
            font-size: 9px;
            color: #64748b;
            line-height: 1.4;
        }
    </style>
</head>
<body>

    <header>
        <div class="header-logo-cell">
            <!-- Es imperativo que coloques tu logo en public/img/logo.png -->
            <!-- NOTA: DomPDF a veces requiere la ruta absoluta interna del servidor o base64 -->
            <?php
                $imagePath = public_path('img/logo.png');
                $imageSrc = file_exists($imagePath) ? 'data:image/png;base64,' . base64_encode(file_get_contents($imagePath)) : '';
            ?>
            @if($imageSrc)
                <img src="{{ $imageSrc }}" alt="Logo CA & KANAGF">
            @else
                <!-- Placeholder si no existe la imagen aún -->
                <div style="width:100px;height:50px;border:1px dashed #ccc;text-align:center;font-size:10px;color:#999;padding-top:15px;">
                    [Falta logo.png]
                </div>
            @endif
        </div>
        <div class="header-text-cell">
            <p class="header-title">CONSTRUCTORA CONSULTORA</p>
            <p class="header-subtitle">C.A. & K.A.N.A.G.F. S.R.L.</p>
        </div>
    </header>

    <footer>
        <div class="footer-slogan">CA & KANAGF S.R.L.</div>
        <div class="footer-line"></div>
        <div class="footer-info">
            Oficina Central: Dirección de ejemplo No. 123 esq. Avenida Principal - https://www.ejemplo.com<br>
            Teléfonos: (591) 1234567 - 7654321
        </div>
    </footer>

    <main>
        @yield('content')
    </main>

</body>
</html>
