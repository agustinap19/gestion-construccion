<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    @include('exports._base_styles')
    <style>
        .firma-row { display: table; width: 100%; margin-top: 40px; }
        .firma-cell { display: table-cell; width: 50%; text-align: center; padding: 0 20px; }
        .firma-linea { border-top: 1px solid #1e293b; margin-top: 50px; padding-top: 4px; font-size: 9.5px; color: #475569; }
        .delta-pos { color: #059669; font-weight: bold; }
        .delta-neg { color: #dc2626; font-weight: bold; }
        .total-row td { font-weight: bold; background: #f1f5f9; }
        .suma-zero { background: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 4px; font-size: 10px; font-weight: bold; text-align: center; margin: 8px 0 12px; }
    </style>
</head>
<body>
    <div class="page-header">
        <div class="page-header-left">
            <div class="empresa-nombre">CA & KANAGF S.R.L.</div>
            <div class="reporte-titulo">Modificatorio Contractual de Montos</div>
            <div class="reporte-sub">{{ $modificatorio->numero }} &mdash; {{ $modificatorio->proyecto->nombre }}</div>
        </div>
        <div class="page-header-right">
            <div class="reporte-sub">Generado: {{ now()->format('d/m/Y H:i') }}</div>
            <div class="reporte-sub">Estado: <strong>{{ strtoupper($modificatorio->estado) }}</strong></div>
        </div>
    </div>

    <div class="meta-grid">
        <div class="meta-cell">
            <div class="meta-label">Proyecto</div>
            <div class="meta-value">{{ $modificatorio->proyecto->nombre }}</div>
        </div>
        <div class="meta-cell">
            <div class="meta-label">Código</div>
            <div class="meta-value">{{ $modificatorio->proyecto->codigo }}</div>
        </div>
        <div class="meta-cell">
            <div class="meta-label">Monto contrato</div>
            <div class="meta-value">Bs. {{ number_format($modificatorio->monto_original, 2) }}</div>
        </div>
        <div class="meta-cell">
            <div class="meta-label">Fecha</div>
            <div class="meta-value">{{ $modificatorio->created_at->format('d/m/Y') }}</div>
        </div>
    </div>

    <div class="section-title">Datos del Modificatorio</div>
    <div class="info-grid">
        <div class="info-cell">
            <div class="info-row">
                <div class="info-label">Motivo</div>
                <div class="info-value">{{ $modificatorio->motivo }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Elaborado por</div>
                <div class="info-value">{{ optional($modificatorio->creadoPor)->name }}</div>
            </div>
        </div>
        <div class="info-cell">
            <div class="info-row">
                <div class="info-label">Justificación</div>
                <div class="info-value">{{ $modificatorio->justificacion }}</div>
            </div>
            @if($modificatorio->aprobadoPor)
            <div class="info-row">
                <div class="info-label">Aprobado por</div>
                <div class="info-value">{{ $modificatorio->aprobadoPor->name }} &mdash; {{ optional($modificatorio->fecha_aprobacion)->format('d/m/Y') }}</div>
            </div>
            @endif
        </div>
    </div>

    <div class="section-title">Redistribución de Ítems (Suma Cero)</div>

    <div class="suma-zero">El monto total del contrato permanece invariable: Bs. {{ number_format($modificatorio->monto_original, 2) }}</div>

    <table>
        <thead>
            <tr>
                <th style="width:35%">Ítem</th>
                <th style="width:10%">Unid.</th>
                <th style="width:10%;text-align:right">Cant. Orig.</th>
                <th style="width:10%;text-align:right">Cant. Nueva</th>
                <th style="width:8%;text-align:right">P.U.</th>
                <th style="width:12%;text-align:right">Monto Orig.</th>
                <th style="width:12%;text-align:right">Monto Nuevo</th>
                <th style="width:10%;text-align:right">Delta</th>
            </tr>
        </thead>
        <tbody>
            @foreach($modificatorio->items as $item)
            <tr>
                <td>{{ $item->nombre }}</td>
                <td>{{ $item->unidad ?? '-' }}</td>
                <td style="text-align:right">{{ number_format($item->cantidad_original, 2) }}</td>
                <td style="text-align:right">{{ number_format($item->cantidad_nueva, 2) }}</td>
                <td style="text-align:right">{{ number_format($item->precio_unitario, 2) }}</td>
                <td style="text-align:right">{{ number_format($item->monto_original, 2) }}</td>
                <td style="text-align:right">{{ number_format($item->monto_nuevo, 2) }}</td>
                <td style="text-align:right">
                    @if($item->delta_monto > 0)
                        <span class="delta-pos">+{{ number_format($item->delta_monto, 2) }}</span>
                    @elseif($item->delta_monto < 0)
                        <span class="delta-neg">{{ number_format($item->delta_monto, 2) }}</span>
                    @else
                        <span>0.00</span>
                    @endif
                </td>
            </tr>
            @endforeach
            <tr class="total-row">
                <td colspan="7" style="text-align:right">Total Delta (debe ser 0.00):</td>
                <td style="text-align:right">{{ number_format($modificatorio->items->sum('delta_monto'), 2) }}</td>
            </tr>
        </tbody>
    </table>

    @if($modificatorio->justificativo_legal)
    <div class="section-title">Justificativo Legal</div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:12px;font-size:10px;white-space:pre-wrap;">{{ $modificatorio->justificativo_legal }}</div>
    @endif

    <div class="firma-row">
        <div class="firma-cell">
            <div class="firma-linea">Representante del Contratista</div>
        </div>
        <div class="firma-cell">
            <div class="firma-linea">Supervisor / Representante de Entidad</div>
        </div>
    </div>

    <div class="footer">
        <div class="footer-left">CA & KANAGF S.R.L. &mdash; Sistema de Gestión de Construcción</div>
        <div class="footer-right">Documento: {{ $modificatorio->numero }}</div>
    </div>
</body>
</html>
