@extends('exports.layout_membrete_h')

@section('styles')
@php
    use Carbon\Carbon;

    /* ── Colores por índice ──────────────────────────────────────────────── */
    $colores = ['#0891b2','#8b5cf6','#f59e0b','#10b981','#ef4444','#3b82f6','#ec4899','#14b8a6'];

    /* ── Calcular columnas de meses ─────────────────────────────────────── */
    $fInicio  = !empty($gantt['fecha_inicio_proyecto']) ? Carbon::parse($gantt['fecha_inicio_proyecto']) : null;
    $fFin     = !empty($gantt['fecha_fin_proyecto'])    ? Carbon::parse($gantt['fecha_fin_proyecto'])    : null;
    $dTotales = max(1, (int)($gantt['dias_totales'] ?? 1));

    $meses = [];
    if ($fInicio && $fFin) {
        $cur = $fInicio->copy()->startOfMonth();
        while ($cur->lte($fFin)) {
            $mI    = $cur->copy()->max($fInicio);
            $mF    = $cur->copy()->endOfMonth()->min($fFin);
            $dias  = max(1, $mI->diffInDays($mF) + 1);
            $meses[] = ['nombre' => $cur->translatedFormat('M y'), 'width' => round($dias / $dTotales * 100, 2)];
            $cur->addMonth();
        }
    }

    /* ── Calcular días reales de cada item ──────────────────────────────── */
    $items = $gantt['items'] ?? [];
    foreach ($items as &$it) {
        // Días a partir del width% de la duración total
        $it['_dias'] = $dTotales > 0 ? (int)round(($it['width'] / 100) * $dTotales) : 0;
        // Avance: social → porcentaje del contrato, privado → porcentaje_avance
        $it['_avance'] = (float)($it['porcentaje_avance'] ?? $it['porcentaje'] ?? 0);
    }
    unset($it);

    $posHoy = $gantt['pos_hoy'] ?? null;
