@extends('exports.layout_membrete')

@section('styles')
    <title>Presupuesto de Materiales</title>
    <style>
        body { font-family: sans-serif; font-size: 9px; color: #333; }
        .header { text-align: center; margin-bottom: 16px; }
        .title { font-size: 15px; font-weight: bold; }
        .subtitle { font-size: 11px; color: #666; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #ddd; padding: 4px 6px; }
        th { background: #f1f5f9; font-weight: bold; color: #475569; text-align: center; }
        td.text-right { text-align: right; }
        td.text-center { text-align: center; }
        tfoot td { font-weight: bold; background: #f8fafc; }
        .footer { margin-top: 12px; font-size: 8px; color: #999; text-align: right; }
    </style>
@endsection

@section('content')
    <div class="header">
        <div class="title">PRESUPUESTO DE MATERIALES</div>
        <div class="subtitle">Proyecto: {{ $proyecto->nombre }} ({{ $proyecto->codigo }})</div>
        <div class="subtitle">Generado el {{ now()->format('d/m/Y H:i') }}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Código</th>
                <th>Material</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th>Cant. Planificada</th>
                <th>P.U. Presupuestado</th>
                <th>Monto Total</th>
                <th>Notas</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $i => $item)
            <tr>
                <td class="text-center">{{ $i + 1 }}</td>
                <td class="text-center">{{ $item->material->codigo }}</td>
                <td>{{ $item->material->nombre }}</td>
                <td class="text-center">{{ $item->material->categoria?->nombre ?? '—' }}</td>
                <td class="text-center">{{ $item->material->unidadMedida?->simbolo ?? '—' }}</td>
                <td class="text-right">{{ number_format($item->cantidad_total_planificada, 2) }}</td>
                <td class="text-right">Bs {{ number_format($item->precio_unitario_presupuestado, 2) }}</td>
                <td class="text-right">Bs {{ number_format($item->cantidad_total_planificada * $item->precio_unitario_presupuestado, 2) }}</td>
                <td>{{ $item->notas ?? '' }}</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="7" class="text-right">TOTAL PRESUPUESTADO:</td>
                <td class="text-right">Bs {{ number_format($items->sum(fn($i) => $i->cantidad_total_planificada * $i->precio_unitario_presupuestado), 2) }}</td>
                <td></td>
            </tr>
        </tfoot>
    </table>

    
@endsection
