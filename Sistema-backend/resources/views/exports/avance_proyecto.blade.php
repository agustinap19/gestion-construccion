@extends('exports.layout_membrete')

@section('styles')
<style>
    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; }
    .badge-ok      { background: #d1fae5; color: #065f46; }
    .badge-warn    { background: #fef3c7; color: #92400e; }
    .badge-pending { background: #f1f5f9; color: #475569; }
    .badge-danger  { background: #fee2e2; color: #991b1b; }
    .badge-gray    { background: #f1f5f9; color: #64748b; }
    .seccion { font-size: 11px; font-weight: bold; color: #1e3a5f; margin: 14px 0 5px; border-left: 3px solid #1e3a5f; padding-left: 8px; }
    /* Barras de gráfico */
    .bar-wrap { background: #e2e8f0; border-radius: 3px; height: 12px; width: 100%; }
    .bar-fill { border-radius: 3px; height: 12px; }
    .bar-green  { background: #059669; }
    .bar-yellow { background: #d97706; }
    .bar-blue   { background: #2563eb; }
    .bar-gray   { background: #94a3b8; }
    /* Barra estándar para tabla detalle */
    .prog-wrap { background: #e2e8f0; border-radius: 3px; height: 7px; width: 100%; }
    .prog-fill { background: #059669; border-radius: 3px; height: 7px; }
    /* Info retraso */
    .txt-ok  { font-size: 8px; color: #059669; }
    .txt-lag { font-size: 8px; color: #dc2626; }
</style>
@endsection

@section('content')

{{-- ─── Cabecera ──────────────────────────────────────────────────────── --}}
<div class="page-header">
    <div class="page-header-left">
        <div class="empresa-nombre">CA &amp; KANAGF S.R.L.</div>
        <div class="reporte-titulo">{{ $proyecto->nombre }}</div>
        <div class="reporte-sub">
            {{ $proyecto->codigo }} &mdash; Estado: {{ ucfirst(str_replace('_', ' ', $proyecto->estado)) }}
            @if($proyecto->entidadEstatal) &mdash; {{ $proyecto->entidadEstatal->nombre }}@endif
        </div>
    </div>
    <div class="page-header-right">
        <div class="reporte-sub">Generado: {{ now()->format('d/m/Y H:i') }}</div>
        @if($proyecto->responsable)
        <div class="reporte-sub">Responsable: {{ $proyecto->responsable->nombre }} {{ $proyecto->responsable->apellido_paterno }}</div>
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
        <div class="kpi-val">{{ $avance['dias_totales'] ?? '—' }}</div>
        <div class="kpi-label">Días Totales</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">{{ $avance['unidades_completadas'] }}/{{ $avance['total_unidades'] }}</div>
        <div class="kpi-label">Unidades Completadas</div>
    </div>
    @if($avance['porcentaje_plazo'] !== null)
    <div class="kpi-cell" style="{{ $avance['hay_retraso'] ? 'background:#fff5f5;border-color:#fecaca;' : 'background:#f0fdf4;border-color:#bbf7d0;' }}">
        <div class="kpi-val" style="{{ $avance['hay_retraso'] ? 'color:#dc2626;' : 'color:#059669;' }}">
            {{ number_format($avance['porcentaje_plazo'], 1) }}%
        </div>
        <div class="kpi-label">{{ $avance['hay_retraso'] ? '⚠ Retraso' : '✓ Plazo OK' }}</div>
    </div>
    @endif
</div>

{{-- ─── Gráfico: Avance por Unidad ────────────────────────────────────── --}}
<div class="seccion">Avance por Unidad — Comparativo</div>
@php $plazo = $avance['porcentaje_plazo'] ?? null; @endphp
<table>
    <thead>
        <tr>
            <th style="width:32%">Unidad / Vivienda</th>
            <th style="width:8%; text-align:right">Real</th>
            <th>Progreso Constructivo</th>
            @if($plazo !== null)
            <th style="width:14%; text-align:center">vs Objetivo</th>
            @endif
            <th style="width:12%; text-align:center">Estado</th>
        </tr>
    </thead>
    <tbody>
        @foreach($unidades as $u)
        @php
            $pct = (float)($u['porcentaje_avance'] ?? 0);
            $enRetraso = $plazo !== null && $plazo > $pct + 10;
            $barClass  = ($pct >= 100) ? 'bar-green' : ($enRetraso ? 'bar-yellow' : 'bar-blue');
            $estado    = $u['estado'] ?? '';
        @endphp
        <tr>
            <td style="font-size:9.5px">{{ $u['nombre'] }}</td>
            <td style="text-align:right; font-weight:bold; font-size:10px; {{ $enRetraso ? 'color:#d97706;' : ($pct >= 100 ? 'color:#059669;' : 'color:#1e3a5f;') }}">
                {{ number_format($pct, 1) }}%
            </td>
            <td>
                <div class="bar-wrap">
                    <div class="bar-fill {{ $barClass }}" style="width:{{ min(100,$pct) }}%"></div>
                </div>
            </td>
            @if($plazo !== null)
            <td style="text-align:center">
                @if($pct >= 100)
                    <span class="txt-ok">✓ Concluido</span>
                @elseif($enRetraso)
                    <span class="txt-lag">▼ {{ number_format($plazo - $pct, 1) }}%</span>
                @else
                    <span class="txt-ok">✓ Al día</span>
                @endif
            </td>
            @endif
            <td style="text-align:center">
                @if(in_array($estado, ['completada','entregada']))
                    <span class="badge badge-ok">{{ ucfirst($estado) }}</span>
                @elseif(in_array($estado, ['en_progreso','obra_gruesa','obra_fina','acabados','cimentacion','terreno_preparado']))
                    <span class="badge badge-warn">{{ ucfirst(str_replace('_',' ',$estado)) }}</span>
                @else
                    <span class="badge badge-pending">{{ ucfirst(str_replace('_',' ',$estado)) }}</span>
                @endif
            </td>
        </tr>
        @endforeach
    </tbody>
</table>

{{-- ─── Productos Contractuales ─────────────────────────────────────────── --}}
@if(isset($productos) && $productos->isNotEmpty())
<div class="seccion" style="margin-top:16px;">Productos Contractuales</div>
<table>
    <thead>
        <tr>
            <th style="width:50%">Producto</th>
            <th style="width:8%; text-align:right">Peso %</th>
            <th>Progreso</th>
            <th style="width:18%; text-align:center">Estado</th>
        </tr>
    </thead>
    <tbody>
        @foreach($productos as $prod)
        @php $pPct = (float)($prod->porcentaje ?? 0); @endphp
        <tr>
            <td>{{ $prod->nombre }}</td>
            <td style="text-align:right">{{ number_format($pPct, 1) }}%</td>
            <td>
                <div class="bar-wrap">
                    <div class="bar-fill bar-blue" style="width:{{ min(100,$pPct) }}%"></div>
                </div>
            </td>
            <td style="text-align:center">
                @php
                    $pEstado = $prod->estado ?? '';
                    $pBadge  = match($pEstado) {
                        'listo_para_cobro' => 'badge-ok',
                        'en_progreso'      => 'badge-warn',
                        default            => 'badge-pending',
                    };
                @endphp
                <span class="badge {{ $pBadge }}">{{ ucfirst(str_replace('_',' ',$pEstado)) }}</span>
            </td>
        </tr>
        @endforeach
    </tbody>
</table>
@endif

{{-- ─── Salud Financiera ────────────────────────────────────────────────── --}}
@php
    $contrato   = (float)($proyecto->monto_contractual_efectivo ?? 0);
    $presupMat  = (float)($proyecto->presupuesto_materiales ?? 0);
    $presupMO   = (float)($proyecto->presupuesto_mano_obra ?? 0);
    $presupGG   = (float)($proyecto->presupuesto_gastos_generales ?? 0);
    $presupUtil = (float)($proyecto->presupuesto_utilidad_esperada ?? 0);
    $pctMat  = $contrato > 0 ? round(($presupMat  / $contrato) * 100, 1) : 0;
    $pctMO   = $contrato > 0 ? round(($presupMO   / $contrato) * 100, 1) : 0;
    $pctGG   = $contrato > 0 ? round(($presupGG   / $contrato) * 100, 1) : 0;
    $pctUtil = $contrato > 0 ? round(($presupUtil  / $contrato) * 100, 1) : 0;
    $saludBadge = match($proyecto->salud_financiera ?? '') {
        'saludable' => 'badge-ok',
        'riesgo'    => 'badge-warn',
        'critico'   => 'badge-danger',
        default     => 'badge-gray',
    };
@endphp
@if($contrato > 0)
<div class="seccion" style="margin-top:16px;">
    Salud Financiera
    <span class="badge {{ $saludBadge }}" style="margin-left:8px; font-size:9px;">{{ ucfirst($proyecto->salud_financiera ?? 'N/D') }}</span>
</div>

{{-- Total contractual --}}
<table style="width:100%; border-collapse:collapse; background:#f8fafc; border:1px solid #e2e8f0; margin-bottom:8px;">
    <tr>
        <td style="padding:8px 12px; font-size:11px; color:#475569;">Monto Contractual Efectivo</td>
        <td style="padding:8px 12px; text-align:right; font-size:14px; font-weight:bold; color:#1e3a5f;">Bs. {{ number_format($contrato, 2, '.', ',') }}</td>
    </tr>
</table>

{{-- Barra apilada visual --}}
@if($pctMat + $pctMO + $pctGG + $pctUtil > 0)
<table style="width:100%; border-collapse:collapse; height:16px; margin-bottom:8px; border-radius:4px; overflow:hidden;">
    <tr>
        @if($pctMat  > 0)<td style="background:#8b5cf6; width:{{ $pctMat  }}%; height:16px; padding:0;"></td>@endif
        @if($pctMO   > 0)<td style="background:#3b82f6; width:{{ $pctMO   }}%; height:16px; padding:0;"></td>@endif
        @if($pctGG   > 0)<td style="background:#f59e0b; width:{{ $pctGG   }}%; height:16px; padding:0;"></td>@endif
        @if($pctUtil > 0)<td style="background:#10b981; width:{{ $pctUtil  }}%; height:16px; padding:0;"></td>@endif
    </tr>
</table>
@endif

{{-- Cuatro tarjetas financieras --}}
<table style="width:100%; border-collapse:collapse;">
    <tr>
        <td style="width:25%; padding:3px 4px;">
            <table style="width:100%; border:1px solid #e2e8f0; border-collapse:collapse; background:#f8fafc;">
                <tr><td style="background:#8b5cf6; width:5px; padding:0;"></td>
                <td style="padding:8px 10px;">
                    <div style="font-size:8px; color:#64748b; text-transform:uppercase;">Materiales</div>
                    <div style="font-size:12px; font-weight:bold; color:#1e293b; margin-top:2px;">Bs. {{ number_format($presupMat, 0, '.', ',') }}</div>
                    <div style="font-size:8px; color:#94a3b8;">{{ $pctMat }}% del contrato</div>
                </td></tr>
            </table>
        </td>
        <td style="width:25%; padding:3px 4px;">
            <table style="width:100%; border:1px solid #e2e8f0; border-collapse:collapse; background:#f8fafc;">
                <tr><td style="background:#3b82f6; width:5px; padding:0;"></td>
                <td style="padding:8px 10px;">
                    <div style="font-size:8px; color:#64748b; text-transform:uppercase;">Mano de Obra</div>
                    <div style="font-size:12px; font-weight:bold; color:#1e293b; margin-top:2px;">Bs. {{ number_format($presupMO, 0, '.', ',') }}</div>
                    <div style="font-size:8px; color:#94a3b8;">{{ $pctMO }}% del contrato</div>
                </td></tr>
            </table>
        </td>
        <td style="width:25%; padding:3px 4px;">
            <table style="width:100%; border:1px solid #e2e8f0; border-collapse:collapse; background:#f8fafc;">
                <tr><td style="background:#f59e0b; width:5px; padding:0;"></td>
                <td style="padding:8px 10px;">
                    <div style="font-size:8px; color:#64748b; text-transform:uppercase;">GG auto</div>
                    <div style="font-size:12px; font-weight:bold; color:#1e293b; margin-top:2px;">Bs. {{ number_format($presupGG, 0, '.', ',') }}</div>
                    <div style="font-size:8px; color:#94a3b8;">{{ $pctGG }}% del contrato</div>
                </td></tr>
            </table>
        </td>
        <td style="width:25%; padding:3px 4px;">
            <table style="width:100%; border:1px solid #e2e8f0; border-collapse:collapse; background:#f8fafc;">
                <tr><td style="background:#10b981; width:5px; padding:0;"></td>
                <td style="padding:8px 10px;">
                    <div style="font-size:8px; color:#64748b; text-transform:uppercase;">Utilidad</div>
                    <div style="font-size:12px; font-weight:bold; color:#1e293b; margin-top:2px;">Bs. {{ number_format($presupUtil, 0, '.', ',') }}</div>
                    <div style="font-size:8px; color:#94a3b8;">{{ $pctUtil }}% del contrato</div>
                </td></tr>
            </table>
        </td>
    </tr>
</table>
@endif

{{-- ─── Detalle tabla ───────────────────────────────────────────────────── --}}
<div class="seccion" style="margin-top:16px;">Detalle por Unidad</div>
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
        @php $estado = $u['estado'] ?? ''; $pct = (float)($u['porcentaje_avance'] ?? 0); @endphp
        <tr>
            <td>{{ $u['nombre'] }}</td>
            <td>
                @if(in_array($estado, ['completada','entregada']))
                    <span class="badge badge-ok">{{ ucfirst($estado) }}</span>
                @elseif(in_array($estado, ['en_progreso','obra_gruesa','obra_fina','acabados']))
                    <span class="badge badge-warn">{{ ucfirst(str_replace('_',' ',$estado)) }}</span>
                @else
                    <span class="badge badge-pending">{{ ucfirst(str_replace('_',' ',$estado)) }}</span>
                @endif
            </td>
            <td>
                <div class="prog-wrap">
                    <div class="prog-fill" style="width:{{ min(100,$pct) }}%"></div>
                </div>
                <span style="font-size:9px;color:#64748b">{{ number_format($pct,1) }}%</span>
            </td>
            <td>{{ $u['checklist_completados'] ?? 0 }}/{{ $u['checklist_total'] ?? 0 }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

@endsection
