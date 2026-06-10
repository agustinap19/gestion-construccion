@extends('exports.layout_membrete')

@section('styles')
<style>
    .acta-titulo { font-size: 16px; font-weight: bold; text-align: center; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.1em; margin: 10px 0; }
    .acta-sub    { font-size: 10px; text-align: center; color: #64748b; margin-bottom: 14px; }
    .check-grid  { display: table; width: 100%; }
    .check-col   { display: table-cell; width: 50%; vertical-align: top; padding-right: 10px; }
    .check-row   { display: table; width: 100%; border-bottom: 1px solid #f1f5f9; padding: 4px 0; }
    .check-lbl   { display: table-cell; font-size: 10px; color: #475569; }
    .check-box   { display: table-cell; width: 18px; text-align: center; }
    .firma-line  { border-top: 1px solid #1e293b; margin-top: 48px; padding-top: 4px; font-size: 9px; color: #475569; }
    .nro-acta    { font-size: 11px; text-align: right; color: #64748b; font-weight: bold; }
</style>
@endsection

@section('content')
<div style="display:table; width:100%; margin-bottom:8px;">
    <div style="display:table-cell; vertical-align:middle;">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
    </div>
    <div style="display:table-cell; text-align:right; vertical-align:middle;">
        <div class="nro-acta">Acta N° {{ str_pad($acta_numero ?? $vivienda->id, 4, '0', STR_PAD_LEFT) }}</div>
        <div style="font-size:9px; color:#94a3b8">Fecha: {{ now()->format('d/m/Y') }}</div>
    </div>
</div>
<hr style="border:none; border-top:3px solid #1e3a5f; margin-bottom:10px;">

<div class="acta-titulo">Acta de Entrega Individual de Vivienda</div>
<div class="acta-sub">Proyecto: {{ $proyecto->codigo }} — {{ $proyecto->nombre }}</div>

<div class="section-title">Datos del Beneficiario</div>
<div class="info-grid">
    <div class="info-cell">
        <div class="info-row"><div class="info-label">Nombre Completo</div><div class="info-value">{{ $beneficiario->nombre }} {{ $beneficiario->apellido_paterno }} {{ $beneficiario->apellido_materno ?? '' }}</div></div>
        <div class="info-row"><div class="info-label">Cédula de Identidad</div><div class="info-value">{{ $beneficiario->ci }}{{ $beneficiario->ci_complemento ? '-'.$beneficiario->ci_complemento : '' }}</div></div>
        <div class="info-row"><div class="info-label">Comunidad</div><div class="info-value">{{ $beneficiario->comunidad ?? '—' }}</div></div>
    </div>
    <div class="info-cell">
        <div class="info-row"><div class="info-label">Tipología</div><div class="info-value">{{ $beneficiario->tipoVivienda->nombre ?? '—' }}</div></div>
        <div class="info-row"><div class="info-label">Dirección del Terreno</div><div class="info-value">{{ $beneficiario->direccion_terreno ?? '—' }}</div></div>
        <div class="info-row"><div class="info-label">Teléfono</div><div class="info-value">{{ $beneficiario->telefono_principal ?? '—' }}</div></div>
    </div>
</div>

<div class="section-title">Datos de la Vivienda Entregada</div>
<div class="info-grid">
    <div class="info-cell">
        <div class="info-row"><div class="info-label">Código de Vivienda</div><div class="info-value">{{ $vivienda->codigo }}</div></div>
        <div class="info-row"><div class="info-label">Estado Final</div><div class="info-value">{{ ucfirst(str_replace('_', ' ', $vivienda->estado)) }}</div></div>
    </div>
    <div class="info-cell">
        <div class="info-row"><div class="info-label">Avance Final</div><div class="info-value">{{ number_format($vivienda->porcentaje_avance ?? 0, 1) }}%</div></div>
        <div class="info-row"><div class="info-label">Fecha de Entrega</div><div class="info-value">{{ now()->format('d \d\e F \d\e Y') }}</div></div>
    </div>
</div>

@if(isset($items) && $items->count() > 0)
<div class="section-title">Checklist de Recepción</div>
<div class="check-grid">
    @php $chunks = $items->chunk(ceil($items->count()/2)); @endphp
    @foreach($chunks as $col)
    <div class="check-col">
        @foreach($col as $item)
        <div class="check-row">
            <div class="check-lbl">{{ $item->nombre }}</div>
            <div class="check-box">
                @if($item->estado === 'completado')
                    <span style="color:#059669; font-weight:bold">✓</span>
                @else
                    <span style="color:#e2e8f0">□</span>
                @endif
            </div>
        </div>
        @endforeach
    </div>
    @endforeach
</div>
@endif

<p style="font-size:10px; color:#475569; margin-top:12px; border:1px solid #e2e8f0; padding:8px; border-radius:4px; background:#f8fafc;">
    En la fecha indicada, el beneficiario recibe a plena conformidad la vivienda descrita en el presente documento, comprometiéndose
    a conservarla y darle uso habitacional. CA &amp; KANAGF S.R.L. certifica la terminación de la construcción conforme a las
    especificaciones técnicas del proyecto.
</p>

<div style="display:table; width:100%; margin-top:24px;">
    <div style="display:table-cell; width:45%; padding-right:20px;">
        <div class="firma-line">Firma del Beneficiario</div>
        <p style="font-size:9px; color:#94a3b8;">{{ $beneficiario->nombre }} {{ $beneficiario->apellido_paterno }}<br>C.I.: {{ $beneficiario->ci }}</p>
    </div>
    <div style="display:table-cell; width:10%;"></div>
    <div style="display:table-cell; width:45%;">
        <div class="firma-line">Representante Legal — CA &amp; KANAGF S.R.L.</div>
        <p style="font-size:9px; color:#94a3b8;">Nombre y Sello</p>
    </div>
</div>


    
@endsection
