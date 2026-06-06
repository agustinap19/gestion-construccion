<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8">
@include('exports._base_styles')
<style>
    .timeline-row { border-left: 3px solid #cbd5e1; padding-left: 12px; margin-bottom: 14px; margin-left: 6px; }
    .timeline-row.created  { border-left-color: #059669; }
    .timeline-row.updated  { border-left-color: #3b82f6; }
    .timeline-row.deleted  { border-left-color: #ef4444; }
    .timeline-row.restored { border-left-color: #f59e0b; }
    .event-header { display: table; width: 100%; }
    .event-action { display: table-cell; font-size: 11px; font-weight: bold; vertical-align: middle; }
    .event-time   { display: table-cell; text-align: right; font-size: 9px; color: #64748b; vertical-align: middle; white-space: nowrap; }
    .event-user   { font-size: 9.5px; color: #64748b; margin: 2px 0 4px 0; }
    .diff-table   { width: 100%; border-collapse: collapse; margin-top: 5px; }
    .diff-table th { padding: 3px 6px; font-size: 8.5px; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; text-transform: uppercase; }
    .diff-table td { padding: 3px 6px; font-size: 9px; border: 1px solid #e2e8f0; }
    .diff-field   { color: #475569; font-weight: bold; background: #f8fafc; width: 28%; }
    .diff-old     { color: #991b1b; background: #fff5f5; width: 36%; }
    .diff-new     { color: #065f46; background: #f0fdf4; width: 36%; }
    .badge-created  { background: #d1fae5; color: #065f46; }
    .badge-updated  { background: #dbeafe; color: #1e40af; }
    .badge-deleted  { background: #fee2e2; color: #991b1b; }
    .badge-restored { background: #fef3c7; color: #92400e; }
    .periodo-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 4px; padding: 6px 12px; margin-bottom: 14px; font-size: 10px; color: #0369a1; }
</style>
</head>
<body>

<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Auditoría — {{ $etiquetaTipo }}</div>
        <div class="reporte-sub">{{ $nombreEntidad }}</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado el {{ now()->format('d/m/Y H:i') }}</div>
        <div class="reporte-sub">Por: {{ $usuario }}</div>
    </div>
</div>

<div class="kpi-row">
    <div class="kpi-cell">
        <div class="kpi-val">{{ $audits->count() }}</div>
        <div class="kpi-label">Total Registros</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $audits->where('event', 'created')->count() }}</div>
        <div class="kpi-label">Creaciones</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $audits->where('event', 'updated')->count() }}</div>
        <div class="kpi-label">Modificaciones</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $audits->whereIn('event', ['deleted', 'restored'])->count() }}</div>
        <div class="kpi-label">Eliminaciones / Restores</div>
    </div>
</div>

@if($desde || $hasta)
<div class="periodo-box">
    <strong>Período filtrado:</strong>
    {{ $desde ? \Carbon\Carbon::parse($desde)->format('d/m/Y') : 'Inicio del registro' }}
    &nbsp;→&nbsp;
    {{ $hasta ? \Carbon\Carbon::parse($hasta)->format('d/m/Y') : 'Hoy' }}
</div>
@endif

@forelse($audits as $audit)
@php
    $ev = $audit->event ?? 'updated';
    $etiquetas = [
        'created'  => 'Creó el registro',
        'updated'  => 'Modificó el registro',
        'deleted'  => 'Eliminó el registro',
        'restored' => 'Restauró el registro',
    ];
    $etiquetaEv = $etiquetas[$ev] ?? ucfirst($ev);

    $newVals = $audit->new_values ?? [];
    $oldVals = $audit->old_values ?? [];

    $camposModificados = $ev === 'updated'
        ? collect(array_keys($newVals))->filter(
            fn($k) => json_encode($oldVals[$k] ?? null) !== json_encode($newVals[$k] ?? null)
          )->values()
        : collect();

    $usr = $audit->user;
    $nombreUsr = $usr
        ? (trim(($usr->nombre ?? '') . ' ' . ($usr->apellido_paterno ?? '')) ?: ($usr->email ?? 'Sistema'))
        : 'Sistema';

    $labelsC = [
        'nombre'             => 'Nombre',
        'apellido_paterno'   => 'Ap. Paterno',
        'apellido_materno'   => 'Ap. Materno',
        'email'              => 'Email',
        'telefono'           => 'Teléfono',
        'estado'             => 'Estado',
        'rol_id'             => 'Rol',
        'ci'                 => 'CI',
        'fecha_nacimiento'   => 'F. Nacimiento',
        'salario_base'       => 'Salario base',
        'estado_laboral'     => 'Estado laboral',
        'tipo_contrato'      => 'Tipo contrato',
        'especialidad'       => 'Especialidad',
        'categoria'          => 'Categoría',
        'frecuencia_pago'    => 'Frec. pago',
        'banco'              => 'Banco',
        'numero_cuenta'      => 'N° cuenta',
        'debe_cambiar_password' => 'Debe cambiar contraseña',
        'intentos_fallidos'  => 'Intentos fallidos',
    ];

    $formatVal = fn($v) => $v === null ? '—' : (is_bool($v) ? ($v ? 'Sí' : 'No') : (string) $v);
@endphp
<div class="timeline-row {{ $ev }}">
    <div class="event-header">
        <div class="event-action">
            <span class="badge badge-{{ $ev }}">{{ strtoupper($ev) }}</span>
            &nbsp;{{ $etiquetaEv }}
            @if($ev === 'updated' && $camposModificados->count() > 0)
                — {{ $camposModificados->count() }} campo{{ $camposModificados->count() > 1 ? 's' : '' }} modificado{{ $camposModificados->count() > 1 ? 's' : '' }}
            @endif
        </div>
        <div class="event-time">{{ \Carbon\Carbon::parse($audit->created_at)->format('d/m/Y H:i') }}</div>
    </div>
    <div class="event-user">
        Por: {{ $nombreUsr }}
        @if($audit->ip_address) &nbsp;· IP: {{ $audit->ip_address }} @endif
    </div>

    @if($ev === 'updated' && $camposModificados->count() > 0)
    <table class="diff-table">
        <thead>
            <tr>
                <th class="diff-field">Campo</th>
                <th>Valor anterior</th>
                <th>Valor nuevo</th>
            </tr>
        </thead>
        <tbody>
            @foreach($camposModificados as $campo)
            <tr>
                <td class="diff-field">{{ $labelsC[$campo] ?? $campo }}</td>
                <td class="diff-old">{{ $formatVal($oldVals[$campo] ?? null) }}</td>
                <td class="diff-new">{{ $formatVal($newVals[$campo] ?? null) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    @if($ev === 'created' && count($newVals) > 0)
    <div style="font-size:9px;color:#475569;margin-top:3px;">
        Registro creado con {{ count($newVals) }} campo{{ count($newVals) > 1 ? 's' : '' }}.
    </div>
    @endif
</div>
@empty
<p style="color:#64748b;text-align:center;padding:32px 0;font-size:11px;">
    No hay registros de auditoría en este período.
</p>
@endforelse

<div class="footer">
    <div class="footer-left">CA &amp; KANAGF S.R.L. — Sistema ERP Construcción</div>
    <div class="footer-right">{{ $audits->count() }} registro{{ $audits->count() !== 1 ? 's' : '' }}</div>
</div>

</body>
</html>
