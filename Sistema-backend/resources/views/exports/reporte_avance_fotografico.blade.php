@extends('exports.layout_membrete')

@section('styles')
<style>
    body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 0; }

    /* ── Tabla beneficiario (primera página) ───────────────────────────── */
    .bene-table { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 16px; }
    .bene-table td { vertical-align: middle; padding: 8px 12px; border: 1px solid #e2e8f0; }
    .bene-foto-cell { width: 90px; background: #f8fafc; text-align: center; }
    .bene-foto { width: 76px; height: 76px; object-fit: cover; border-radius: 5px; border: 2px solid #312349; }
    .bene-foto-placeholder { width: 76px; height: 76px; background: #e2e8f0; border-radius: 5px; border: 2px dashed #94a3b8; line-height: 76px; text-align: center; font-size: 8px; color: #94a3b8; display: inline-block; }
    .bene-label { font-size: 7.5px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .bene-value { font-size: 11px; font-weight: bold; color: #1e293b; line-height: 1.3; }
    .bene-sub   { font-size: 9px; color: #475569; margin-top: 4px; }

    /* ── Título de sección ──────────────────────────────────────────────── */
    .seccion-titulo {
        font-size: 11px; font-weight: bold; color: #312349;
        border-left: 4px solid #16a34a; padding: 3px 0 3px 8px;
        margin: 0 0 6px;
    }
    .seccion-meta { font-size: 8px; color: #64748b; margin-bottom: 12px; }

    /* ── Grid de fotos 3 columnas ───────────────────────────────────────── */
    .foto-row td { width: 33.33%; vertical-align: top; padding: 5px; }
    .foto-card { break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 5px; overflow: hidden; }
    .foto-img { width: 100%; height: 140px; object-fit: cover; display: block; }
    .foto-img-placeholder { width: 100%; height: 140px; background: #f1f5f9; display: table; }
    .foto-img-placeholder-inner { display: table-cell; vertical-align: middle; text-align: center; font-size: 8px; color: #94a3b8; }
    .foto-body { padding: 5px 6px; background: #f8fafc; }
    .badge-completado { display: inline-block; background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; font-size: 7px; font-weight: bold; padding: 1px 5px; border-radius: 3px; margin-bottom: 3px; }
    .foto-caption { font-size: 8px; color: #475569; margin-bottom: 3px; }
    .foto-items { margin-top: 4px; }
    .item-row { border-left: 2px solid #7c3aed; padding-left: 4px; margin-bottom: 3px; }
    .item-nombre { font-size: 8px; font-weight: bold; color: #1e293b; line-height: 1.3; }
    .item-pct { display: inline-block; padding: 0 4px; border-radius: 2px; font-size: 7.5px; font-weight: bold; }
    .pct-ok   { background: #dcfce7; color: #15803d; }
    .pct-mid  { background: #dbeafe; color: #1d4ed8; }
    .obs-txt { font-size: 7px; color: #64748b; font-style: italic; margin-top: 3px; border-top: 1px dashed #e2e8f0; padding-top: 2px; }
    .no-data { text-align: center; font-size: 11px; color: #94a3b8; font-style: italic; padding: 30px 0; }
</style>
@endsection

@section('content')
@php
    $b = $vivienda->beneficiario;

    /* ── Resolver foto del beneficiario para DomPDF ──────────────────── */
    $fotoSrc = null;
    if ($b && $b->foto_titular_url) {
        $parsedPath = parse_url($b->foto_titular_url, PHP_URL_PATH);
        $relPath    = preg_replace('#^/?storage/#', '', $parsedPath ?? '');
        $absPath    = public_path('storage/' . ltrim($relPath, '/'));
        if (file_exists($absPath)) {
            $ext      = strtolower(pathinfo($absPath, PATHINFO_EXTENSION));
            $mimeType = match($ext) { 'png' => 'image/png', 'webp' => 'image/webp', default => 'image/jpeg' };
            $fotoSrc  = 'data:' . $mimeType . ';base64,' . base64_encode(file_get_contents($absPath));
        }
    }

    /* ── Helper: resolver ruta de foto para DomPDF ───────────────────── */
    $resolverFoto = function(?string $path): ?string {
        if (!$path) return null;
        $p    = parse_url($path, PHP_URL_PATH);
        $rel  = preg_replace('#^/?storage/#', '', $p ?? '');
        $abs  = public_path('storage/' . ltrim($rel, '/'));
        return file_exists($abs) ? $abs : null;
    };
@endphp

{{-- ─── Cabecera del beneficiario (sólo primera página) ──────────────── --}}
<table class="bene-table">
    <tr>
        <td class="bene-foto-cell">
            @if($fotoSrc)
                <img src="{{ $fotoSrc }}" class="bene-foto" alt="Foto">
            @else
                <span class="bene-foto-placeholder">Sin<br>Foto</span>
            @endif
        </td>
        <td style="width: 42%;">
            <div class="bene-label">Beneficiario</div>
            <div class="bene-value">{{ $b ? trim("{$b->nombre} {$b->apellido_paterno} " . ($b->apellido_materno ?? '')) : 'Sin asignar' }}</div>
            @if($b)
                <div class="bene-sub">
                    <span class="bene-label">CI:</span>
                    {{ $b->ci }}{{ $b->ci_complemento ? '-' . $b->ci_complemento : '' }}
                </div>
                <div class="bene-sub">
                    <span class="bene-label">Vivienda:</span> {{ $vivienda->codigo }}
                    &nbsp;|&nbsp;
                    <span class="bene-label">Proyecto:</span> {{ $vivienda->proyecto?->codigo ?? '—' }}
                </div>
            @endif
        </td>
        <td>
            @if($b)
                <div class="bene-label">Tipo de vivienda</div>
                <div class="bene-value">{{ $b->tipoVivienda?->nombre ?? $vivienda->tipoVivienda?->nombre ?? '—' }}</div>
                <div class="bene-sub">
                    <span class="bene-label">GPS:</span>
                    {{ $b->latitud_terreno ? number_format((float)$b->latitud_terreno, 6) : '—' }},
                    {{ $b->longitud_terreno ? number_format((float)$b->longitud_terreno, 6) : '—' }}
                </div>
                <div class="bene-sub">
                    <span class="bene-label">Comunidad:</span> {{ $b->comunidad ?? '—' }}
                </div>
            @endif
        </td>
    </tr>
</table>

<div class="seccion-titulo">Reporte Fotográfico Completo de Avance</div>
<div class="seccion-meta">
    Proyecto: {{ $vivienda->proyecto?->codigo ?? '—' }} &mdash;
    Avance actual: {{ number_format($vivienda->porcentaje_avance ?? 0, 1) }}% &mdash;
    Total registros: {{ $grupos->count() }} &mdash;
    Generado: {{ now()->format('d/m/Y H:i') }}
</div>

{{-- ─── Galería de fotos ───────────────────────────────────────────────── --}}
@if($grupos->isEmpty())
    <p class="no-data">No hay registros fotográficos para esta vivienda.</p>
@else
<table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
<tr class="foto-row">

@foreach($grupos as $idx => $grupo)
@php
    $imgPath    = $resolverFoto($grupo['thumb_path']) ?? $resolverFoto($grupo['foto_path']);
    $allDone    = collect($grupo['items'])->every(fn($i) => $i['terminado']);
    $someDone   = collect($grupo['items'])->contains(fn($i) => $i['terminado']);
    $fechaFmt   = $grupo['fecha'] ? \Carbon\Carbon::parse($grupo['fecha'])->format('d/m/Y') : '—';
    $total      = $grupos->count();
@endphp

    <td style="width: 33.33%; vertical-align: top; padding: 5px;">
        <div class="foto-card">
            {{-- Imagen --}}
            @if($imgPath)
                <img src="{{ $imgPath }}" class="foto-img" alt="Evidencia fotográfica">
            @else
                <div class="foto-img-placeholder">
                    <div class="foto-img-placeholder-inner">Sin imagen</div>
                </div>
            @endif

            <div class="foto-body">
                {{-- Badge completado --}}
                @if($allDone)
                    <div><span class="badge-completado">✓ Completado al 100%</span></div>
                @elseif($someDone)
                    <div><span class="badge-completado" style="background:#fef9c3;color:#854d0e;border-color:#fde68a;">~ Parcialmente completo</span></div>
                @endif

                {{-- Técnico y fecha --}}
                <div class="foto-caption">
                    <strong>{{ $grupo['tecnico'] }}</strong> &mdash; {{ $fechaFmt }}
                </div>

                {{-- Ítems registrados con esta foto --}}
                <div class="foto-items">
                    @foreach($grupo['items'] as $item)
                        <div class="item-row">
                            <div class="item-nombre">
                                {{ $item['codigo'] ? '[' . $item['codigo'] . '] ' : '' }}{{ $item['nombre'] }}
                            </div>
                            <span class="item-pct {{ $item['porcentaje'] >= 100 ? 'pct-ok' : 'pct-mid' }}">
                                {{ number_format($item['porcentaje'], 0) }}%
                            </span>
                        </div>
                    @endforeach
                </div>

                @if(!empty($grupo['observacion']))
                    <div class="obs-txt">{{ \Illuminate\Support\Str::limit($grupo['observacion'], 70) }}</div>
                @endif
            </div>
        </div>
    </td>

    @if(($idx + 1) % 3 === 0 && ($idx + 1) < $total)
        </tr><tr class="foto-row">
    @endif
@endforeach

@php
    $resto = $grupos->count() % 3;
    if ($resto > 0) {
        for ($i = 0; $i < (3 - $resto); $i++) {
            echo '<td style="width:33.33%;padding:5px;"></td>';
        }
    }
@endphp

</tr>
</table>
@endif

@endsection
