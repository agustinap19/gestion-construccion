<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 20px; }
    h1 { font-size: 16px; color: #0f172a; margin-bottom: 4px; }
    .subtitle { font-size: 10px; color: #64748b; margin-bottom: 16px; }
    .header-grid { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    .kpi { text-align: center; padding: 8px 16px; background: #f8fafc; border-radius: 6px; }
    .kpi-val { font-size: 22px; font-weight: bold; color: #059669; }
    .kpi-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #475569; }
    td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; }
    .badge-ok { background: #d1fae5; color: #065f46; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .badge-pending { background: #f1f5f9; color: #475569; }
    .prog-wrap { background: #e2e8f0; border-radius: 3px; height: 8px; width: 100%; }
    .prog-fill { background: #059669; border-radius: 3px; height: 8px; }
    .footer { margin-top: 24px; font-size: 9px; color: #94a3b8; text-align: right; }
</style>
</head>
<body>
<h1>{{ $proyecto->nombre }}</h1>
<div class="subtitle">
    {{ $proyecto->codigo }} &mdash; Estado: {{ ucfirst(str_replace('_', ' ', $proyecto->estado)) }}
    &mdash; Generado: {{ now()->format('d/m/Y H:i') }}
</div>

<div class="header-grid">
    <div class="kpi">
        <div class="kpi-val">{{ number_format($avance['global'], 1) }}%</div>
        <div class="kpi-label">Avance Global</div>
    </div>
    <div class="kpi">
        <div class="kpi-val">{{ $avance['dias_transcurridos'] }}</div>
        <div class="kpi-label">Días Transcurridos</div>
    </div>
    <div class="kpi">
        <div class="kpi-val">{{ $avance['dias_totales'] ?? '—' }}</div>
        <div class="kpi-label">Días Totales</div>
    </div>
    <div class="kpi">
        <div class="kpi-val">{{ $avance['unidades_completadas'] }}/{{ $avance['total_unidades'] }}</div>
        <div class="kpi-label">Unidades Completadas</div>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th>Unidad</th>
            <th>Estado</th>
            <th style="width:120px">Avance</th>
            <th>Checklist</th>
        </tr>
    </thead>
    <tbody>
        @foreach($unidades as $u)
        <tr>
            <td>{{ $u['nombre'] }}</td>
            <td>
                @if($u['estado'] === 'completada' || $u['estado'] === 'entregada')
                    <span class="badge badge-ok">{{ ucfirst($u['estado']) }}</span>
                @elseif(in_array($u['estado'], ['en_progreso', 'obra_gruesa', 'obra_fina', 'acabados']))
                    <span class="badge badge-warn">{{ ucfirst(str_replace('_', ' ', $u['estado'])) }}</span>
                @else
                    <span class="badge badge-pending">{{ ucfirst(str_replace('_', ' ', $u['estado'])) }}</span>
                @endif
            </td>
            <td>
                <div class="prog-wrap">
                    <div class="prog-fill" style="width: {{ min(100, $u['porcentaje_avance']) }}%"></div>
                </div>
                <span style="font-size:9px;color:#64748b">{{ number_format($u['porcentaje_avance'], 1) }}%</span>
            </td>
            <td>{{ $u['checklist_completados'] }}/{{ $u['checklist_total'] }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<div class="footer">CA &amp; KANAGF S.R.L. &mdash; Sistema ERP &mdash; Planilla de Avance (borrador — Sub-fase E)</div>
</body>
</html>
