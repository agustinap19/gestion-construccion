<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8">
@include('exports._base_styles')
</head>
<body>
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Lista de Proyectos</div>
        <div class="reporte-sub">{{ $subtitulo ?? 'Listado completo' }}</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado el {{ now()->format('d/m/Y H:i') }}</div>
        <div class="reporte-sub">Por: {{ $usuario }}</div>
    </div>
</div>

<div class="kpi-row">
    <div class="kpi-cell">
        <div class="kpi-val">{{ $proyectos->count() }}</div>
        <div class="kpi-label">Total Proyectos</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $proyectos->where('estado', 'en_ejecucion')->count() }}</div>
        <div class="kpi-label">En Ejecución</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $proyectos->where('categoria', 'social')->count() }}</div>
        <div class="kpi-label">Sociales</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">Bs. {{ number_format($proyectos->sum('presupuesto_referencial'), 0, '.', ',') }}</div>
        <div class="kpi-label">Presupuesto Total</div>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th>Código</th>
            <th>Nombre del Proyecto</th>
            <th>Categoría</th>
            <th>Estado</th>
            <th>Responsable</th>
            <th>Presupuesto (Bs.)</th>
            <th style="text-align:center">Avance</th>
            <th>Fin Planificado</th>
        </tr>
    </thead>
    <tbody>
        @foreach($proyectos as $p)
        @php
            $avance = floatval($p->avance_fisico ?? 0);
            $badgeColor = 'badge-gray';
            if ($p->estado === 'en_ejecucion') $badgeColor = 'badge-ok';
            elseif ($p->estado === 'finalizado') $badgeColor = 'badge-blue';
            elseif ($p->estado === 'cancelado') $badgeColor = 'badge-danger';
            elseif (in_array($p->estado, ['formulacion','licitacion'])) $badgeColor = 'badge-purple';
            $contraparte = $p->categoria === 'social'
                ? ($p->entidadEstatal->nombre ?? '—')
                : ($p->cliente->nombre_completo ?? $p->cliente->nombre_visible ?? '—');
        @endphp
        <tr>
            <td><strong>{{ $p->codigo }}</strong></td>
            <td>{{ $p->nombre }}</td>
            <td>{{ ucfirst($p->categoria) }}</td>
            <td><span class="badge {{ $badgeColor }}">{{ ucfirst(str_replace('_', ' ', $p->estado)) }}</span></td>
            <td>{{ $p->responsable ? $p->responsable->nombre . ' ' . $p->responsable->apellido_paterno : '—' }}</td>
            <td style="text-align:right">{{ $p->presupuesto_referencial ? number_format($p->presupuesto_referencial, 0, '.', ',') : '—' }}</td>
            <td style="text-align:center; min-width:70px">
                <div class="prog-wrap"><div class="prog-fill" style="width:{{ min(100, $avance) }}%"></div></div>
                <span style="font-size:9px;color:#475569">{{ number_format($avance, 1) }}%</span>
            </td>
            <td>{{ $p->fecha_fin_planificada ? \Carbon\Carbon::parse($p->fecha_fin_planificada)->format('d/m/Y') : '—' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<div class="footer">
    <div class="footer-left">CA &amp; KANAGF S.R.L. — Sistema ERP Construcción</div>
    <div class="footer-right">Total: {{ $proyectos->count() }} proyectos</div>
</div>
</body>
</html>
