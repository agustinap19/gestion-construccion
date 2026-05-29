@extends('reportes.layouts.oficial')

@section('title', 'Planilla de Entregas por Beneficiario')

@section('content')
    <h2 style="text-align: center; margin-bottom: 20px;">
        PLANILLA DE ENTREGAS DE MATERIALES<br>
        <span style="font-size: 14px; font-weight: normal; color: #475569;">Beneficiario: {{ $beneficiario->nombre }} {{ $beneficiario->apellido_paterno }}</span>
    </h2>

    <div style="margin-bottom: 20px; font-size: 12px;">
        <strong>C.I.:</strong> {{ $beneficiario->ci }} {{ $beneficiario->expedido }} &nbsp;|&nbsp; 
        <strong>Comunidad:</strong> {{ $beneficiario->comunidad }} &nbsp;|&nbsp; 
        <strong>Vivienda:</strong> {{ $beneficiario->vivienda ? $beneficiario->vivienda->codigo : 'N/A' }}
    </div>

    @if($hay_descuadre)
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; margin-bottom: 20px; font-size: 11px; color: #991b1b;">
        <strong>⚠️ ALERTA DE DESCUADRE:</strong> Se han detectado inconsistencias entre las salidas registradas para este beneficiario y el kardex contable del almacén. Por favor, solicite una reconciliación de datos.
    </div>
    @endif

    <table class="table">
        <thead>
            <tr>
                <th style="width: 15%;">Código</th>
                <th style="width: 40%;">Material</th>
                <th class="text-right" style="width: 15%;">Cant. Teórica</th>
                <th class="text-right" style="width: 15%;">Cant. Entregada</th>
                <th class="text-right" style="width: 15%;">Diferencia</th>
                <th class="text-right" style="width: 10%;">%</th>
            </tr>
        </thead>
        <tbody>
            @forelse($materiales as $mat)
                <tr style="{{ $mat['descuadre'] ? 'background-color: #fff1f2;' : '' }}">
                    <td>{{ $mat['codigo'] }}</td>
                    <td>
                        {{ $mat['nombre'] }}
                        @if($mat['descuadre'])
                            <span style="color: #ef4444; font-weight: bold; font-size: 10px; margin-left: 5px;">(Descuadre detectado)</span>
                        @endif
                    </td>
                    <td class="text-right">{{ number_format($mat['teorico'], 2) }}</td>
                    <td class="text-right font-bold">{{ number_format($mat['entregado'], 2) }}</td>
                    <td class="text-right" style="color: {{ $mat['diferencia'] > 0 ? '#ef4444' : ($mat['diferencia'] < 0 ? '#f59e0b' : '#15803d') }}">
                        {{ $mat['diferencia'] > 0 ? '+' : '' }}{{ number_format($mat['diferencia'], 2) }}
                    </td>
                    <td class="text-right" style="color: {{ $mat['porcentaje'] > 100 ? '#ef4444' : '#334155' }}">
                        {{ $mat['porcentaje'] }}%
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" class="text-center" style="padding: 20px;">No hay materiales entregados ni teóricos calculados para este beneficiario.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <table class="signatures">
        <tr>
            <td>
                <div class="signature-line"></div>
                <strong>{{ $beneficiario->nombre }} {{ $beneficiario->apellido_paterno }}</strong><br>
                Firma del Beneficiario / C.I. {{ $beneficiario->ci }}
            </td>
            <td>
                <div class="signature-line"></div>
                <strong>{{ $usuario_emisor->nombre ?? '' }} {{ $usuario_emisor->apellido_paterno ?? '' }}</strong><br>
                Responsable de Proyecto / Almacén
            </td>
        </tr>
    </table>
@endsection
