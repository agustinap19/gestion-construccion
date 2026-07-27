@extends('exports.layout_membrete')

@section('styles')
<style>
    body { font-family: Arial, sans-serif; font-size: 9px; color: #1e293b; }
    .bene-table { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin-bottom: 14px; }
    .bene-table td { vertical-align: middle; padding: 8px 12px; border: 1px solid #e2e8f0; }
    .bene-foto-cell { width: 80px; background: #f8fafc; text-align: center; }
    .bene-foto { width: 68px; height: 68px; object-fit: cover; border-radius: 4px; border: 2px solid #059669; }
    .bene-foto-placeholder { width: 68px; height: 68px; background: #e2e8f0; border-radius: 4px; border: 2px dashed #94a3b8; display: table; }
    .bene-foto-placeholder-inner { display: table-cell; vertical-align: middle; text-align: center; font-size: 8px; color: #94a3b8; }
    .bene-label { font-size: 7px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px; }
    .bene-value { font-size: 11px; font-weight: bold; color: #1e293b; }
    .bene-sub   { font-size: 8.5px; color: #475569; margin-top: 2px; }
    .seccion { font-size: 10px; font-weight: bold; color: #1e3a5f; margin: 12px 0 6px; border-left: 3px solid #059669; padding-left: 7px; }
    .mov-meta { font-size: 8px; color: #475569; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 5px 8px; margin-bottom: 10px; }
    .no-data { font-size: 9px; color: #94a3b8; font-style: italic; text-align: center; padding: 20px; }
    /* Tarjetas de fotos 3 por fila */
    .foto-card { border: 1px solid #e2e8f0; border-radius: 5px; overflow: hidden; break-inside: avoid; }
    .foto-img-full { width: 100%; height: 130px; object-fit: cover; display: block; }
    .foto-img-placeholder { width: 100%; height: 130px; background: #f1f5f9; display: table; }
    .foto-img-placeholder-inner { display: table-cell; vertical-align: middle; text-align: center; font-size: 8px; color: #94a3b8; }
    .foto-body { padding: 5px 7px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .foto-materiales { font-size: 8px; color: #1e293b; font-weight: bold; line-height: 1.5; }
    .foto-fecha { font-size: 7.5px; color: #64748b; margin-top: 3px; }
    .foto-geo  { font-size: 7px; color: #94a3b8; }
    .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: bold; }
    .badge-ok   { background: #d1fae5; color: #065f46; }
    .badge-warn { background: #fef3c7; color: #92400e; }
</style>
@endsection

@section('content')
@php
    $b = $beneficiario;

    /* ── Foto beneficiario ────────────────────────────────────────────── */
    $fotoSrc = null;
    if ($b?->foto_titular_url) {
        $parsedPath = parse_url($b->foto_titular_url, PHP_URL_PATH);
        $relPath    = preg_replace('#^/?storage/#', '', $parsedPath ?? '');
        $absPath    = public_path('storage/' . ltrim($relPath, '/'));
        if (file_exists($absPath)) {
            $ext      = strtolower(pathinfo($absPath, PATHINFO_EXTENSION));
            $mimeType = match($ext) { 'png' => 'image/png', 'webp' => 'image/webp', default => 'image/jpeg' };
            $fotoSrc  = 'data:' . $mimeType . ';base64,' . base64_encode(file_get_contents($absPath));
        }
    }

    /* ── Helper foto evidencia ────────────────────────────────────────── */
    $resolverEvidencia = function(?string $url): ?string {
        if (!$url) return null;
        // Ruta absoluta directa
        if (file_exists($url)) return $url;
        // URL tipo /storage/evidencias/...
        $p   = parse_url($url, PHP_URL_PATH);
        $rel = preg_replace('#^/?storage/#', '', $p ?? '');
        $abs = public_path('storage/' . ltrim($rel, '/'));
        return file_exists($abs) ? $abs : null;
    };
@endphp

{{-- ─── Cabecera ──────────────────────────────────────────────────────── --}}
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Reporte Fotográfico — Entrega de Materiales</div>
        <div class="reporte-sub">Proyecto: {{ $proyecto->codigo }} &mdash; {{ $proyecto->nombre }}</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">{{ $movimientos->count() }} entrega(s) registrada(s)</div>
        <div class="reporte-sub">Generado: {{ now()->format('d/m/Y H:i') }}</div>
    </div>
</div>

{{-- ─── KPIs ──────────────────────────────────────────────────────────── --}}
<div class="kpi-row">
    <div class="kpi-cell">
        <div class="kpi-val">{{ $movimientos->count() }}</div>
        <div class="kpi-label">Total Entregas</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $movimientos->flatMap->evidencias->where('tipo','foto')->count() }}</div>
        <div class="kpi-label">Fotos Registradas</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $movimientos->flatMap->detalles->unique('material_id')->count() }}</div>
        <div class="kpi-label">Tipos de Material</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val" style="font-size:11px;">{{ $movimientos->min('fecha_movimiento') ? \Carbon\Carbon::parse($movimientos->min('fecha_movimiento'))->format('d/m/Y') : '—' }}</div>
        <div class="kpi-label">Primera Entrega</div>
    </div>
</div>

{{-- ─── Datos del beneficiario ─────────────────────────────────────────── --}}
<div class="seccion">Datos del Beneficiario</div>
<table class="bene-table">
    <tr>
        <td class="bene-foto-cell">
            @if($fotoSrc)
                <img src="{{ $fotoSrc }}" class="bene-foto" alt="Foto">
            @else
                <div class="bene-foto-placeholder">
                    <div class="bene-foto-placeholder-inner">Sin Foto</div>
                </div>
            @endif
        </td>
        <td style="width:40%">
            <div class="bene-label">Beneficiario</div>
            <div class="bene-value">{{ trim("{$b->nombre} {$b->apellido_paterno} " . ($b->apellido_materno ?? '')) }}</div>
            <div class="bene-sub"><span class="bene-label">CI:</span> {{ $b->ci }}{{ $b->ci_complemento ? '-'.$b->ci_complemento : '' }}</div>
            @if($b->telefono)<div class="bene-sub"><span class="bene-label">Tel:</span> {{ $b->telefono }}</div>@endif
        </td>
        <td style="width:30%">
            <div class="bene-label">Vivienda / Proyecto</div>
            <div class="bene-value" style="font-size:10px;">{{ $vivienda?->codigo ?? '—' }}</div>
            <div class="bene-sub">{{ $proyecto->codigo }} — {{ $proyecto->nombre }}</div>
        </td>
        <td>
            @if($b->comunidad)<div class="bene-label">Comunidad</div><div class="bene-sub">{{ $b->comunidad }}</div>@endif
            @if($b->latitud_terreno)
            <div class="bene-label" style="margin-top:5px;">GPS Terreno</div>
            <div class="bene-sub">{{ number_format((float)$b->latitud_terreno, 5) }}, {{ number_format((float)$b->longitud_terreno, 5) }}</div>
            @endif
        </td>
    </tr>
</table>

{{-- ─── Galería fotográfica de entregas ────────────────────────────────── --}}
<div class="seccion">Evidencias Fotográficas de Entregas</div>

@php
    /* Juntar todas las fotos de evidencias con su movimiento padre */
    $todasLasFotos = $movimientos->flatMap(function($mov) {
        $ev = $mov->evidencias->where('tipo', 'foto');
        return $ev->map(fn($e) => ['evidencia' => $e, 'movimiento' => $mov]);
    })->values();

    /* Agrupar movimientos SIN fotos para mostrar al menos el registro */
    $movsSinFoto = $movimientos->filter(fn($m) => $m->evidencias->where('tipo','foto')->isEmpty());
@endphp

@if($todasLasFotos->isEmpty() && $movsSinFoto->isEmpty())
    <p class="no-data">No hay entregas registradas para este beneficiario.</p>
@elseif($todasLasFotos->isEmpty())
    <p class="no-data">Las entregas no tienen fotografías adjuntas.</p>
@else
<table style="width:100%; border-collapse:collapse; table-layout:fixed;">
@php $col = 0; @endphp
<tr>
@foreach($todasLasFotos as $item)
@php
    $ev  = $item['evidencia'];
    $mov = $item['movimiento'];
    $absPath = $resolverEvidencia($ev->archivo_url);
    $ext     = $absPath ? strtolower(pathinfo($absPath, PATHINFO_EXTENSION)) : '';
    $mime    = match($ext) { 'png' => 'image/png', 'webp' => 'image/webp', default => 'image/jpeg' };
    $imgSrc  = ($absPath && file_exists($absPath)) ? 'data:'.$mime.';base64,'.base64_encode(file_get_contents($absPath)) : null;

    // Materiales — solo nombres sin cantidades
    $materiales = $mov->detalles->map(fn($d) => $d->material?->nombre ?? '?')->filter()->implode(', ');
    $col++;
@endphp
    <td style="width:33.33%; vertical-align:top; padding:4px;">
        <div class="foto-card">
            @if($imgSrc)
                <img src="{{ $imgSrc }}" class="foto-img-full" alt="Evidencia entrega">
            @else
                <div class="foto-img-placeholder">
                    <div class="foto-img-placeholder-inner">Sin imagen</div>
                </div>
            @endif
            <div class="foto-body">
                <div class="foto-materiales">{{ $materiales ?: '—' }}</div>
                <div class="foto-fecha">
                    {{ \Carbon\Carbon::parse($mov->fecha_movimiento)->format('d/m/Y H:i') }}
                    &mdash; <span style="font-size:7px; color:#94a3b8;">{{ $mov->codigo }}</span>
                </div>
                @if($ev->latitud)
                <div class="foto-geo">GPS: {{ number_format((float)$ev->latitud, 5) }}, {{ number_format((float)$ev->longitud, 5) }}</div>
                @endif
            </div>
        </div>
    </td>

    @if($col % 3 === 0 && !$loop->last)
        </tr><tr>
    @endif
@endforeach

@php $resto = $col % 3; @endphp
@if($resto > 0)
    @for($i = 0; $i < (3 - $resto); $i++)
        <td style="width:33.33%;"></td>
    @endfor
@endif
</tr>
</table>
@endif

{{-- ─── Resumen de movimientos (sin foto) ─────────────────────────────── --}}
@if($movsSinFoto->isNotEmpty())
<div class="seccion" style="margin-top:14px;">Entregas sin Evidencia Fotográfica</div>
<table>
    <thead>
        <tr>
            <th>Código</th>
            <th>Fecha</th>
            <th>Materiales entregados</th>
            <th>Registrado por</th>
            <th>Estado</th>
        </tr>
    </thead>
    <tbody>
        @foreach($movsSinFoto as $mov)
        @php $mats = $mov->detalles->map(fn($d) => $d->material?->nombre ?? '?')->implode(', '); @endphp
        <tr>
            <td style="font-family:monospace; font-size:8px;">{{ $mov->codigo }}</td>
            <td>{{ \Carbon\Carbon::parse($mov->fecha_movimiento)->format('d/m/Y') }}</td>
            <td>{{ $mats }}</td>
            <td>{{ $mov->registradoPor ? "{$mov->registradoPor->nombre} {$mov->registradoPor->apellido_paterno}" : '—' }}</td>
            <td><span class="badge {{ $mov->estado === 'completado' ? 'badge-ok' : 'badge-warn' }}">{{ ucfirst($mov->estado) }}</span></td>
        </tr>
        @endforeach
    </tbody>
</table>
@endif

@endsection
