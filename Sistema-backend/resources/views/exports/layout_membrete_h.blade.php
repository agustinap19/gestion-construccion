<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte — CA &amp; KANAGF S.R.L.</title>
    @include('exports._base_styles')
    @yield('styles')
    <style>
        @page { size: A4 landscape; margin: 90px 30px 70px 30px; }

        body { margin: 0; padding: 0; background: #ffffff; }

        /* ── HEADER ───────────────────────────────────────────────── */
        header {
            position: fixed;
            top: -90px; left: 0; right: 0;
            height: 80px;
        }
        .hdr-stripe {
            display: table;
            width: 100%;
            border-collapse: collapse;
            height: 5px;
        }
        .hdr-stripe td { padding: 0; height: 5px; }
        .hdr-s-purple { background: #312349; width: 50%; }
        .hdr-s-green  { background: #16a34a; width: 50%; }

        .hdr-body {
            display: table;
            width: 100%;
            padding: 5px 0 5px;
        }
        .hdr-logo-cell {
            display: table-cell;
            vertical-align: middle;
            width: 90px;
        }
        .hdr-logo-cell img { max-width: 80px; max-height: 50px; }
        .hdr-logo-placeholder {
            width: 80px; height: 40px;
            border: 1px dashed #cbd5e1;
            text-align: center; font-size: 8px; color: #94a3b8;
            padding-top: 12px;
            font-family: Arial, sans-serif;
        }
        .hdr-info-cell {
            display: table-cell;
            vertical-align: middle;
            text-align: right;
        }
        .hdr-subtitle {
            font-family: Arial, sans-serif;
            font-size: 7px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1.8px;
            margin: 0;
        }
        .hdr-company {
            font-family: Georgia, serif;
            font-size: 14px;
            font-weight: bold;
            color: #312349;
            letter-spacing: 1.5px;
            margin: 2px 0 0 0;
        }
        .hdr-divider {
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 0;
        }

        /* ── FOOTER ───────────────────────────────────────────────── */
        footer {
            position: fixed;
            bottom: -70px; left: 0; right: 0;
            height: 60px;
        }
        .ftr-stripe {
            display: table;
            width: 100%;
            border-collapse: collapse;
            height: 4px;
        }
        .ftr-stripe td { padding: 0; height: 4px; }

        .ftr-body {
            display: table;
            width: 100%;
            padding-top: 7px;
        }
        .ftr-left {
            display: table-cell;
            vertical-align: top;
            font-family: Arial, sans-serif;
            font-size: 7.5px;
            color: #94a3b8;
            line-height: 1.5;
        }
        .ftr-company-name {
            font-size: 8.5px;
            font-weight: bold;
            color: #475569;
        }
        .ftr-right {
            display: table-cell;
            vertical-align: top;
            text-align: right;
            font-family: Arial, sans-serif;
            font-size: 7.5px;
            color: #94a3b8;
            line-height: 1.5;
        }
    </style>
</head>
<body>

<header>
    <table class="hdr-stripe"><tr>
        <td class="hdr-s-purple"></td>
        <td class="hdr-s-green"></td>
    </tr></table>

    <div class="hdr-body">
        <div class="hdr-logo-cell">
            <?php
                $imagePath = public_path('img/logo.png');
                $imageSrc  = file_exists($imagePath)
                    ? 'data:image/png;base64,' . base64_encode(file_get_contents($imagePath))
                    : '';
            ?>
            @if($imageSrc)
                <img src="{{ $imageSrc }}" alt="CA &amp; KANAGF">
            @else
                <div class="hdr-logo-placeholder">Logo</div>
            @endif
        </div>
        <div class="hdr-info-cell">
            <p class="hdr-subtitle">Constructora Consultora</p>
            <p class="hdr-company">CA &amp; KANAGF S.R.L.</p>
        </div>
    </div>
    <hr class="hdr-divider">
</header>

<footer>
    <table class="ftr-stripe"><tr>
        <td class="hdr-s-purple"></td>
        <td class="hdr-s-green"></td>
    </tr></table>
    <div class="ftr-body">
        <div class="ftr-left">
            <span class="ftr-company-name">CA &amp; KANAGF S.R.L.</span><br>
            Constructora Consultora &mdash; Bolivia
        </div>
        <div class="ftr-right">
            Generado: {{ now()->format('d/m/Y H:i') }}<br>
            @if(!empty($usuario))Por: {{ $usuario }}<br>@endif
            Documento confidencial — Uso interno
        </div>
    </div>
</footer>

<main>
    @yield('content')
</main>

</body>
</html>
