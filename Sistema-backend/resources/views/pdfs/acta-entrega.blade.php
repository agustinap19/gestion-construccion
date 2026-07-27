<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>{{ $acta->numero_acta }}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #000000; margin: 0; padding: 0; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 0; vertical-align: top; }
        .pagina { padding: 28px 36px; }

        .header-table td { vertical-align: middle; }
        .logo-cell { width: 110px; }
        .logo-cell img { max-width: 100px; max-height: 60px; }
        .logo-placeholder { width: 90px; height: 50px; border: 1px solid #000; text-align: center; font-size: 8px; padding-top: 18px; }
        .titulo-cell { text-align: center; }
        .titulo { font-size: 16px; font-weight: bold; letter-spacing: 0.5px; }
        .subtitulo { font-size: 9px; color: #444444; margin-top: 2px; }
        .acta-cell { width: 150px; text-align: right; font-size: 10px; }
        .acta-numero { font-size: 13px; font-weight: bold; }

        .linea-doble { border-top: 2px solid #000; margin: 10px 0 14px 0; }

        .seccion { margin-bottom: 12px; border: 1px solid #000; }
        .seccion-titulo { background: #000000; color: #ffffff; font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 4px 8px; letter-spacing: 0.5px; }
        .seccion-body { padding: 8px 10px; }
        .seccion-body table td { padding: 3px 6px 3px 0; font-size: 10.5px; }
        .campo-label { color: #444444; font-size: 8.5px; text-transform: uppercase; }
        .campo-valor { font-weight: bold; font-size: 11px; }

        .condiciones { margin: 0; padding-left: 16px; }
        .condiciones li { margin-bottom: 5px; font-size: 10px; line-height: 1.4; }

        .firmas-table td { width: 50%; text-align: center; padding-top: 50px; }
        .firma-linea { border-top: 1px solid #000; width: 90%; margin: 0 auto; }
        .firma-nombre { font-size: 10px; font-weight: bold; margin-top: 4px; }
        .firma-cargo { font-size: 9px; color: #444444; }

        .footer-table { margin-top: 30px; border-top: 1px solid #000; padding-top: 6px; }
        .footer-table td { font-size: 8px; color: #444444; }
        .footer-right { text-align: right; }
    </style>
</head>
<body>
<div class="pagina">

    <table class="header-table">
        <tr>
            <td class="logo-cell">
                @php
                    $logoPath = public_path('img/logo.png');
                    $logoSrc = file_exists($logoPath) ? 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath)) : null;
                @endphp
                @if($logoSrc)
                    <img src="{{ $logoSrc }}" alt="Logo">
                @else
                    <div class="logo-placeholder">CA &amp; KANAGF</div>
                @endif
            </td>
            <td class="titulo-cell">
                <div class="titulo">ACTA DE ENTREGA DE EQUIPO / HERRAMIENTA</div>
                <div class="subtitulo">CA &amp; KANAGF S.R.L. — Constructora Consultora</div>
            </td>
            <td class="acta-cell">
                <div class="acta-numero">{{ $acta->numero_acta_formateado }}</div>
                <div>Generado: {{ now()->format('d/m/Y H:i') }}</div>
            </td>
        </tr>
    </table>
    <div class="linea-doble"></div>

    <div class="seccion">
        <div class="seccion-titulo">Proyecto</div>
        <div class="seccion-body">
            <table>
                <tr>
                    <td style="width:60%;">
                        <div class="campo-label">Nombre del proyecto</div>
                        <div class="campo-valor">{{ $proyecto->nombre }}</div>
                    </td>
                    <td>
                        <div class="campo-label">Código</div>
                        <div class="campo-valor">{{ $proyecto->codigo }}</div>
                    </td>
                </tr>
            </table>
        </div>
    </div>

    <div class="seccion">
        <div class="seccion-titulo">Beneficiario</div>
        <div class="seccion-body">
            <table>
                <tr>
                    <td style="width:50%;">
                        <div class="campo-label">Nombre completo</div>
                        <div class="campo-valor">{{ $beneficiario->nombre_completo }}</div>
                    </td>
                    <td style="width:25%;">
                        <div class="campo-label">C.I.</div>
                        <div class="campo-valor">{{ $beneficiario->ci_completo }}</div>
                    </td>
                    <td>
                        <div class="campo-label">Vivienda</div>
                        <div class="campo-valor">{{ $vivienda->codigo }}</div>
                    </td>
                </tr>
            </table>
        </div>
    </div>

    <div class="seccion">
        <div class="seccion-titulo">Activo entregado</div>
        <div class="seccion-body">
            <table>
                <tr>
                    <td style="width:35%;">
                        <div class="campo-label">Nombre</div>
                        <div class="campo-valor">{{ $activo->nombre }}</div>
                    </td>
                    <td style="width:20%;">
                        <div class="campo-label">Código</div>
                        <div class="campo-valor">{{ $activo->codigo }}</div>
                    </td>
                    <td style="width:25%;">
                        <div class="campo-label">Marca / Modelo</div>
                        <div class="campo-valor">{{ trim(($activo->marca ?? '') . ' ' . ($activo->modelo ?? '')) ?: '—' }}</div>
                    </td>
                    <td>
                        <div class="campo-label">Estado al entregar</div>
                        <div class="campo-valor">{{ ucfirst(str_replace('_', ' ', $activo->estado)) }}</div>
                    </td>
                </tr>
            </table>
        </div>
    </div>

    <div class="seccion">
        <div class="seccion-titulo">Fechas</div>
        <div class="seccion-body">
            <table>
                <tr>
                    <td style="width:50%;">
                        <div class="campo-label">Fecha de entrega estimada</div>
                        <div class="campo-valor">{{ \Carbon\Carbon::parse($acta->fecha_entrega_estimada)->format('d/m/Y') }}</div>
                    </td>
                    <td>
                        <div class="campo-label">Fecha de devolución estimada</div>
                        <div class="campo-valor">{{ \Carbon\Carbon::parse($acta->fecha_devolucion_estimada)->format('d/m/Y') }}</div>
                    </td>
                </tr>
            </table>
        </div>
    </div>

    <div class="seccion">
        <div class="seccion-titulo">Condiciones de uso y compromiso del beneficiario</div>
        <div class="seccion-body">
            <ol class="condiciones">
                <li>El beneficiario se compromete a dar al equipo/herramienta un uso exclusivamente relacionado con la construcción y mejora de su vivienda.</li>
                <li>El beneficiario es responsable de la custodia y buen estado del activo durante todo el periodo de préstamo, debiendo informar de inmediato cualquier daño o desperfecto.</li>
                <li>El activo deberá ser devuelto en la fecha de devolución estimada indicada en esta acta, en las mismas condiciones en que fue recibido, salvo el desgaste normal por uso.</li>
                <li>En caso de pérdida, daño por mal uso o no devolución en el plazo establecido, el beneficiario podrá ser responsable del costo de reparación o reposición del activo, conforme a la normativa interna del proyecto.</li>
            </ol>
        </div>
    </div>

    <table class="firmas-table">
        <tr>
            <td>
                <div class="firma-linea"></div>
                <div class="firma-nombre">{{ $beneficiario->nombre_completo }}</div>
                <div class="firma-cargo">C.I. {{ $beneficiario->ci_completo }} — Beneficiario</div>
            </td>
            <td>
                <div class="firma-linea"></div>
                <div class="firma-nombre">&nbsp;</div>
                <div class="firma-cargo">Responsable de Obra — CA &amp; KANAGF S.R.L.</div>
            </td>
        </tr>
    </table>

    <table class="footer-table">
        <tr>
            <td>{{ $acta->numero_acta_formateado }}</td>
            <td class="footer-right">Generado por sistema gestion-construccion — {{ now()->format('d/m/Y H:i') }}</td>
        </tr>
    </table>

</div>
</body>
</html>
