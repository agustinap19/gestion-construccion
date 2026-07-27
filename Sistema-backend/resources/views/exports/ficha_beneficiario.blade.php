@extends('exports.layout_membrete')

@section('styles')
<style>
    .firma-box { border-top: 1px solid #1e293b; width: 220px; text-align: center; padding-top: 4px; font-size: 9.5px; color: #475569; margin-top: 48px; }
    .foto-box { width: 80px; height: 100px; border: 1px solid #e2e8f0; display: inline-block; overflow: hidden; }
    .foto-box img { width: 100%; height: 100%; object-fit: cover; }
</style>
@endsection

@section('content')
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Ficha de Beneficiario</div>
        <div class="reporte-sub">{{ $beneficiario->codigo_beneficiario }}</div>
    </div>
    <div class="page-header-right">
        @if($beneficiario->foto_titular_url)
        <div class="foto-box">
            <img src="{{ public_path('storage') . '/' . ltrim(str_replace('/storage/', '', $beneficiario->foto_titular_url), '/') }}" />
        </div>
        @else
        <div class="foto-box" style="background:#f1f5f9; display:table; text-align:center;">
            <span style="display:table-cell; vertical-align:middle; font-size:9px; color:#94a3b8;">Sin foto</span>
        </div>
        @endif
    </div>
</div>

<div class="section-title">Datos Personales</div>
<div class="info-grid">
    <div class="info-cell">
        <div class="info-row"><div class="info-label">Nombre Completo</div><div class="info-value">{{ $beneficiario->nombre }} {{ $beneficiario->apellido_paterno }} {{ $beneficiario->apellido_materno ?? '' }}</div></div>
        <div class="info-row"><div class="info-label">Cédula de Identidad</div><div class="info-value">{{ $beneficiario->ci }}{{ $beneficiario->ci_complemento ? '-'.$beneficiario->ci_complemento : '' }}</div></div>
        <div class="info-row"><div class="info-label">Estado Civil</div><div class="info-value">{{ ucfirst($beneficiario->estado_civil ?? '—') }}</div></div>
        <div class="info-row"><div class="info-label">Fecha de Nacimiento</div><div class="info-value">{{ $beneficiario->fecha_nacimiento ? \Carbon\Carbon::parse($beneficiario->fecha_nacimiento)->format('d/m/Y') : '—' }}</div></div>
        <div class="info-row"><div class="info-label">Género</div><div class="info-value">{{ ucfirst($beneficiario->genero ?? '—') }}</div></div>
    </div>
    <div class="info-cell">
        <div class="info-row"><div class="info-label">Cónyuge</div><div class="info-value">{{ $beneficiario->apellido_conyuge ?? '—' }}</div></div>
        <div class="info-row"><div class="info-label">Teléfono Principal</div><div class="info-value">{{ $beneficiario->telefono_principal ?? '—' }}</div></div>
        <div class="info-row"><div class="info-label">Teléfono Alternativo</div><div class="info-value">{{ $beneficiario->telefono_alternativo ?? '—' }}</div></div>
        <div class="info-row"><div class="info-label">Comunidad</div><div class="info-value">{{ $beneficiario->comunidad ?? '—' }}</div></div>
        <div class="info-row"><div class="info-label">Familiares / Dependientes</div><div class="info-value">{{ $beneficiario->cantidad_familiares ?? '—' }} / {{ $beneficiario->personas_dependientes ?? '—' }}</div></div>
    </div>
</div>

<div class="section-title">Información del Proyecto</div>
<div class="info-grid">
    <div class="info-cell">
        <div class="info-row"><div class="info-label">Proyecto</div><div class="info-value">{{ $proyecto->codigo }} — {{ $proyecto->nombre }}</div></div>
        <div class="info-row"><div class="info-label">Estado en el Proyecto</div><div class="info-value">{{ ucfirst(str_replace('_', ' ', $beneficiario->estado_seleccion)) }}</div></div>
        <div class="info-row"><div class="info-label">Tipología Asignada</div><div class="info-value">{{ $beneficiario->tipoVivienda->nombre ?? '—' }}</div></div>
    </div>
    <div class="info-cell">
        <div class="info-row"><div class="info-label">Dirección Actual</div><div class="info-value">{{ $beneficiario->direccion_actual ?? '—' }}</div></div>
        <div class="info-row"><div class="info-label">Dirección del Terreno</div><div class="info-value">{{ $beneficiario->direccion_terreno ?? '—' }}</div></div>
    </div>
</div>

@if($beneficiario->vivienda)
<div class="section-title">Vivienda Asignada</div>
@php $viv = $beneficiario->vivienda; $avance = floatval($viv->porcentaje_avance ?? 0); @endphp
<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:10px 14px;">
    <div class="info-grid">
        <div class="info-cell">
            <div class="info-row"><div class="info-label">Código</div><div class="info-value">{{ $viv->codigo }}</div></div>
            <div class="info-row"><div class="info-label">Estado Constructivo</div><div class="info-value">{{ ucfirst(str_replace('_', ' ', $viv->estado)) }}</div></div>
        </div>
        <div class="info-cell">
            <div class="info-row"><div class="info-label">Avance de Construcción</div></div>
            <div class="prog-wrap" style="margin-top:6px"><div class="prog-fill" style="width:{{ min(100,$avance) }}%"></div></div>
            <div style="font-size:12px; font-weight:bold; color:#059669; margin-top:3px">{{ number_format($avance,1) }}%</div>
        </div>
    </div>
</div>
@endif

@if($beneficiario->observaciones)
<div class="section-title">Observaciones</div>
<p style="font-size:11px; color:#475569; background:#f8fafc; border:1px solid #e2e8f0; padding:8px 12px; border-radius:4px;">{{ $beneficiario->observaciones }}</p>
@endif

<div style="display:table; width:100%; margin-top:32px;">
    <div style="display:table-cell; width:50%;">
        <div class="firma-box">Firma del Beneficiario</div>
        <p style="font-size:9px; color:#94a3b8; margin-top:4px;">{{ $beneficiario->nombre }} {{ $beneficiario->apellido_paterno }}</p>
    </div>
    <div style="display:table-cell; width:50%; text-align:right;">
        <div class="firma-box" style="margin-left:auto;">Representante CA &amp; KANAGF S.R.L.</div>
    </div>
</div>


    
@endsection
