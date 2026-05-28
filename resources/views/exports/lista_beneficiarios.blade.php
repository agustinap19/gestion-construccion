<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 16px; }
    h1 { font-size: 14px; color: #0f172a; margin-bottom: 2px; }
    .subtitle { font-size: 9px; color: #64748b; margin-bottom: 12px; }
    .kpi-row { display: flex; gap: 12px; margin-bottom: 14px; }
    .kpi { padding: 6px 12px; background: #f8fafc; border-radius: 4px; text-align: center; }
    .kpi-val { font-size: 18px; font-weight: bold; color: #059669; }
    .kpi-lbl { font-size: 8px; color: #94a3b8; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; padding: 5px 6px; text-align: left; font-size: 8px; text-transform: uppercase; color: #475569; }
    td { padding: 4px 6px; border-bottom: 1px solid #f1f5f9; font-size: 9px; }
    .badge { display:inline-block; padding: 1px 5px; border-radius:3px; font-size:8px; font-weight:bold; }
    .aceptado { background:#dbeafe; color:#1d4ed8; }
    .en_construccion { background:#fef3c7; color:#92400e; }
    .vivienda_entregada { background:#d1fae5; color:#065f46; }
    .candidato { background:#f1f5f9; color:#475569; }
    .retirado { background:#fed7aa; color:#9a3412; }
    .rechazado { background:#fee2e2; color:#991b1b; }
    .footer { margin-top: 16px; font-size: 8px; color: #94a3b8; text-align: right; }
</style>
</head>
<body>
<h1>{{ $proyecto->nombre }} — Lista de Beneficiarios</h1>
<div class="subtitle">{{ $proyecto->codigo }} &mdash; Generado: {{ now()->format('d/m/Y H:i') }}</div>

<div class="kpi-row">
    <div class="kpi"><div class="kpi-val">{{ $stats['total'] }}</div><div class="kpi-lbl">Total</div></div>
    <div class="kpi"><div class="kpi-val">{{ $stats['por_estado']['aceptado'] ?? 0 }}</div><div class="kpi-lbl">Aceptados</div></div>
    <div class="kpi"><div class="kpi-val">{{ $stats['por_estado']['en_construccion'] ?? 0 }}</div><div class="kpi-lbl">En Construcción</div></div>
    <div class="kpi"><div class="kpi-val">{{ $stats['por_estado']['vivienda_entregada'] ?? 0 }}</div><div class="kpi-lbl">Entregadas</div></div>
</div>

<table>
    <thead>
        <tr>
            <th>Código</th>
            <th>Nombre Completo</th>
            <th>CI</th>
            <th>Comunidad</th>
            <th>Tipología</th>
            <th>Vivienda</th>
            <th>Estado</th>
        </tr>
    </thead>
    <tbody>
        @foreach($beneficiarios as $b)
        <tr>
            <td>{{ $b->codigo_beneficiario }}</td>
            <td>{{ $b->nombre }} {{ $b->apellido_paterno }}{{ $b->apellido_materno ? ' '.$b->apellido_materno : '' }}</td>
            <td>{{ $b->ci }}{{ $b->ci_complemento ? '-'.$b->ci_complemento : '' }}</td>
            <td>{{ $b->comunidad ?? '—' }}</td>
            <td>{{ $b->tipoVivienda?->nombre ?? '—' }}</td>
            <td>{{ $b->vivienda?->codigo ?? '—' }}</td>
            <td><span class="badge {{ $b->estado_seleccion }}">{{ ucfirst(str_replace('_', ' ', $b->estado_seleccion)) }}</span></td>
        </tr>
        @endforeach
    </tbody>
</table>
<div class="footer">CA &amp; KANAGF S.R.L. &mdash; Sistema ERP</div>
</body>
</html>
