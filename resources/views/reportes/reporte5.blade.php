@extends('reportes.layout')

@section('title', 'Reporte de Usuarios y Permisos')

@section('content')
    @foreach($data as $usuario)
        <div class="group-header">
            Usuario: {{ $usuario->nombre }} {{ $usuario->apellido_paterno }} | Email: {{ $usuario->email }} | Rol: {{ $usuario->rol ? $usuario->rol->nombre_visible : 'Sin Rol' }}
        </div>
        @if($usuario->rol && $usuario->rol->permisos->count() > 0)
            <table>
                <thead>
                    <tr>
                        <th>Módulo</th>
                        <th>Acción</th>
                        <th>Código Permiso</th>
                        <th>Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    @php
                        // Agrupar permisos por módulo
                        $permisosAgrupados = $usuario->rol->permisos->groupBy('modulo');
                    @endphp
                    
                    @foreach($permisosAgrupados as $modulo => $permisos)
                        @foreach($permisos as $permiso)
                            <tr>
                                @if($loop->first)
                                    <td rowspan="{{ count($permisos) }}" style="font-weight: bold; background-color: #f1f5f9;">{{ ucfirst($modulo) }}</td>
                                @endif
                                <td>{{ ucfirst($permiso->accion) }}</td>
                                <td>{{ $permiso->codigo }}</td>
                                <td>{{ $permiso->descripcion }}</td>
                            </tr>
                        @endforeach
                    @endforeach
                </tbody>
            </table>
        @else
            <p style="padding: 10px; color: #666; font-style: italic;">Este usuario no tiene permisos asignados o no tiene un rol válido.</p>
        @endif
    @endforeach
@endsection
