<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 18px; }
    h1 { font-size: 15px; color: #0f172a; margin-bottom: 2px; }
    h2 { font-size: 11px; color: #0f172a; margin: 14px 0 5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
    .subtitle { font-size: 9px; color: #64748b; margin-bottom: 14px; }
    .kpi-row { display: flex; gap: 10px; margin-bottom: 14px; }
    .kpi { padding: 6px 14px; background: #f8fafc; border-radius: 4px; text-align: center; border: 1px solid #e2e8f0; }
    .kpi-val { font-size: 18px; font-weight: bold; color: #0284c7; }
    .kpi-lbl { font-size: 8px; color: #94a3b8; text-transform: uppercase; }
    .foto-section { margin-bottom: 16px; break-inside: avoid; }
    .foto-header { font-size: 9px; color: #475569; margin-bottom: 6px; padding: 5px 8px; background: #f8fafc; border-radius: 3px; border-left: 3px solid #0284c7; }
    .foto-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .foto-item { width: 160px; break-inside: avoid; }
    .foto-img { width: 160px; height: 120px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0; }
    .foto-caption { font-size: 8px; color: #64748b; margin-top: 2px; }
    .foto-geo { font-size: 7px; color: #94a3b8; }
    .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: bold; }
    .badge-ok   { background: #d1fae5; color: #065f46; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .no-data { font-size: 9px; color: #94a3b8; font-style: italic; }
    .footer { margin-top: 20px; font-size: 8px; color: #94a3b8; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    .page-break { page-break-after: always; }
</style>
</head>
<body>

<h1>Reporte Fotográfico — {{ $vivienda->beneficiario ? $vivienda->beneficiario->nombre . ' ' . $vivienda->beneficiario->apellido_paterno : 'Sin Asignar' }}</h1>
<div class="subtitle">
    Proyecto: {{ $vivienda->proyecto?->nombre ?? '—' }} ({{ $vivienda->proyecto?->codigo ?? '—' }})
    &mdash; Generado: {{ now()->format('d/m/Y H:i') }}
</div>

{{-- KPIs --}}
<div class="kpi-row">
    <div class="kpi">
        <div class="kpi-val">{{ $fotos->count() }}</div>
        <div class="kpi-lbl">Total Fotos</div>
    </div>
    <div class="kpi">
        <div class="kpi-val">{{ $fotos->unique(fn($f) => $f->reporte_id)->count() }}</div>
        <div class="kpi-lbl">Reportes</div>
    </div>
    <div class="kpi">
        <div class="kpi-val">{{ $fotos->unique(fn($f) => $f->reporte?->usuario_id)->count() }}</div>
        <div class="kpi-lbl">Técnicos</div>
    </div>
    <div class="kpi">
        <div class="kpi-val">{{ $fotos->filter(fn($f) => $f->latitud)->count() }}</div>
        <div class="kpi-lbl">Geo-etiquetadas</div>
    </div>
</div>

{{-- Info vivienda --}}
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px 12px;margin-bottom:14px;font-size:9px">
    <strong>Código Vivienda:</strong> {{ $vivienda->codigo }}
    &mdash;
    @if($vivienda->beneficiario)
        <strong>CI:</strong> {{ $vivienda->beneficiario->ci }}
    @endif
    &mdash;
    <strong>Avance:</strong> {{ number_format($vivienda->porcentaje_avance, 1) }}%
    &mdash;
    <strong>Estado:</strong> {{ ucfirst(str_replace('_', ' ', $vivienda->estado)) }}
</div>

{{-- Galería agrupada por reporte --}}
@if($fotos->isEmpty())
    <p class="no-data">No hay fotos registradas para esta vivienda.</p>
@else
    @php $porReporte = $fotos->groupBy('reporte_id'); @endphp

    @foreach($porReporte as $reporteId => $grupoFotos)
    @php $primerFoto = $grupoFotos->first(); $rep = $primerFoto->reporte; @endphp
    <div class="foto-section">
        <div class="foto-header">
            <strong>Reporte #{{ $reporteId }}</strong>
            &mdash;
            {{ $rep?->fecha_reporte ? \Carbon\Carbon::parse($rep->fecha_reporte)->format('d/m/Y') : '—' }}
            &mdash;
            Técnico: {{ $rep?->usuario?->nombre ?? '—' }} {{ $rep?->usuario?->apellido_paterno ?? '' }}
            &mdash;
            {{ $grupoFotos->count() }} foto(s)
        </div>
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
            @foreach($grupoFotos as $index => $foto)
                @php
                    // Robust path resolution for DOMPDF
                    $parsedThumb = parse_url($foto->url_thumbnail ?? $foto->url_original, PHP_URL_PATH);
                    $relPath = preg_replace('#^/?storage/#', '', $parsedThumb);
                    $thumbPath = public_path('storage/' . ltrim($relPath, '/'));
                @endphp
                @if($index > 0 && $index % 3 == 0)
                    </tr><tr>
                @endif
                <td style="width: 33.33%; vertical-align: top; padding: 4px;">
                    <div class="foto-item" style="width: 100%;">
                        @if(file_exists($thumbPath))
                            <img src="{{ $thumbPath }}" alt="Foto" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0;">
                        @else
                            <div style="width: 100%; height: 140px; background: #f1f5f9; border-radius: 4px; border: 1px solid #e2e8f0; display: table;">
                                <div style="display: table-cell; vertical-align: middle; text-align: center; font-size: 8px; color: #94a3b8;">Sin imagen</div>
                            </div>
                        @endif
                        @if($foto->caption)
                            <div class="foto-caption" style="margin-top: 4px; font-size: 8px; color: #64748b; line-height: 1.2;">{{ $foto->caption }}</div>
                        @endif
                        @if($foto->latitud && $foto->longitud)
                            <div class="foto-geo" style="margin-top: 2px; font-size: 7px; color: #94a3b8;">📍 {{ number_format($foto->latitud,5) }}, {{ number_format($foto->longitud,5) }}</div>
                        @endif
                    </div>
                </td>
            @endforeach
            @php
                $resto = $grupoFotos->count() % 3;
                if($resto > 0) {
                    for($i = 0; $i < (3 - $resto); $i++) {
                        echo '<td style="width: 33.33%; padding: 4px;"></td>';
                    }
                }
            @endphp
            </tr>
        </table>
    </div>
    @endforeach
@endif

<div class="footer">CA &amp; KANAGF S.R.L. &mdash; Sistema ERP &mdash; Reporte Fotográfico &mdash; {{ now()->format('d/m/Y H:i') }}</div>
</body>
</html>
