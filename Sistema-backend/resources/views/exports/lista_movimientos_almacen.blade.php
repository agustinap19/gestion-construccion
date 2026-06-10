@extends('exports.layout_membrete')

@section('styles')
    <title>Movimientos de Almacén</title>
    <style>
        body { font-family: sans-serif; font-size: 9px; color: #333; }
        .header { text-align: center; margin-bottom: 16px; }
        .title { font-size: 15px; font-weight: bold; }
        .subtitle { font-size: 11px; color: #666; margin-top: 4px; }
        .meta { margin-bottom: 10px; font-size: 9px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #ddd; padding: 4px 6px; vertical-align: top; }
        th { background: #f1f5f9; font-weight: bold; color: #475569; text-align: center; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .badge { padding: 2px 5px; border-radius: 3px; font-size: 8px; font-weight: bold; }
        .tipo-entrada { background: #dcfce7; color: #166534; }
        .tipo-salida  { background: #fee2e2; color: #991b1b; }
        .tipo-transf  { background: #dbeafe; color: #1e40af; }
        .tipo-otro    { background: #f3f4f6; color: #374151; }
        .estado-completado { background: #dcfce7; color: #166534; }
        .estado-anulado    { background: #fee2e2; color: #991b1b; }
        .estado-pendiente  { background: #fef3c7; color: #92400e; }
        .estado-borrador   { background: #f3f4f6; color: #6b7280; }
        .footer { margin-top: 12px; font-size: 8px; color: #999; text-align: right; }
        .small { font-size: 8px; color: #6b7280; }
    </style>
@endsection

@section('content')
    <div class="header">
        <div class="title">REGISTRO DE MOVIMIENTOS — ALMACÉN</div>
        <div class="subtitle">Generado el {{ now()->format('d/m/Y H:i') }} por {{ $usuario }}</div>
    </div>

    @if(!empty($filtros))
    <div class="meta">
        Filtros aplicados:
        @if(!empty($filtros['tipo'])) Tipo: {{ str_replace('_', ' ', $filtros['tipo']) }} &nbsp;|&nbsp; @endif
        @if(!empty($filtros['estado'])) Estado: {{ $filtros['estado'] }} &nbsp;|&nbsp; @endif
        @if(!empty($filtros['fecha_desde'])) Desde: {{ $filtros['fecha_desde'] }} @endif
        @if(!empty($filtros['fecha_hasta'])) Hasta: {{ $filtros['fecha_hasta'] }} @endif
    </div>
    @endif

    <table>
        <thead>
            <tr>
                <th>Código</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Almacén</th>
                <th>Proveedor / Receptor</th>
                <th>Materiales</th>
                <th class="text-right">Total Bs.</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            @forelse($movimientos as $mov)
            @php
                $esEntrada = str_starts_with($mov->tipo, 'entrada');
                $esTransf  = str_contains($mov->tipo, 'transferencia');
                $tipoCls   = $esEntrada ? 'tipo-entrada' : ($esTransf ? 'tipo-transf' : 'tipo-salida');
                $estadoCls = match($mov->estado) {
                    'completado' => 'estado-completado',
                    'anulado'    => 'estado-anulado',
                    'pendiente'  => 'estado-pendiente',
                    default      => 'estado-borrador',
                };
                $almacenNombre = $esEntrada
                    ? ($mov->almacenDestino?->nombre ?? '—')
                    : ($mov->almacenOrigen?->nombre ?? '—');
                $total = $mov->detalles->sum(fn($d) => $d->cantidad * $d->precio_unitario);
            @endphp
            <tr>
                <td>{{ $mov->codigo }}</td>
                <td class="text-center">{{ \Carbon\Carbon::parse($mov->fecha_movimiento)->format('d/m/Y') }}</td>
                <td><span class="badge {{ $tipoCls }}">{{ str_replace('_', ' ', $mov->tipo) }}</span></td>
                <td>{{ $almacenNombre }}</td>
                <td>
                    {{ $mov->proveedor_nombre ?? $mov->receptor_nombre ?? '—' }}
                    @if($mov->numero_factura)<br><span class="small">F: {{ $mov->numero_factura }}</span>@endif
                </td>
                <td>
                    @foreach($mov->detalles->take(3) as $det)
                        {{ $det->material?->nombre ?? '?' }} × {{ number_format($det->cantidad, 2) }}<br>
                    @endforeach
                    @if($mov->detalles->count() > 3)
                        <span class="small">+{{ $mov->detalles->count() - 3 }} más</span>
                    @endif
                </td>
                <td class="text-right">{{ $total > 0 ? number_format($total, 2) : '—' }}</td>
                <td class="text-center"><span class="badge {{ $estadoCls }}">{{ $mov->estado }}</span></td>
            </tr>
            @empty
            <tr>
                <td colspan="8" class="text-center" style="color:#999; padding: 20px;">Sin movimientos registrados.</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    
@endsection
