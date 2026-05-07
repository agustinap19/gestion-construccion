@extends('reportes.layout')

@section('title', 'Reporte de Personal y sus Competencias')

@section('content')
    @foreach($data as $personal)
        <div class="group-header">
            {{ $personal->codigo_empleado }} - {{ $personal->nombre }} {{ $personal->apellido_paterno }} {{ $personal->apellido_materno }} | {{ ucfirst($personal->tipo) }}
        </div>
        @if($personal->competencias->count() > 0)
            <table>
                <thead>
                    <tr>
                        <th>Competencia</th>
                        <th>Fecha Emisión</th>
                        <th>Fecha Vencimiento</th>
                        <th>Entidad Emisora</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($personal->competencias as $comp)
                        <tr>
                            <td>{{ $comp->nombre }}</td>
                            <td>{{ $comp->pivot->fecha_emision ? date('d/m/Y', strtotime($comp->pivot->fecha_emision)) : '-' }}</td>
                            <td>{{ $comp->pivot->fecha_vencimiento ? date('d/m/Y', strtotime($comp->pivot->fecha_vencimiento)) : '-' }}</td>
                            <td>{{ $comp->pivot->entidad_emisora ?? '-' }}</td>
                            <td style="{{ $comp->pivot->estado == 'vencida' ? 'color: red;' : 'color: green;' }}">
                                {{ ucfirst($comp->pivot->estado) }}
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <p style="padding: 10px; color: #666; font-style: italic;">Este trabajador no tiene competencias registradas.</p>
        @endif
    @endforeach
@endsection
