<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8">
@include('exports._base_styles')
</head>
<body>
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Lista de Personal</div>
        <div class="reporte-sub">Nómina de empleados registrados</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado el {{ now()->format('d/m/Y H:i') }}</div>
        <div class="reporte-sub">Por: {{ $usuario }}</div>
    </div>
</div>

<div class="kpi-row">
    <div class="kpi-cell">
        <div class="kpi-val">{{ $personal->count() }}</div>
        <div class="kpi-label">Total Empleados</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $personal->where('estado_laboral','activo')->count() }}</div>
        <div class="kpi-label">Activos</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">Bs. {{ number_format($personal->avg('salario_base') ?? 0, 0) }}</div>
        <div class="kpi-label">Salario Promedio</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $personal->whereNotNull('usuario_id')->count() }}</div>
        <div class="kpi-label">Con Usuario</div>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th>Código</th>
            <th>Apellidos y Nombre</th>
            <th>C.I.</th>
            <th>Tipo</th>
            <th>Especialidad</th>
            <th>Estado</th>
            <th style="text-align:right">Salario (Bs.)</th>
            <th>Contratación</th>
        </tr>
    </thead>
    <tbody>
        @foreach($personal as $p)
        @php
            $badge = $p->estado_laboral === 'activo' ? 'badge-ok' : ($p->estado_laboral === 'vacaciones' ? 'badge-warn' : 'badge-gray');
        @endphp
        <tr>
            <td><strong>{{ $p->codigo_empleado }}</strong></td>
            <td>{{ $p->apellido_paterno }} {{ $p->apellido_materno ?? '' }}, {{ $p->nombre }}</td>
            <td>{{ $p->ci }}{{ $p->ci_complemento ? '-'.$p->ci_complemento : '' }}</td>
            <td>{{ ucfirst($p->tipo ?? '—') }}</td>
            <td>{{ $p->especialidad ?? '—' }}</td>
            <td><span class="badge {{ $badge }}">{{ ucfirst($p->estado_laboral) }}</span></td>
            <td style="text-align:right">{{ number_format($p->salario_base ?? 0, 2) }}</td>
            <td>{{ $p->fecha_contratacion ? \Carbon\Carbon::parse($p->fecha_contratacion)->format('d/m/Y') : '—' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<div class="footer">
    <div class="footer-left">CA &amp; KANAGF S.R.L. — Sistema ERP Construcción</div>
    <div class="footer-right">Total: {{ $personal->count() }} empleados</div>
</div>
</body>
</html>
