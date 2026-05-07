@extends('reportes.layout')

@section('title', 'Reporte de Competencias y Personal')

@section('content')
    <table>
        <thead>
            <tr>
                <th>Competencia</th>
                <th>Tipo</th>
                <th>Req. Renovación</th>
                <th>Total Personal</th>
                <th>Vigentes</th>
                <th>Vencidas</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data as $competencia)
                @php
                    $vigentes = 0;
                    $vencidas = 0;
                    foreach($competencia->personal as $p) {
                        if($p->pivot->estado == 'vigente') {
                            $vigentes++;
                        } else {
                            $vencidas++;
                        }
                    }
                @endphp
                <tr>
                    <td>{{ $competencia->nombre }}</td>
                    <td>{{ ucfirst($competencia->tipo) }}</td>
                    <td>{{ $competencia->requiere_renovacion ? 'Sí' : 'No' }}</td>
                    <td style="font-weight: bold;">{{ $competencia->personal_count }}</td>
                    <td style="color: green;">{{ $vigentes }}</td>
                    <td style="color: red;">{{ $vencidas }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
