@extends('exports.layout_membrete')

@section('styles')
<style>
    .text-right  { text-align: right !important; }
    .text-center { text-align: center !important; }
    .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 8px; font-weight: bold; }
    .badge-social  { background: #dbeafe; color: #1e40af; }
    .badge-privado { background: #d1fae5; color: #065f46; }
    table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    table.data-table th, table.data-table td { border: 1px solid #cbd5e1; padding: 5px; text-align: left; font-size: 8px; }
    table.data-table th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; text-transform: uppercase; }
    table.data-table tbody tr:nth-child(even) { background-color: #f8fafc; }
</style>
@endsection

@section('content')
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Entregas Finalizadas</div>
        <div class="reporte-sub">{{ $subtitulo }} | Por: {{ $usuario ?? 'Sistema' }}</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado: {{ now()->format('d/m/Y H:i') }}</div>
        <div class="reporte-sub">{{ $actas->count() }} acta(s)</div>
    </div>
</div>

<table class="data-table">
    <thead>
        <tr>
            <th width="10%">N° Acta</th>
            <th width="13%">Activo</th>
            <th width="14%">Proyecto</th>
            <th width="6%" class="text-center">Tipo</th>
            <th width="13%">Beneficiario</th>
            <th width="9%" class="text-center">Entrega real</th>
            <th width="9%" class="text-center">Devolución real</th>
            <th width="12%">Aprobado por</th>
            <th width="14%">Registrado por (entrega / devolución)</th>
        </tr>
    </thead>
    <tbody>
        @foreach($actas as $a)
        @php
            $proyecto = $a->asignacion?->proyecto;
            $beneficiario = $a->beneficiario;
            $entregaPor = $a->entregaRegistradaPor;
            $devolucionPor = $a->devolucionRegistradaPor;
        @endphp
        <tr>
            <td><strong>{{ $a->numero_acta }}</strong></td>
            <td>{{ $a->activo?->nombre }}</td>
            <td>{{ $proyecto?->nombre ?? '—' }}</td>
            <td class="text-center">
                @if($proyecto)
                    <span class="badge {{ $proyecto->categoria === 'social' ? 'badge-social' : 'badge-privado' }}">
                        {{ ucfirst($proyecto->categoria) }}
                    </span>
                @else
                    —
                @endif
            </td>
            <td>{{ trim(($beneficiario->nombre ?? '') . ' ' . ($beneficiario->apellido_paterno ?? '')) ?: ($a->vivienda?->codigo ?? '—') }}</td>
            <td class="text-center">{{ $a->fecha_entrega_real?->format('d/m/Y') ?? '—' }}</td>
            <td class="text-center">{{ $a->fecha_devolucion_real?->format('d/m/Y') ?? '—' }}</td>
            <td>{{ trim(($a->aprobadoPor->nombre ?? '') . ' ' . ($a->aprobadoPor->apellido_paterno ?? '')) ?: '—' }}</td>
            <td>
                {{ $entregaPor ? trim($entregaPor->nombre . ' ' . $entregaPor->apellido_paterno) : '—' }}
                /
                {{ $devolucionPor ? trim($devolucionPor->nombre . ' ' . $devolucionPor->apellido_paterno) : '—' }}
            </td>
        </tr>
        @endforeach
        @if($actas->count() === 0)
        <tr>
            <td colspan="9" class="text-center">No se encontraron entregas finalizadas con los filtros aplicados.</td>
        </tr>
        @endif
    </tbody>
</table>

@endsection
