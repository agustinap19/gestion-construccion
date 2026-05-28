<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    @include('exports._base_styles')
    <style>
        .firma-row { display: table; width: 100%; margin-top: 50px; }
        .firma-cell { display: table-cell; width: 50%; text-align: center; padding: 0 20px; }
        .firma-linea { border-top: 1px solid #1e293b; margin-top: 50px; padding-top: 4px; font-size: 9.5px; color: #475569; }
        .ampliacion-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 14px; margin: 10px 0 14px; display: table; width: 100%; }
        .ampliacion-cell { display: table-cell; width: 33%; text-align: center; }
        .amp-val { font-size: 20px; font-weight: bold; color: #1e40af; }
        .amp-lbl { font-size: 9px; text-transform: uppercase; color: #64748b; margin-top: 3px; }
        .arrow { font-size: 20px; color: #94a3b8; vertical-align: middle; }
    </style>
</head>
<body>
    <div class="page-header">
        <div class="page-header-left">
            <div class="empresa-nombre">CA & KANAGF S.R.L.</div>
            <div class="reporte-titulo">Modificatorio de Ampliación de Plazo</div>
            <div class="reporte-sub">{{ $modificatorio->numero }} &mdash; {{ $modificatorio->proyecto->nombre }}</div>
        </div>
        <div class="page-header-right">
            <div class="reporte-sub">Generado: {{ now()->format('d/m/Y H:i') }}</div>
            <div class="reporte-sub">Estado: <strong>{{ strtoupper($modificatorio->estado) }}</strong></div>
        </div>
    </div>

    <div class="meta-grid">
        <div class="meta-cell">
            <div class="meta-label">Proyecto</div>
            <div class="meta-value">{{ $modificatorio->proyecto->nombre }}</div>
        </div>
        <div class="meta-cell">
            <div class="meta-label">Código</div>
            <div class="meta-value">{{ $modificatorio->proyecto->codigo }}</div>
        </div>
        <div class="meta-cell">
            <div class="meta-label">Elaborado por</div>
            <div class="meta-value">{{ optional($modificatorio->creadoPor)->name }}</div>
        </div>
        <div class="meta-cell">
            <div class="meta-label">Fecha</div>
            <div class="meta-value">{{ $modificatorio->created_at->format('d/m/Y') }}</div>
        </div>
    </div>

    <div class="section-title">Resumen de la Ampliación</div>

    <div class="ampliacion-box">
        <div class="ampliacion-cell">
            <div class="amp-val">{{ $modificatorio->plazo_original_dias }}</div>
            <div class="amp-lbl">Plazo original (días)</div>
            @if($modificatorio->fecha_fin_original)
            <div style="font-size:10px;color:#475569;margin-top:4px;">Vence: {{ $modificatorio->fecha_fin_original->format('d/m/Y') }}</div>
            @endif
        </div>
        <div class="ampliacion-cell" style="vertical-align:middle;">
            <div class="amp-val" style="color:#f59e0b;">+{{ $modificatorio->dias_ampliacion }}</div>
            <div class="amp-lbl">Días ampliados</div>
        </div>
        <div class="ampliacion-cell">
            <div class="amp-val" style="color:#059669;">{{ $modificatorio->plazo_nuevo_dias }}</div>
            <div class="amp-lbl">Plazo nuevo (días)</div>
            @if($modificatorio->fecha_fin_nueva)
            <div style="font-size:10px;color:#475569;margin-top:4px;">Nuevo vencimiento: {{ $modificatorio->fecha_fin_nueva->format('d/m/Y') }}</div>
            @endif
        </div>
    </div>

    <div class="section-title">Justificación</div>
    <div class="info-grid">
        <div class="info-cell">
            <div class="info-row">
                <div class="info-label">Motivo</div>
                <div class="info-value">{{ $modificatorio->motivo }}</div>
            </div>
        </div>
        <div class="info-cell">
            <div class="info-row">
                <div class="info-label">Descripción</div>
                <div class="info-value">{{ $modificatorio->justificacion }}</div>
            </div>
        </div>
    </div>

    @if($modificatorio->aprobadoPor)
    <div class="section-title">Aprobación</div>
    <div class="info-grid">
        <div class="info-cell">
            <div class="info-row">
                <div class="info-label">Aprobado por</div>
                <div class="info-value">{{ $modificatorio->aprobadoPor->name }}</div>
            </div>
        </div>
        <div class="info-cell">
            <div class="info-row">
                <div class="info-label">Fecha de aprobación</div>
                <div class="info-value">{{ optional($modificatorio->fecha_aprobacion)->format('d/m/Y H:i') }}</div>
            </div>
        </div>
    </div>
    @endif

    @if($modificatorio->justificativo_legal)
    <div class="section-title">Justificativo Legal</div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:12px;font-size:10px;white-space:pre-wrap;">{{ $modificatorio->justificativo_legal }}</div>
    @endif

    <div class="firma-row">
        <div class="firma-cell">
            <div class="firma-linea">Representante del Contratista</div>
        </div>
        <div class="firma-cell">
            <div class="firma-linea">Supervisor / Representante de Entidad</div>
        </div>
    </div>

    <div class="footer">
        <div class="footer-left">CA & KANAGF S.R.L. &mdash; Sistema de Gestión de Construcción</div>
        <div class="footer-right">Documento: {{ $modificatorio->numero }}</div>
    </div>
</body>
</html>
