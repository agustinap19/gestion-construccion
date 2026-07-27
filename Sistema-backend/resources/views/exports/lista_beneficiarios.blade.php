@extends('exports.layout_membrete')

@section('styles')
<style>
    .info-section { margin-bottom: 15px; }
    .text-right  { text-align: right !important; }
    .text-center { text-align: center !important; }
    .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 8px; font-weight: bold; }
    .aceptado          { background: #dbeafe; color: #1d4ed8; }
    .en_construccion   { background: #fef3c7; color: #92400e; }
    .vivienda_entregada{ background: #d1fae5; color: #065f46; }
    .candidato         { background: #f1f5f9; color: #475569; }
    .retirado          { background: #fed7aa; color: #9a3412; }
    .rechazado         { background: #fee2e2; color: #991b1b; }
    table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    table.data-table th, table.data-table td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; font-size: 9px; }
    table.data-table th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; text-transform: uppercase; }
    table.data-table tbody tr:nth-child(even) { background-color: #f8fafc; }
</style>
@endsection

@section('content')
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">{{ $proyecto->nombre }} — Beneficiarios</div>
        <div class="reporte-sub">Código: {{ $proyecto->codigo }} | Por: {{ $usuario ?? 'Sistema' }}</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado: {{ now()->format('d/m/Y H:i') }}</div>
    </div>
</div>

<div class="kpi-row">
    <div class="kpi-cell">
        <div class="kpi-val">{{ $stats['total'] }}</div>
        <div class="kpi-label">Total Beneficiarios</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $stats['por_estado']['aceptado'] ?? 0 }}</div>
        <div class="kpi-label">Aceptados</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $stats['por_estado']['en_construccion'] ?? 0 }}</div>
        <div class="kpi-label">En Construcción</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $stats['por_estado']['vivienda_entregada'] ?? 0 }}</div>
        <div class="kpi-label">Entregadas</div>
    </div>
</div>

<table class="data-table">
    <thead>
        <tr>
            <th width="12%">Código</th>
            <th width="22%">Nombre Completo</th>
            <th width="10%">CI</th>
            <th width="15%">Comunidad</th>
            <th width="16%">Tipología</th>
            <th width="15%">Vivienda</th>
            <th width="10%" class="text-center">Estado</th>
        </tr>
    </thead>
    <tbody>
        @foreach($beneficiarios as $b)
        <tr>
            <td><strong>{{ $b->codigo_beneficiario }}</strong></td>
            <td>{{ $b->nombre }} {{ $b->apellido_paterno }}{{ $b->apellido_materno ? ' '.$b->apellido_materno : '' }}</td>
            <td>{{ $b->ci }}{{ $b->ci_complemento ? '-'.$b->ci_complemento : '' }}</td>
            <td>{{ $b->comunidad ?? '—' }}</td>
            <td>{{ $b->tipoVivienda?->nombre ?? '—' }}</td>
            <td>{{ $b->vivienda?->codigo ?? '—' }}</td>
            <td class="text-center">
                <span class="badge {{ $b->estado_seleccion }}">{{ ucfirst(str_replace('_', ' ', $b->estado_seleccion)) }}</span>
            </td>
        </tr>
        @endforeach
        @if(count($beneficiarios) === 0)
        <tr>
            <td colspan="7" class="text-center">No se encontraron beneficiarios con los filtros aplicados.</td>
        </tr>
        @endif
    </tbody>
</table>

@endsection
