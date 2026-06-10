@extends('exports.layout_membrete')

@section('styles')
    <title>Kardex de Almacén</title>
    <style>
        body { font-family: sans-serif; font-size: 9px; color: #333; }
        .header { text-align: center; margin-bottom: 16px; }
        .title { font-size: 15px; font-weight: bold; }
        .subtitle { font-size: 11px; color: #666; margin-top: 4px; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 9px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #ddd; padding: 4px 6px; }
        th { background: #f1f5f9; font-weight: bold; color: #475569; text-align: center; }
        td.text-right { text-align: right; }
        td.text-center { text-align: center; }
        .tipo-entrada { color: #166534; font-weight: bold; }
        .tipo-salida   { color: #991b1b; font-weight: bold; }
        .tipo-ajuste   { color: #92400e; font-weight: bold; }
        .tipo-transf   { color: #1e40af; font-weight: bold; }
        .footer { margin-top: 12px; font-size: 8px; color: #999; text-align: right; }
    </style>
@endsection

@section('content')
    <div class="header">
        <div class="title">KARDEX DE ALMACÉN</div>
        <div class="subtitle">{{ $almacen->nombre }} ({{ $almacen->codigo }}) — {{ $material->nombre }} ({{ $material->codigo }})</div>
        <div class="subtitle">Período: {{ $desde ?? 'Inicio' }} al {{ $hasta ?? now()->format('d/m/Y') }}</div>
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
                    in_array($m->tipo, ['salida']) => 'tipo-salida',
                    str_starts_with($m->tipo, 'ajuste') => 'tipo-ajuste',
                    default => 'tipo-transf',
                };
                $tipoLabel = match($m->tipo) {
                    'entrada' => 'ENTRADA',
                    'salida' => 'SALIDA',
                    'transferencia_entrada' => 'TRANSF. ENT.',
                    'transferencia_salida' => 'TRANSF. SAL.',
                    'ajuste_positivo' => 'AJUSTE +',
                    'ajuste_negativo' => 'AJUSTE -',
                    'inventario_inicial' => 'INV. INICIAL',
                    default => strtoupper($m->tipo),
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
