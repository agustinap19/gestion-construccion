@extends('reportes.layout')

@section('title', 'Reporte de Personal y Roles')

@section('content')
    <table>
        <thead>
            <tr>
                <th>Cód. Empleado</th>
                <th>Nombre Completo</th>
                <th>CI</th>
                <th>Tipo</th>
                <th>Email</th>
                <th>Rol en Sistema</th>
                <th>Estado Laboral</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data as $personal)
                <tr>
                    <td>{{ $personal->codigo_empleado }}</td>
                    <td>{{ $personal->nombre }} {{ $personal->apellido_paterno }} {{ $personal->apellido_materno }}</td>
                    <td>{{ $personal->ci }}</td>
                    <td>{{ ucfirst($personal->tipo) }}</td>
                    <td>{{ $personal->usuario ? $personal->usuario->email : 'Sin cuenta' }}</td>
                    <td>
                        @if($personal->usuario && $personal->usuario->rol)
                            {{ $personal->usuario->rol->nombre_visible }}
                        @else
                            N/A
                        @endif
                    </td>
                    <td>{{ ucfirst($personal->estado_laboral) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
