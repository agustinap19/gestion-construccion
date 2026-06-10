<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Historial Sincronización Tipología</title>
@include('exports._base_styles')
<style>
    .seccion-titulo { font-size: 11px; font-weight: bold; color: #1e3a5f; background: #eff6ff; border-left: 3px solid #3b82f6; padding: 5px 8px; margin: 12px 0 4px 0; }
    .entry-header { background: #f1f5f9; padding: 6px 10px; border-radius: 3px; margin-top: 10px; }
    .entry-meta { font-size: 9px; color: #64748b; margin-top: 2px; }
    .badge-completado { background: #d1fae5; color: #065f46; }
    .badge-parcial    { background: #fef3c7; color: #92400e; }
    .badge-auto       { background: #dbeafe; color: #1e40af; }
    .badge-manual     { background: #ede9fe; color: #6d28d9; }
    .tipo-agregar   { color: #059669; font-weight: bold; }
    .tipo-actualizar{ color: #2563eb; font-weight: bold; }
    .tipo-conflicto { color: #d97706; font-weight: bold; }
    .tipo-eliminar  { color: #dc2626; font-weight: bold; }
    .tipo-retener   { color: #6b7280; font-weight: bold; }
    .page-break { page-break-after: always; }
</style>
</head>
<body>

<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">Constructora CA &amp; KANAGF</div>
        <div class="reporte-titulo">Historial de Sincronización de Tipología</div>
        <div class="reporte-sub">Beneficiario: {{ $beneficiario->codigo_beneficiario }} — {{ $beneficiario->nombre }} {{ $beneficiario->apellido_paterno }} {{ $beneficiario->apellido_paterno }}</div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado: {{ now()->format('d/m/Y H:i') }}</div>
        <div class="reporte-sub">Total registros: {{ count($historial) }}</div>
    </div>
</div>

@if(count($historial) === 0)
    <p style="color:#64748b;text-align:center;padding:30px 0;">Sin registros de sincronización para este beneficiario.</p>
@else
    @foreach($historial as $i => $h)
        <div class="entry-header">
            <span style="font-weight:bold;font-size:11px;">
                {{ $h['tipo_anterior_nombre'] }} → {{ $h['tipo_nuevo_nombre'] }}
            </span>
            <span class="badge badge-{{ $h['estado'] }}">{{ strtoupper($h['estado']) }}</span>
            <span class="badge badge-{{ $h['modo'] }}">{{ strtoupper($h['modo']) }}</span>
            <div class="entry-meta">
                Fecha: {{ \Carbon\Carbon::parse($h['fecha'])->format('d/m/Y H:i') }}
                &nbsp;|&nbsp; Actor: {{ $h['actor_nombre'] }}
            </div>
        </div>

        @php $r = $h['resumen']; @endphp

        @if(!empty($r['agregados']))
        <div class="seccion-titulo tipo-agregar">＋ Ítems Agregados ({{ count($r['agregados']) }})</div>
        <table>
            <thead><tr><th>Código</th><th>Nombre</th><th style="text-align:right">Cantidad</th></tr></thead>
            <tbody>
            @foreach($r['agregados'] as $item)
                <tr>
                    <td>{{ $item['codigo'] }}</td>
                    <td>{{ $item['nombre'] }}</td>
                    <td style="text-align:right">{{ number_format($item['cantidad_nueva'], 2) }}</td>
                </tr>
            @endforeach
            </tbody>
        </table>
        @endif

        @if(!empty($r['actualizados']))
        <div class="seccion-titulo tipo-actualizar">↑ Ítems Actualizados ({{ count($r['actualizados']) }})</div>
        <table>
            <thead><tr><th>Código</th><th>Nombre</th><th style="text-align:right">Anterior</th><th style="text-align:right">Nuevo</th></tr></thead>
            <tbody>
            @foreach($r['actualizados'] as $item)
                <tr>
                    <td>{{ $item['codigo'] }}</td>
                    <td>{{ $item['nombre'] }}</td>
                    <td style="text-align:right">{{ number_format($item['cantidad_actual'], 2) }}</td>
                    <td style="text-align:right">{{ number_format($item['cantidad_final'], 2) }}</td>
                </tr>
            @endforeach
            </tbody>
        </table>
        @endif

        @if(!empty($r['conflictos']))
        <div class="seccion-titulo tipo-conflicto">⚠ Conflictos — Cantidad Retenida ({{ count($r['conflictos']) }})</div>
        <table>
            <thead><tr><th>Código</th><th>Nombre</th><th style="text-align:right">Planificado</th><th style="text-align:right">Solicitado</th><th>Nota</th></tr></thead>
            <tbody>
            @foreach($r['conflictos'] as $item)
                <tr>
                    <td>{{ $item['codigo'] }}</td>
                    <td>{{ $item['nombre'] }}</td>
                    <td style="text-align:right">{{ number_format($item['cantidad_actual'], 2) }}</td>
                    <td style="text-align:right">{{ number_format($item['cantidad_nueva'], 2) }}</td>
                    <td style="font-size:9px;color:#92400e;">{{ $item['nota'] ?? 'Tiene entregas' }}</td>
                </tr>
            @endforeach
            </tbody>
        </table>
        @endif

        @if(!empty($r['eliminados']))
        <div class="seccion-titulo tipo-eliminar">✕ Ítems Eliminados ({{ count($r['eliminados']) }})</div>
        <table>
            <thead><tr><th>Código</th><th>Nombre</th><th style="text-align:right">Cantidad</th></tr></thead>
            <tbody>
            @foreach($r['eliminados'] as $item)
                <tr>
                    <td>{{ $item['codigo'] }}</td>
                    <td>{{ $item['nombre'] }}</td>
                    <td style="text-align:right">{{ number_format($item['cantidad_actual'], 2) }}</td>
                </tr>
            @endforeach
            </tbody>
        </table>
        @endif

        @if(!empty($r['retenidos']))
        <div class="seccion-titulo tipo-retener">⊘ Retenidos — Con Entregas ({{ count($r['retenidos']) }})</div>
        <table>
            <thead><tr><th>Código</th><th>Nombre</th><th style="text-align:right">Cantidad</th></tr></thead>
            <tbody>
            @foreach($r['retenidos'] as $item)
                <tr>
                    <td>{{ $item['codigo'] }}</td>
                    <td>{{ $item['nombre'] }}</td>
                    <td style="text-align:right">{{ number_format($item['cantidad_actual'], 2) }}</td>
                </tr>
            @endforeach
            </tbody>
        </table>
        @endif

        @if(($r['sin_cambio'] ?? 0) > 0)
        <p style="font-size:9px;color:#64748b;margin-top:6px;">Sin cambio: {{ $r['sin_cambio'] }} ítem(s)</p>
        @endif

        @if(!$loop->last)
        <div style="border-bottom:2px dashed #e2e8f0;margin:14px 0;"></div>
        @endif
    @endforeach
@endif

</body>
</html>
