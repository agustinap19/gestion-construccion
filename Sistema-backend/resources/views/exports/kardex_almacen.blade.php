@extends('exports.layout_membrete')

@section('styles')
<style>
    body { font-size: 9px; }
    td.text-right  { text-align: right; }
    td.text-center { text-align: center; }
    .tipo-entrada { color: #166534; font-weight: bold; }
    .tipo-salida  { color: #991b1b; font-weight: bold; }
    .tipo-ajuste  { color: #92400e; font-weight: bold; }
    .tipo-transf  { color: #1e40af; font-weight: bold; }
    .meta-row { display: table; width: 100%; margin-bottom: 12px; font-size: 9px; color: #555; }
    .meta-left  { display: table-cell; vertical-align: top; }
    .meta-right { display: table-cell; vertical-align: top; text-align: right; }
</style>
@endsection

@section('content')
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Kardex de Almacén</div>
        <div class="reporte-sub">{{ $almacen->nombre }} ({{ $almacen->codigo }}) &mdash; {{ $material->nombre }} ({{ $material->codigo }})</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado: {{ now()->format('d/m/Y H:i') }}</div>
        <div class="reporte-sub">Período: {{ $desde ?? 'Inicio' }} al {{ $hasta ?? now()->format('d/m/Y') }}</div>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Concepto</th>
            <th>Entrada</th>
            <th>Salida</th>
            <th>Precio Unit.</th>
            <th>Saldo</th>
            <th>PMP</th>
            <th>Registrado por</th>
        </tr>
    </thead>
    <tbody>
        @foreach($movimientos as $m)
        @php
            $esEntrada = in_array($m->tipo, ['entrada','transferencia_entrada','ajuste_positivo','inventario_inicial']);
            $tipoClass = match(true) {
                in_array($m->tipo, ['entrada','inventario_inicial']) => 'tipo-entrada',
                in_array($m->tipo, ['salida'])                       => 'tipo-salida',
                str_starts_with($m->tipo, 'ajuste')                 => 'tipo-ajuste',
                default                                              => 'tipo-transf',
            };
            $tipoLabel = match($m->tipo) {
                'entrada'               => 'ENTRADA',
                'salida'                => 'SALIDA',
                'transferencia_entrada' => 'TRANSF. ENT.',
                'transferencia_salida'  => 'TRANSF. SAL.',
                'ajuste_positivo'       => 'AJUSTE +',
                'ajuste_negativo'       => 'AJUSTE -',
                'inventario_inicial'    => 'INV. INICIAL',
                default                 => strtoupper($m->tipo),
            };
        @endphp
        <tr>
            <td class="text-center">{{ \Carbon\Carbon::parse($m->fecha_movimiento)->format('d/m/Y H:i') }}</td>
            <td class="text-center {{ $tipoClass }}">{{ $tipoLabel }}</td>
            <td>{{ $m->concepto }}</td>
            <td class="text-right">{{ $esEntrada ? number_format($m->cantidad, 2) : '' }}</td>
            <td class="text-right">{{ !$esEntrada ? number_format($m->cantidad, 2) : '' }}</td>
            <td class="text-right">Bs {{ number_format($m->precio_unitario, 2) }}</td>
            <td class="text-right">{{ number_format($m->saldo_posterior, 2) }}</td>
            <td class="text-right">Bs {{ number_format($m->costo_promedio_resultante, 2) }}</td>
            <td class="text-center">{{ $m->registradoPor?->name ?? '—' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

@endsection
