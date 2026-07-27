@extends('exports.layout_membrete')

@section('styles')
<style>
    body { font-family: Arial, sans-serif; font-size: 9px; color: #1e293b; }
    .almacen-box { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin-bottom: 12px; background: #f8fafc; }
    .almacen-box td { padding: 8px 12px; border: 1px solid #e2e8f0; vertical-align: top; }
    .alm-label { font-size: 7px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px; }
    .alm-value { font-size: 11px; font-weight: bold; color: #1e293b; }
    .alm-sub   { font-size: 8.5px; color: #475569; margin-top: 2px; }
    .seccion { font-size: 10px; font-weight: bold; color: #1e3a5f; margin: 12px 0 6px; border-left: 3px solid #0891b2; padding-left: 7px; }
    .no-data { font-size: 9px; color: #94a3b8; font-style: italic; text-align: center; padding: 20px; }
    /* Tarjetas 3 por fila */
    .foto-card { border: 1px solid #e2e8f0; border-radius: 5px; overflow: hidden; break-inside: avoid; }
    .foto-img-full { width: 100%; height: 130px; object-fit: cover; display: block; }
    .foto-img-placeholder { width: 100%; height: 130px; background: #f1f5f9; display: table; }
    .foto-img-placeholder-inner { display: table-cell; vertical-align: middle; text-align: center; font-size: 8px; color: #94a3b8; }
    .foto-body { padding: 5px 7px; background: #f0f9ff; border-top: 1px solid #bae6fd; }
    .foto-materiales { font-size: 8px; color: #1e293b; font-weight: bold; line-height: 1.5; }
    .foto-fecha { font-size: 7.5px; color: #0369a1; margin-top: 3px; font-weight: bold; }
    .foto-desc  { font-size: 7.5px; color: #475569; margin-top: 2px; }
    .foto-geo   { font-size: 7px; color: #94a3b8; }
    .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: bold; }
    .badge-ec  { background: #d1fae5; color: #065f46; }
    .badge-ed  { background: #e0f2fe; color: #0369a1; }
</style>
@endsection

@section('content')
@php
    $resolverEvidencia = function(?string $url): ?string {
        if (!$url) return null;
        if (file_exists($url)) return $url;
        $p   = parse_url($url, PHP_URL_PATH);
        $rel = preg_replace('#^/?storage/#', '', $p ?? '');
        $abs = public_path('storage/' . ltrim($rel, '/'));
        return file_exists($abs) ? $abs : null;
    };

    $tipoLabels = [
        'entrada_compra'        => 'Entrada Compra',
        'entrada_devolucion'    => 'Devolución',
        'entrada_transferencia' => 'Transferencia',
        'entrada_ajuste'        => 'Ajuste',
        'inventario_inicial'    => 'Inv. Inicial',
    ];
@endphp

{{-- ─── Cabecera ──────────────────────────────────────────────────────── --}}
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Reporte Fotográfico — Entradas al Almacén</div>
        <div class="reporte-sub">Almacén: {{ $almacen->nombre }} ({{ $almacen->codigo }})</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">{{ $movimientos->count() }} entrada(s)</div>
        <div class="reporte-sub">Generado: {{ now()->format('d/m/Y H:i') }}</div>
    </div>
</div>

{{-- ─── KPIs ──────────────────────────────────────────────────────────── --}}
<div class="kpi-row">
    <div class="kpi-cell">
        <div class="kpi-val">{{ $movimientos->count() }}</div>
        <div class="kpi-label">Total Entradas</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $movimientos->flatMap->evidencias->where('tipo','foto')->count() }}</div>
        <div class="kpi-label">Fotos Registradas</div>
    </div>
    <div class="kpi-cell" style="background:#f0f9ff; border-color:#bae6fd;">
        <div class="kpi-val" style="color:#0369a1;">Bs. {{ number_format($movimientos->sum(fn($m) => (float)$m->monto_total), 2) }}</div>
        <div class="kpi-label">Total Compras</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $movimientos->flatMap->detalles->unique('material_id')->count() }}</div>
        <div class="kpi-label">Tipos de Material</div>
    </div>
</div>

{{-- ─── Datos del almacén ──────────────────────────────────────────────── --}}
<div class="seccion">Datos del Almacén</div>
<table class="almacen-box">
    <tr>
        <td style="width:30%">
            <div class="alm-label">Almacén</div>
            <div class="alm-value">{{ $almacen->nombre }}</div>
            <div class="alm-sub">{{ $almacen->codigo }}</div>
        </td>
        <td style="width:30%">
            <div class="alm-label">Proyecto</div>
            <div class="alm-value" style="font-size:10px;">{{ $almacen->proyecto?->codigo ?? '—' }}</div>
            <div class="alm-sub">{{ $almacen->proyecto?->nombre ?? 'Almacén central' }}</div>
        </td>
        <td style="width:20%">
            <div class="alm-label">Tipo</div>
            <div class="alm-sub">{{ ucfirst($almacen->tipo ?? '—') }}</div>
        </td>
        <td style="width:20%">
            <div class="alm-label">Período</div>
            @if($movimientos->count() > 0)
            <div class="alm-sub">
                {{ \Carbon\Carbon::parse($movimientos->min('fecha_movimiento'))->format('d/m/Y') }}<br>
                → {{ \Carbon\Carbon::parse($movimientos->max('fecha_movimiento'))->format('d/m/Y') }}
            </div>
            @else
            <div class="alm-sub">—</div>
            @endif
        </td>
    </tr>
</table>

{{-- ─── Galería fotográfica ─────────────────────────────────────────────── --}}
<div class="seccion">Evidencias Fotográficas de Entradas</div>

@php
    $todasLasFotos = $movimientos->flatMap(function($mov) {
        $ev = $mov->evidencias->where('tipo', 'foto');
        if ($ev->isEmpty()) return [['evidencia' => null, 'movimiento' => $mov]];
        return $ev->map(fn($e) => ['evidencia' => $e, 'movimiento' => $mov]);
    })->values();
@endphp

@if($todasLasFotos->isEmpty())
    <p class="no-data">No hay entradas registradas en este período.</p>
@else
<table style="width:100%; border-collapse:collapse; table-layout:fixed;">
@php $col = 0; @endphp
<tr>
@foreach($todasLasFotos as $item)
@php
    $ev  = $item['evidencia'];
    $mov = $item['movimiento'];

    // Resolver imagen
    $imgSrc = null;
    if ($ev) {
        $absPath = $resolverEvidencia($ev->archivo_url);
        if ($absPath) {
            $ext    = strtolower(pathinfo($absPath, PATHINFO_EXTENSION));
            $mime   = match($ext) { 'png' => 'image/png', 'webp' => 'image/webp', default => 'image/jpeg' };
            $imgSrc = 'data:'.$mime.';base64,'.base64_encode(file_get_contents($absPath));
        }
    }

    // Materiales con cantidad y precio
    $matDesc = $mov->detalles->map(function($d) {
        $nombre = $d->material?->nombre ?? '?';
        $cant   = number_format((float)$d->cantidad, 2);
        return "{$nombre} × {$cant}";
    })->implode(', ');

    $tipoLabel = $tipoLabels[$mov->tipo] ?? ucfirst(str_replace('_',' ',$mov->tipo));
    $proveedor = $mov->proveedor?->razon_social ?? $mov->proveedor_nombre ?? '—';
    $col++;
@endphp
    <td style="width:33.33%; vertical-align:top; padding:4px;">
        <div class="foto-card">
            @if($imgSrc)
                <img src="{{ $imgSrc }}" class="foto-img-full" alt="Evidencia entrada">
            @else
                <div class="foto-img-placeholder">
                    <div class="foto-img-placeholder-inner">Sin fotografía</div>
                </div>
            @endif
            <div class="foto-body">
                <div class="foto-materiales">{{ $matDesc ?: '—' }}</div>
                <div class="foto-fecha">
                    {{ \Carbon\Carbon::parse($mov->fecha_movimiento)->format('d/m/Y H:i') }}
                </div>
                <div class="foto-desc">
                    {{ $tipoLabel }} — {{ $proveedor }}
                    @if($mov->numero_factura) — Fact: {{ $mov->numero_factura }}@endif
                </div>
                @if($ev?->latitud)
                <div class="foto-geo">GPS: {{ number_format((float)$ev->latitud, 5) }}, {{ number_format((float)$ev->longitud, 5) }}</div>
                @endif
                @if($mov->monto_total > 0)
                <div class="foto-desc" style="color:#059669; font-weight:bold;">Bs. {{ number_format((float)$mov->monto_total, 2) }}</div>
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

@endsection
