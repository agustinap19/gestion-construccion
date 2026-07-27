@extends('exports.layout_membrete')

@section('styles')
<style>
    body { font-size: 9px; }
    .text-right  { text-align: right; }
    .text-center { text-align: center; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 8px; font-weight: bold; }
    /* Tipos */
    .t-ec  { background: #d1fae5; color: #065f46; }  /* entrada compra */
    .t-ed  { background: #dcfce7; color: #166534; }  /* entrada devolución */
    .t-et  { background: #e0f2fe; color: #0369a1; }  /* entrada transferencia */
    .t-ea  { background: #f0fdf4; color: #15803d; }  /* entrada ajuste */
    .t-ii  { background: #f0fdf4; color: #15803d; }  /* inventario inicial */
    .t-ss  { background: #fef3c7; color: #92400e; }  /* salida social */
    .t-sp  { background: #fee2e2; color: #991b1b; }  /* salida privado */
    .t-dp  { background: #ffe4e6; color: #881337; }  /* devolución proveedor */
    .t-sa  { background: #fce7f3; color: #9d174d; }  /* salida ajuste */
    .t-ti  { background: #dbeafe; color: #1e40af; }  /* transferencia interna */
    /* Estados */
    .e-comp  { background: #d1fae5; color: #065f46; }
    .e-anul  { background: #fee2e2; color: #991b1b; }
    .e-pend  { background: #fef3c7; color: #92400e; }
    .e-bor   { background: #f3f4f6; color: #6b7280; }
    .small   { font-size: 7.5px; color: #6b7280; }
    .filtros-meta { font-size: 8.5px; color: #555; margin-bottom: 8px; background: #f8fafc; padding: 4px 8px; border-left: 3px solid #cbd5e1; }
</style>
@endsection

@section('content')
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Registro de Movimientos — Almacén</div>
        @if(!empty($filtros['almacen_id']))
        <div class="reporte-sub">Almacén filtrado: ID {{ $filtros['almacen_id'] }}</div>
        @endif
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Total: {{ $movimientos->count() }} movimientos</div>
        <div class="reporte-sub">Generado: {{ now()->format('d/m/Y H:i') }}</div>
    </div>
</div>

@if(!empty($filtros) && count(array_filter($filtros)))
<div class="filtros-meta">
    <strong>Filtros aplicados:</strong>
    @if(!empty($filtros['tipo']) && $filtros['tipo'] !== 'todos') Tipo: {{ str_replace('_', ' ', $filtros['tipo']) }} &nbsp;|&nbsp; @endif
    @if(!empty($filtros['estado']) && $filtros['estado'] !== 'todos') Estado: {{ $filtros['estado'] }} &nbsp;|&nbsp; @endif
    @if(!empty($filtros['fecha_desde'])) Desde: {{ $filtros['fecha_desde'] }} @endif
    @if(!empty($filtros['fecha_hasta'])) &nbsp;Hasta: {{ $filtros['fecha_hasta'] }} @endif
    @if(!empty($filtros['busqueda'])) &nbsp;Búsqueda: "{{ $filtros['busqueda'] }}" @endif
</div>
@endif

@php
    $tipoLabels = [
        'entrada_compra'              => ['label' => 'Entrada Compra',      'cls' => 't-ec'],
        'entrada_devolucion'          => ['label' => 'Devolución Entrada',  'cls' => 't-ed'],
        'entrada_transferencia'       => ['label' => 'Entrada Transfer.',   'cls' => 't-et'],
        'entrada_ajuste'              => ['label' => 'Ajuste Entrada',      'cls' => 't-ea'],
        'inventario_inicial'          => ['label' => 'Inv. Inicial',        'cls' => 't-ii'],
        'salida_social'               => ['label' => 'Entrega Social',      'cls' => 't-ss'],
        'salida_privado'              => ['label' => 'Entrega Privada',     'cls' => 't-sp'],
        'salida_devolucion_proveedor' => ['label' => 'Dev. Proveedor',      'cls' => 't-dp'],
        'salida_ajuste'               => ['label' => 'Ajuste Salida',       'cls' => 't-sa'],
        'transferencia_interna'       => ['label' => 'Transferencia',       'cls' => 't-ti'],
    ];
    $estadoCls = [
        'completado' => 'e-comp',
        'anulado'    => 'e-anul',
        'pendiente'  => 'e-pend',
        default      => 'e-bor',
    ];
@endphp

<table>
    <thead>
        <tr>
            <th style="width:10%">Código</th>
            <th style="width:9%">Fecha</th>
            <th style="width:13%">Tipo</th>
            <th style="width:14%">Almacén</th>
            <th style="width:18%">Proveedor / Receptor</th>
            <th style="width:22%">Materiales</th>
            <th style="width:8%" class="text-right">Total Bs.</th>
            <th style="width:6%" class="text-center">Estado</th>
        </tr>
    </thead>
    <tbody>
        @forelse($movimientos as $mov)
        @php
            $tipo     = $mov->tipo;
            $tipoInfo = $tipoLabels[$tipo] ?? ['label' => ucfirst(str_replace('_', ' ', $tipo)), 'cls' => 't-ec'];
            $estCls   = $estadoCls[$mov->estado] ?? 'e-bor';

            $esEntrada  = in_array($tipo, ['entrada_compra','entrada_devolucion','entrada_transferencia','entrada_ajuste','inventario_inicial']);
            $esTransf   = $tipo === 'transferencia_interna';

            // Almacén relevante
            if ($esTransf) {
                $almacenNombre = ($mov->almacenOrigen?->nombre ?? '?') . ' → ' . ($mov->almacenDestino?->nombre ?? '?');
            } elseif ($esEntrada) {
                $almacenNombre = $mov->almacenDestino?->nombre ?? $mov->almacenOrigen?->nombre ?? '—';
            } else {
                $almacenNombre = $mov->almacenOrigen?->nombre ?? '—';
            }

            // Receptor / Proveedor
            if ($tipo === 'salida_social' && $mov->beneficiario) {
                $receptor = trim("{$mov->beneficiario->nombre} {$mov->beneficiario->apellido_paterno}");
            } elseif (in_array($tipo, ['salida_privado']) && $mov->receptorPersonal) {
                $receptor = trim("{$mov->receptorPersonal->nombre} {$mov->receptorPersonal->apellido_paterno}");
            } elseif ($mov->receptor_nombre) {
                $receptor = $mov->receptor_nombre;
            } elseif ($mov->proveedor) {
                $receptor = $mov->proveedor->razon_social;
            } elseif ($mov->proveedor_nombre) {
                $receptor = $mov->proveedor_nombre;
            } else {
                $receptor = '—';
            }

            $total = $mov->monto_total > 0
                ? (float) $mov->monto_total
                : $mov->detalles->sum(fn($d) => (float)$d->cantidad * (float)$d->precio_unitario);

            $registrador = $mov->registradoPor
                ? trim("{$mov->registradoPor->nombre} {$mov->registradoPor->apellido_paterno}")
                : '—';
        @endphp
        <tr>
            <td style="font-family:monospace; font-size:8px;">{{ $mov->codigo }}</td>
            <td class="text-center">{{ \Carbon\Carbon::parse($mov->fecha_movimiento)->format('d/m/Y') }}<br>
                <span class="small">{{ \Carbon\Carbon::parse($mov->fecha_movimiento)->format('H:i') }}</span>
            </td>
            <td><span class="badge {{ $tipoInfo['cls'] }}">{{ $tipoInfo['label'] }}</span></td>
            <td style="font-size:8.5px;">{{ $almacenNombre }}</td>
            <td style="font-size:8.5px;">
                {{ $receptor }}
                @if($mov->numero_factura)<br><span class="small">Factura: {{ $mov->numero_factura }}</span>@endif
                @if($mov->notas)<br><span class="small">{{ \Illuminate\Support\Str::limit($mov->notas, 40) }}</span>@endif
            </td>
            <td style="font-size:8px;">
                @foreach($mov->detalles->take(4) as $det)
                    <span style="color:#1e3a5f;">{{ $det->material?->nombre ?? '?' }}</span>
                    × <span style="font-weight:bold;">{{ number_format((float)$det->cantidad, 2) }}</span>
                    @if($det->precio_unitario > 0)
                        <span class="small">@ Bs.{{ number_format((float)$det->precio_unitario, 2) }}</span>
                    @endif
                    <br>
                @endforeach
                @if($mov->detalles->count() > 4)
                    <span class="small">+{{ $mov->detalles->count() - 4 }} más</span>
                @endif
            </td>
            <td class="text-right" style="font-weight:bold; {{ $total > 0 ? 'color:#059669;' : 'color:#94a3b8;' }}">
                {{ $total > 0 ? 'Bs. ' . number_format($total, 2) : '—' }}
            </td>
            <td class="text-center">
                <span class="badge {{ $estCls }}">{{ ucfirst($mov->estado) }}</span><br>
                <span class="small">{{ $registrador }}</span>
            </td>
        </tr>
        @empty
        <tr>
            <td colspan="8" class="text-center" style="color:#999; padding:20px;">Sin movimientos registrados.</td>
        </tr>
        @endforelse
    </tbody>
</table>

@if($movimientos->count() > 0)
@php
    $totEntradas  = $movimientos->filter(fn($m) => in_array($m->tipo, ['entrada_compra','entrada_devolucion','entrada_transferencia','entrada_ajuste','inventario_inicial']))->sum(fn($m) => (float)$m->monto_total);
    $totSalidas   = $movimientos->filter(fn($m) => str_starts_with($m->tipo, 'salida'))->count();
    $totCompletados = $movimientos->where('estado','completado')->count();
    $totAnulados    = $movimientos->where('estado','anulado')->count();
@endphp
<div class="kpi-row" style="margin-top:10px;">
    <div class="kpi-cell">
        <div class="kpi-val">{{ $movimientos->count() }}</div>
        <div class="kpi-label">Total Movimientos</div>
    </div>
    <div class="kpi-cell" style="background:#f0fdf4; border-color:#bbf7d0;">
        <div class="kpi-val" style="color:#059669;">{{ number_format($totEntradas, 2) }}</div>
        <div class="kpi-label">Bs. Total Entradas</div>
    </div>
    <div class="kpi-cell" style="background:#f0fdf4; border-color:#bbf7d0;">
        <div class="kpi-val" style="color:#059669;">{{ $totCompletados }}</div>
        <div class="kpi-label">Completados</div>
    </div>
    <div class="kpi-cell" style="background:#fff5f5; border-color:#fecaca;">
        <div class="kpi-val" style="color:#dc2626;">{{ $totAnulados }}</div>
        <div class="kpi-label">Anulados</div>
    </div>
</div>
@endif

@endsection
