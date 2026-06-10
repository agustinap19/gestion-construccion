@extends('exports.layout_membrete')

@section('content')
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Lista de Usuarios</div>
        <div class="reporte-sub">Usuarios registrados en el sistema</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado el {{ now()->format('d/m/Y H:i') }}</div>
        <div class="reporte-sub">Por: {{ $usuario }}</div>
    </div>
</div>

<div class="kpi-row">
    <div class="kpi-cell">
        <div class="kpi-val">{{ $usuarios->count() }}</div>
        <div class="kpi-label">Total Usuarios</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $usuarios->where('estado','activo')->count() }}</div>
        <div class="kpi-label">Activos</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $usuarios->where('es_admin_central',true)->count() }}</div>
        <div class="kpi-label">Admins</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $usuarios->whereNotNull('tiene_2fa')->where('tiene_2fa',true)->count() }}</div>
        <div class="kpi-label">Con 2FA</div>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th>Nombre Completo</th>
            <th>C.I.</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th style="text-align:center">2FA</th>
            <th style="text-align:center">Admin</th>
            <th>Registro</th>
        </tr>
    </thead>
    <tbody>
        @foreach($usuarios as $u)
        @php $badge = $u->estado === 'activo' ? 'badge-ok' : ($u->estado === 'suspendido' ? 'badge-warn' : 'badge-gray'); @endphp
        <tr>
            <td><strong>{{ $u->nombre }} {{ $u->apellido_paterno }}</strong></td>
            <td>{{ $u->ci }}</td>
            <td style="font-size:9.5px">{{ $u->email }}</td>
            <td>{{ $u->rol?->nombre_visible ?? '—' }}</td>
            <td><span class="badge {{ $badge }}">{{ ucfirst($u->estado) }}</span></td>
            <td style="text-align:center">{{ $u->tiene_2fa ? '✓' : '—' }}</td>
            <td style="text-align:center">{{ $u->es_admin_central ? '✓' : '—' }}</td>
            <td style="font-size:9.5px">{{ \Carbon\Carbon::parse($u->created_at)->format('d/m/Y') }}</td>
        </tr>
        @endforeach
    </tbody>
</table>


    
@endsection
