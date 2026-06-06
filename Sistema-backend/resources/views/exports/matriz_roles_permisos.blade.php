<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8">
@include('exports._base_styles')
<style>
    .matrix-table th { font-size: 8px; padding: 4px 5px; }
    .matrix-table td { font-size: 8px; padding: 3px 5px; text-align: center; }
    .matrix-table td.modulo { text-align: left; font-weight: bold; color: #1e3a5f; }
    .check-yes { color: #059669; font-weight: bold; font-size: 11px; }
    .check-no  { color: #e2e8f0; }
    .rol-header { background: #1e3a5f; color: #fff; max-width: 60px; overflow: hidden; }
</style>
</head>
<body>
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Matriz de Roles y Permisos</div>
        <div class="reporte-sub">Control de acceso por módulo y acción</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado el {{ now()->format('d/m/Y H:i') }}</div>
        <div class="reporte-sub">Por: {{ $usuario }}</div>
    </div>
</div>

@foreach($grupos as $modulo => $permisosDel)
<div class="section-title">{{ ucfirst(str_replace('_', ' ', $modulo)) }}</div>
<table class="matrix-table">
    <thead>
        <tr>
            <th style="text-align:left; min-width:120px">Acción / Permiso</th>
            @foreach($roles as $rol)
            <th class="rol-header">{{ $rol->nombre_visible }}</th>
            @endforeach
        </tr>
    </thead>
    <tbody>
        @foreach($permisosDel as $permiso)
        <tr>
            <td class="modulo">{{ ucfirst(str_replace(['_', '.'], ' ', $permiso->nombre)) }}</td>
            @foreach($roles as $rol)
            @php $tiene = $rolPermisos[$rol->id][$permiso->id] ?? false; @endphp
            <td>
                @if($tiene)
                    <span class="check-yes">✓</span>
                @else
                    <span class="check-no">·</span>
                @endif
            </td>
            @endforeach
        </tr>
        @endforeach
    </tbody>
</table>
@endforeach

<div class="footer">
    <div class="footer-left">CA &amp; KANAGF S.R.L. — Sistema ERP Construcción</div>
    <div class="footer-right">{{ $roles->count() }} roles · {{ $totalPermisos ?? 0 }} permisos — {{ now()->format('d/m/Y') }}</div>
</div>
</body>
</html>
