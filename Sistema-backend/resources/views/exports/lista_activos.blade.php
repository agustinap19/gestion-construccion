@extends('exports.layout_membrete')

@section('styles')
<style>
    .text-right  { text-align: right; }
    .text-center { text-align: center; }
    .badge { padding: 2px 6px; border-radius: 4px; font-size: 9px; }
    .badge-success { background-color: #dcfce7; color: #166534; }
    .badge-danger  { background-color: #fee2e2; color: #991b1b; }
    .badge-warning { background-color: #fef3c7; color: #92400e; }
    .badge-info    { background-color: #dbeafe; color: #1e40af; }

    .foto-cell { width: 38px; }
    .foto-thumb {
        width: 34px; height: 34px; border-radius: 6px; object-fit: cover;
        border: 1px solid #e2e8f0;
    }
    .foto-placeholder {
        width: 34px; height: 34px; border-radius: 6px; border: 1px dashed #cbd5e1;
        background: #f8fafc; color: #cbd5e1; font-size: 7px; text-align: center;
        padding-top: 12px; font-family: Arial, sans-serif;
    }

    td.nombre-cell { line-height: 1.35; }
    td.nombre-cell small { color: #64748b; font-size: 9px; }

    .prog-mini { display: table; width: 64px; }
    .prog-mini-track { background: #e2e8f0; border-radius: 3px; height: 6px; width: 100%; }
    .prog-mini-fill { border-radius: 3px; height: 6px; }
</style>
@endsection

@section('content')
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Maquinaria y Herramientas</div>
        <div class="reporte-sub">Inventario de activos: maquinaria, equipos, herramientas y vehículos</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado: {{ now()->format('d/m/Y H:i') }}</div>
        <div class="reporte-sub">{{ $activos->count() }} activo(s)</div>
    </div>
</div>

@if(!empty($kpis))
<div class="kpi-row">
    <div class="kpi-cell">
        <div class="kpi-val">{{ $kpis['total'] }}</div>
        <div class="kpi-label">Total</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val" style="color:#059669;">{{ $kpis['disponibles'] }}</div>
        <div class="kpi-label">Disponibles</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val" style="color:#1d4ed8;">{{ $kpis['asignados'] }}</div>
        <div class="kpi-label">Asignados</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val" style="color:#b45309;">{{ $kpis['mantenimiento'] }}</div>
        <div class="kpi-label">En Mant.</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">Bs. {{ number_format($kpis['valorDiaTotal'], 0) }}</div>
        <div class="kpi-label">Costo/día Total</div>
    </div>
</div>
@endif

<table>
    <thead>
        <tr>
            <th class="foto-cell"></th>
            <th>Código</th>
            <th>Activo</th>
            <th class="text-center">Tipo</th>
            <th>Ubicación</th>
            <th class="text-right">Costo/día</th>
            <th class="text-center">Mantenimiento</th>
            <th class="text-center">Estado</th>
        </tr>
    </thead>
    <tbody>
        @forelse($activos as $a)
        @php
            $pct = (float) $a->horas_mantenimiento_cada > 0
                ? min(100, round(((float) $a->horas_uso_acumuladas / (float) $a->horas_mantenimiento_cada) * 100, 1))
                : 0;
            $barColor = $pct >= 100 ? '#dc2626' : ($pct >= 80 ? '#f59e0b' : '#10b981');

            $fotoBase64 = null;
            if ($a->foto_url) {
                $rel = ltrim(str_replace('/storage/', '', $a->foto_url), '/');
                $abs = storage_path('app/public/' . $rel);
                if (file_exists($abs)) {
                    $ext = pathinfo($abs, PATHINFO_EXTENSION);
                    $fotoBase64 = 'data:image/' . $ext . ';base64,' . base64_encode(file_get_contents($abs));
                }
            }

            $estadoBadge = match($a->estado) {
                'disponible'    => 'badge-success',
                'asignado'      => 'badge-info',
                'mantenimiento' => 'badge-warning',
                default         => 'badge-danger',
            };
        @endphp
        <tr>
            <td class="foto-cell">
                @if($fotoBase64)
                    <img src="{{ $fotoBase64 }}" class="foto-thumb">
                @else
                    <div class="foto-placeholder">S/F</div>
                @endif
            </td>
            <td>{{ $a->codigo }}</td>
            <td class="nombre-cell">
                {{ $a->nombre }}
                @if($a->marca || $a->modelo)
                    <br><small>{{ trim(($a->marca ?? '') . ' ' . ($a->modelo ?? '')) }}</small>
                @endif
            </td>
            <td class="text-center">{{ ucfirst($a->tipo) }}</td>
            <td>{{ $a->almacen?->nombre ?? '—' }}</td>
            <td class="text-right">Bs. {{ number_format($a->costo_dia_uso, 2) }}</td>
            <td class="text-center">
                <div class="prog-mini">
                    <div class="prog-mini-track">
                        <div class="prog-mini-fill" style="width:{{ $pct }}%; background:{{ $barColor }};"></div>
                    </div>
                </div>
                <small style="color:#64748b;">{{ $pct }}%</small>
            </td>
            <td class="text-center">
                <span class="badge {{ $estadoBadge }}">{{ ucfirst(str_replace('_',' ', $a->estado)) }}</span>
            </td>
        </tr>
        @empty
        <tr>
            <td colspan="8" class="text-center" style="padding:20px; color:#999;">No se encontraron activos para exportar.</td>
        </tr>
        @endforelse
    </tbody>
</table>
@endsection