@endphp
<style>
    body  { font-family: Arial, sans-serif; font-size: 9px; color: #1e293b; }

    /* ─── Gantt ────────────────────────────────────────────────────────── */
    .gt-wrap  { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .gt-name  { width: 22%; font-size: 8.5px; padding: 3px 5px; border: 1px solid #e2e8f0; vertical-align: middle; }
    .gt-bar   { padding: 2px 0; border: 1px solid #e2e8f0; vertical-align: middle; }
    .gt-head  { background: #1e3a5f; color: #ffffff; font-size: 7.5px; text-align: center; padding: 2px 1px; font-weight: bold; border: 1px solid #1e3a5f; vertical-align: middle; }
    .gt-head-name { background: #1e3a5f; color: #ffffff; font-size: 7.5px; padding: 2px 5px; font-weight: bold; border: 1px solid #1e3a5f; }

    /* ─── Tabla resumen (estilo imagen referencia) ───────────────────── */
    .ref-table { width: 100%; border-collapse: collapse; border: 2px solid #1e3a5f; margin-top: 12px; }
    .ref-title { background: #1e3a5f; color: #fff; text-align: center; font-size: 9px;
                 font-weight: bold; padding: 5px; border: 1px solid #1e3a5f; letter-spacing: 0.5px; }
    .ref-th    { background: #e2e8f0; border: 1px solid #1e3a5f; text-align: center;
                 font-size: 8px; font-weight: bold; padding: 4px 3px; color: #1e3a5f; }
    .ref-td    { border: 1px solid #cbd5e1; padding: 4px 5px; font-size: 8px; vertical-align: middle; }
    .ref-total { background: #f1f5f9; font-weight: bold; font-size: 8.5px; }
    .ref-total-main { background: #1e3a5f; color: #fff; font-weight: bold; font-size: 8.5px; text-align: right; padding: 5px; border: 1px solid #1e3a5f; }
    .color-sq  { display: inline-block; width: 10px; height: 10px; border-radius: 2px; vertical-align: middle; margin-right: 4px; }
    .letra     { font-weight: bold; color: #1e3a5f; margin-right: 4px; }

    /* ─── KPIs ──────────────────────────────────────────────────────── */
    .seccion { font-size: 10px; font-weight: bold; color: #1e3a5f; margin: 10px 0 5px;
               border-left: 3px solid #1e3a5f; padding-left: 7px; }
</style>
@endsection

@section('content')

{{-- ─── Cabecera ──────────────────────────────────────────────────────── --}}
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">Cronograma de Ejecución — {{ $proyecto->nombre }}</div>
        <div class="reporte-sub">
            {{ $proyecto->codigo }}
            @if($gantt['fecha_inicio_proyecto'])
                &mdash; {{ \Carbon\Carbon::parse($gantt['fecha_inicio_proyecto'])->format('d/m/Y') }}
                &rarr; {{ \Carbon\Carbon::parse($gantt['fecha_fin_proyecto'])->format('d/m/Y') }}
            @endif
            &mdash; {{ $dTotales }} días calendario
        </div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Avance global: <strong>{{ number_format($avance['global'], 1) }}%</strong></div>
        <div class="reporte-sub">
            Hoy: {{ \Carbon\Carbon::parse($gantt['hoy'])->format('d/m/Y') }}
            &mdash; Día {{ $avance['dias_transcurridos'] }} / {{ $dTotales }}
        </div>
        @if($proyecto->responsable)
        <div class="reporte-sub">Resp.: {{ $proyecto->responsable->nombre }} {{ $proyecto->responsable->apellido_paterno }}</div>
        @endif
    </div>
</div>

{{-- ─── KPIs ─────────────────────────────────────────────────────────── --}}
<div class="kpi-row">
    <div class="kpi-cell">
        <div class="kpi-val">{{ number_format($avance['global'], 1) }}%</div>
        <div class="kpi-label">Avance Global</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $avance['dias_transcurridos'] }}</div>
        <div class="kpi-label">Días Transcurridos</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $dTotales }}</div>
        <div class="kpi-label">Días Totales</div>
    </div>
    @if($avance['porcentaje_plazo'] !== null)
    <div class="kpi-cell" style="{{ $avance['hay_retraso'] ? 'background:#fff5f5;border-color:#fecaca;' : 'background:#f0fdf4;border-color:#bbf7d0;' }}">
        <div class="kpi-val" style="{{ $avance['hay_retraso'] ? 'color:#dc2626;' : 'color:#059669;' }}">
            {{ number_format($avance['porcentaje_plazo'], 1) }}%
        </div>
        <div class="kpi-label">{{ $avance['hay_retraso'] ? 'Retraso de Plazo' : 'Plazo al Día' }}</div>
    </div>
    @endif
    @if($fInicio && $fFin)
    <div class="kpi-cell">
        <div class="kpi-val" style="font-size:11px;">{{ $fInicio->format('d/m/Y') }}</div>
        <div class="kpi-label">Inicio Planificado</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val" style="font-size:11px;">{{ $fFin->format('d/m/Y') }}</div>
        <div class="kpi-label">Fin Planificado</div>
    </div>
    @endif
</div>

{{-- ─── Gantt Visual ──────────────────────────────────────────────────── --}}
<div class="seccion">Cronograma Visual</div>
<table class="gt-wrap">
    {{-- Header: nombres de meses --}}
    <thead>
        <tr>
            <th class="gt-head-name">Producto / Fase</th>
            @foreach($meses as $mes)
            <th class="gt-head" style="width:{{ $mes['width'] }}%">{{ $mes['nombre'] }}</th>
            @endforeach
        </tr>
    </thead>
    <tbody>
        @foreach($items as $idx => $item)
        @php
            $color  = $colores[$idx % count($colores)];
            $left   = (float)($item['left']  ?? 0);
            $width  = (float)($item['width'] ?? 0);
            $resto  = max(0, 100 - $left - $width);
            $avPct  = $item['_avance'];
            $nombre = $item['nombre'];
            $estado = $item['estado'] ?? '';
        @endphp
        <tr>
            <td class="gt-name">
                <table style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="width:8px; padding:0;">
                            <div style="width:8px; height:8px; background:{{ $color }}; border-radius:2px;"></div>
                        </td>
                        <td style="padding:0 4px; font-size:8px; color:#1e293b; font-weight:bold;">{{ $nombre }}</td>
                        <td style="text-align:right; padding:0; font-size:7.5px; color:{{ $avPct >= 100 ? '#059669' : ($avance['hay_retraso'] ? '#d97706' : '#1e3a5f') }}; font-weight:bold; white-space:nowrap;">{{ number_format($avPct, 0) }}%</td>
                    </tr>
                </table>
            </td>
            {{-- Barra visual en el timeline --}}
            <td class="gt-bar" colspan="{{ count($meses) }}" style="padding:3px 0;">
                <table style="width:100%; border-collapse:collapse; height:14px; table-layout:fixed;">
                    <tr>
                        @if($left > 0)
                        <td style="width:{{ $left }}%; background:#f8fafc; padding:0; height:14px;"></td>
                        @endif
                        @if($width > 0)
                        <td style="width:{{ $width }}%; background:{{ $color }}; border-radius:3px; padding:0; height:14px; opacity:0.85;"></td>
                        @endif
                        @if($resto > 0.5)
                        <td style="width:{{ $resto }}%; background:#f8fafc; padding:0; height:14px;"></td>
                        @endif
                    </tr>
                </table>
            </td>
        </tr>
        @endforeach

        {{-- Fila: hoy --}}
        @if($posHoy !== null)
        <tr>
            <td class="gt-name" style="background:#fef9c3; font-size:8px; color:#92400e; font-weight:bold;">
                ● HOY — Día {{ $avance['dias_transcurridos'] }}
            </td>
            <td class="gt-bar" colspan="{{ count($meses) }}" style="padding:2px 0; background:#fef9c3;">
                <table style="width:100%; border-collapse:collapse; height:6px; table-layout:fixed;">
                    <tr>
                        @if($posHoy > 0)
                        <td style="width:{{ $posHoy }}%; background:transparent; padding:0; height:6px;"></td>
                        @endif
                        <td style="width:0.5%; background:#f59e0b; padding:0; height:6px;"></td>
                        @if((100 - $posHoy) > 0.5)
                        <td style="width:{{ max(0, 99.5 - $posHoy) }}%; background:transparent; padding:0; height:6px;"></td>
                        @endif
                    </tr>
                </table>
            </td>
        </tr>
        @endif
    </tbody>
</table>

{{-- ─── Tabla Resumen — estilo imagen de referencia ────────────────────── --}}
<table class="ref-table">
    <thead>
        <tr>
            <td colspan="5" class="ref-title">
                RESUMEN DE PRODUCTOS — CRONOGRAMA {{ strtoupper($proyecto->codigo) }}
            </td>
        </tr>
        <tr>
            <th class="ref-th" style="width:5%">&nbsp;</th>
            <th class="ref-th" style="width:40%; text-align:left; padding-left:8px;">REFERENCIAS</th>
            <th class="ref-th" style="width:20%">INICIO — FIN PLANIFICADO</th>
            <th class="ref-th" style="width:10%">TOTAL DÍAS</th>
            <th class="ref-th" style="width:10%">AVANCE</th>
        </tr>
    </thead>
    <tbody>
        @foreach($items as $idx => $item)
        @php
            $color  = $colores[$idx % count($colores)];
            $letra  = chr(65 + $idx); // A, B, C, D...
            $avPct  = $item['_avance'];
            $dias   = $item['_dias'];

            // Dates
            $fI = $item['fecha_inicio_planificada'] ?? null;
            $fF = $item['fecha_fin_planificada']    ?? $item['fecha_planificada_cobro'] ?? null;
            $fechasStr = ($fI && $fF)
                ? \Carbon\Carbon::parse($fI)->format('d/m/Y') . ' → ' . \Carbon\Carbon::parse($fF)->format('d/m/Y')
                : ($fF ? 'Vence: ' . \Carbon\Carbon::parse($fF)->format('d/m/Y') : '—');

            $estadoLabel = match($item['estado'] ?? '') {
                'completada','cobrado','listo_para_cobro' => 'Completo',
                'en_progreso'   => 'En Progreso',
                'pendiente'     => 'Pendiente',
                'vencida'       => 'Vencido',
                default => ucfirst(str_replace('_',' ',$item['estado'] ?? ''))
            };
        @endphp
        <tr>
            <td class="ref-td" style="text-align:center; padding:4px 2px;">
                <div class="color-sq" style="background:{{ $color }};"></div>
            </td>
            <td class="ref-td">
                <span class="letra">{{ $letra }}.</span>
                {{ $item['nombre'] }}
            </td>
            <td class="ref-td" style="text-align:center; font-size:8px; color:#475569;">{{ $fechasStr }}</td>
            <td class="ref-td" style="text-align:center; font-weight:bold; color:#1e3a5f;">{{ $dias }}</td>
            <td class="ref-td" style="text-align:center; font-weight:bold; color:{{ $avPct >= 100 ? '#059669' : ($avPct > 50 ? '#d97706' : '#dc2626') }};">{{ number_format($avPct, 1) }}%</td>
        </tr>
        @endforeach

        {{-- Total días --}}
        <tr>
            <td colspan="3" class="ref-total" style="text-align:right; padding:5px 10px; border:1px solid #1e3a5f;">
                TOTAL DÍAS CALENDARIO DEL PROYECTO
            </td>
            <td class="ref-total" style="text-align:center; border:1px solid #1e3a5f; font-size:11px; color:#1e3a5f;">
                {{ $dTotales }}
            </td>
            <td class="ref-total" style="text-align:center; border:1px solid #1e3a5f; color:#059669; font-size:11px;">
                {{ number_format($avance['global'], 1) }}%
            </td>
        </tr>

        {{-- Si hay modificatorios de plazo aplicados --}}
        @php
            $ampliaciones = $proyecto->modificatorios->filter(fn($m) => $m->tipo === 'plazo' && $m->estado === 'aplicado');
            $totalAmpliados = $ampliaciones->sum('dias_ampliacion');
        @endphp
        @if($totalAmpliados > 0)
        <tr>
            <td colspan="3" class="ref-total-main">
                TOTAL DÍAS AMPLIADOS (Modificatorios Aprobados)
            </td>
            <td style="background:#fef3c7; border:1px solid #1e3a5f; text-align:center; font-weight:bold; color:#92400e; font-size:11px; padding:5px;">
                +{{ $totalAmpliados }}
            </td>
            <td style="background:#fef3c7; border:1px solid #1e3a5f; text-align:center; font-weight:bold; color:#92400e; font-size:10px; padding:5px;">
                {{ $ampliaciones->count() }} mod.
            </td>
        </tr>
        @foreach($ampliaciones as $amp)
        <tr>
            <td class="ref-td" colspan="2" style="font-size:7.5px; color:#64748b; padding-left:20px;">
                &bull; {{ $amp->numero }} — {{ $amp->motivo }}
            </td>
            <td class="ref-td" style="text-align:center; font-size:7.5px; color:#64748b;">
                {{ optional($amp->fecha_aplicacion)->format('d/m/Y') ?? '—' }}
            </td>
            <td class="ref-td" style="text-align:center; font-weight:bold; color:#d97706;">+{{ $amp->dias_ampliacion }}</td>
            <td class="ref-td" style="text-align:center; font-size:7.5px; color:#64748b;">Aplicado</td>
        </tr>
        @endforeach
        @endif
    </tbody>
</table>

@endsection
