@extends('reportes.layout')

@section('title', 'Reporte de Planillas de Pago')

@section('content')
    @foreach($data as $planilla)
        <div class="group-header">
            Planilla: {{ date('d/m/Y', strtotime($planilla->periodo_inicio)) }} al {{ date('d/m/Y', strtotime($planilla->periodo_fin)) }} | 
            Tipo: {{ ucfirst($planilla->tipo) }} | Estado: {{ ucfirst($planilla->estado) }}
        </div>
        <table>
            <thead>
                <tr>
                    <th>Trabajador</th>
                    <th>Días Trab.</th>
                    <th>Horas Extras</th>
                    <th>Bonos (Bs)</th>
                    <th>Descuentos (Bs)</th>
                    <th>Monto Bruto (Bs)</th>
                    <th>Monto Neto (Bs)</th>
                </tr>
            </thead>
            <tbody>
                @foreach($planilla->detalles as $detalle)
                    <tr>
                        <td>
                            @if($detalle->personal)
                                {{ $detalle->personal->nombre }} {{ $detalle->personal->apellido_paterno }}
                            @else
                                ID: {{ $detalle->personal_id }}
                            @endif
                        </td>
                        <td>{{ $detalle->dias_trabajados }}</td>
                        <td>{{ $detalle->horas_extras }}</td>
                        <td>{{ number_format($detalle->bonos, 2) }}</td>
                        <td>{{ number_format($detalle->descuentos, 2) }}</td>
                        <td>{{ number_format($detalle->monto_bruto, 2) }}</td>
                        <td>{{ number_format($detalle->monto_neto, 2) }}</td>
                    </tr>
                @endforeach
                <tr>
                    <td colspan="6" style="text-align: right; font-weight: bold;">TOTAL PLANILLA:</td>
                    <td style="font-weight: bold;">{{ number_format($planilla->monto_total, 2) }}</td>
                </tr>
            </tbody>
        </table>
    @endforeach
@endsection
