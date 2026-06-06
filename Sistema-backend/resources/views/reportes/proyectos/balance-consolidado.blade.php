@extends('reportes.layouts.oficial')

@section('title', 'Balance Consolidado del Proyecto')

@section('content')
    <h2 style="text-align: center; margin-bottom: 20px;">
        BALANCE CONSOLIDADO DE MATERIALES<br>
        <span style="font-size: 14px; font-weight: normal; color: #475569;">Proyecto: {{ $proyecto->nombre }}</span>
    </h2>

    <div style="display: table; width: 100%; margin-bottom: 20px;">
        <div style="display: table-cell; width: 33%; padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Presupuestado vs Comprado</div>
            <div style="font-size: 14px; font-weight: bold; margin-top: 5px;">Bs. {{ number_format($stats['total_comprado'], 2) }} / Bs. {{ number_format($stats['total_presupuestado'], 2) }}</div>
        </div>
        <div style="display: table-cell; width: 33%; padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Total Entregado a Obra</div>
            <div style="font-size: 14px; font-weight: bold; margin-top: 5px;">Bs. {{ number_format($stats['total_entregado'], 2) }}</div>
        </div>
        <div style="display: table-cell; width: 33%; padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
            <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Indicadores de Salud</div>
            <div style="font-size: 11px; margin-top: 5px;">
                <span style="color: #ef4444; font-weight: bold;">● {{ $stats['sobre_consumos'] }}</span> Sobre-consumos<br>
                <span style="color: #f59e0b; font-weight: bold;">● {{ $stats['sub_consumos'] }}</span> Sub-consumos
            </div>
        </div>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th style="width: 10%;">Código</th>
                <th style="width: 30%;">Material</th>
                <th class="text-right">Planificado</th>
                <th class="text-right">Comprado</th>
                <th class="text-right">En Almacén</th>
                <th class="text-right">Devuelto Central</th>
                <th class="text-right">Entregado Obra</th>
                <th class="text-right">Saldo Operativo</th>
            </tr>
        </thead>
        <tbody>
            @forelse($materiales as $mat)
                @php
                    $bgColor = '';
                    if ($mat['estado_salud'] === 'sobre_consumo') $bgColor = '#fef2f2'; // Rojo claro
                    if ($mat['estado_salud'] === 'sub_consumo') $bgColor = '#fffbeb'; // Amarillo claro
                @endphp
                <tr style="background-color: {{ $bgColor }};">
                    <td>{{ $mat['codigo'] }}</td>
                    <td>
                        {{ $mat['nombre'] }}
                        @if(!$mat['identidad_ok'])
                            <span style="color: #ef4444; font-weight: bold; font-size: 10px; margin-left: 5px;">(⚠ Desfase: {{ $mat['desfase'] }})</span>
                        @endif
                    </td>
                    <td class="text-right">{{ number_format($mat['planificado'], 2) }}</td>
                    <td class="text-right">{{ number_format($mat['comprado'], 2) }}</td>
                    <td class="text-right">{{ number_format($mat['en_almacen'], 2) }}</td>
                    <td class="text-right">{{ number_format($mat['devuelto'], 2) }}</td>
                    <td class="text-right">{{ number_format($mat['entregado'], 2) }}</td>
                    <td class="text-right font-bold">{{ number_format($mat['saldo'], 2) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" class="text-center" style="padding: 20px;">No hay datos en el presupuesto de materiales para los filtros aplicados.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <table class="signatures">
        <tr>
            <td>
                <div class="signature-line"></div>
                <strong>Residente de Obra</strong><br>
                Firma y Sello
            </td>
            <td>
                <div class="signature-line"></div>
                <strong>Gerencia Técnica</strong><br>
                Aprobación Final
            </td>
        </tr>
    </table>
@endsection
