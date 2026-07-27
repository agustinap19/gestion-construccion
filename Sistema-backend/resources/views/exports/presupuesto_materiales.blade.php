@extends('exports.layout_membrete')

@section('styles')
<style>
    body { font-size: 9px; }
    td.text-right  { text-align: right; }
    td.text-center { text-align: center; }
    tfoot td { font-weight: bold; background: #f8fafc; }
</style>
@endsection

@section('content')
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Presupuesto de Materiales</div>
        <div class="reporte-sub">Proyecto: {{ $proyecto->nombre }} ({{ $proyecto->codigo }})</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado: {{ now()->format('d/m/Y H:i') }}</div>
    </div>
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
