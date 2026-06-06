<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>{{ $titulo }}</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #333; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 16px; color: #1e3a8a; }
        .header p { margin: 2px 0; font-size: 10px; color: #64748b; }
        .info-section { margin-bottom: 15px; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .info-table th { text-align: left; background-color: #f8fafc; padding: 5px; border: 1px solid #e2e8f0; font-size: 10px; width: 15%; }
        .info-table td { padding: 5px; border: 1px solid #e2e8f0; font-size: 10px; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.data-table th, table.data-table td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; font-size: 9px; }
        table.data-table th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; text-transform: uppercase; }
        table.data-table tbody tr:nth-child(even) { background-color: #f8fafc; }
        .footer { position: fixed; bottom: -20px; left: 0; right: 0; text-align: center; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 5px; }
        .page-number:after { content: counter(page); }
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        .badge { background: #e2e8f0; padding: 2px 5px; border-radius: 4px; font-size: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $empresa }}</h1>
        <h2>{{ $titulo }}</h2>
        <p>Fecha de emisión: {{ $fechaEmision }} | Generado por: {{ $generadoPor }}</p>
    </div>

    @if(!empty($filtros))
    <div class="info-section">
        <table class="info-table">
            <tr>
                <th>Filtros Aplicados</th>
                <td>
                    @if(isset($filtros['busqueda']) && $filtros['busqueda'])
                        Búsqueda: "{{ $filtros['busqueda'] }}" &nbsp;&nbsp;
                    @endif
                    @if(isset($filtros['categoria_id']) && $filtros['categoria_id'])
                        Categoría ID: {{ $filtros['categoria_id'] }}
                    @endif
                    @if(empty($filtros['busqueda']) && empty($filtros['categoria_id']))
                        Ninguno (Catálogo completo)
                    @endif
                </td>
            </tr>
        </table>
    </div>
    @endif

    <table class="data-table">
        <thead>
            <tr>
                <th width="5%">N°</th>
                <th width="15%">Código</th>
                <th width="30%">Nombre del Ítem</th>
                <th width="15%">Categoría</th>
                <th width="8%" class="text-center">Und.</th>
                <th width="12%" class="text-right">Precio Ref. (Bs)</th>
                <th width="15%" class="text-center">Estado</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $index => $item)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td><strong>{{ $item->codigo ?? 'S/C' }}</strong></td>
                <td>{{ $item->nombre }}</td>
                <td>{{ $item->categoria->nombre ?? '—' }}</td>
                <td class="text-center">{{ $item->unidad_base }}</td>
                <td class="text-right">{{ number_format($item->precio_unitario_referencial ?? 0, 2) }}</td>
                <td class="text-center">
                    <span class="badge">{{ $item->estado ? 'ACTIVO' : 'INACTIVO' }}</span>
                </td>
            </tr>
            @endforeach
            @if(count($items) === 0)
            <tr>
                <td colspan="7" class="text-center">No se encontraron ítems con los filtros aplicados.</td>
            </tr>
            @endif
        </tbody>
    </table>

    <div class="footer">
        {{ $empresa }} - Sistema ERP Integrado | Página <span class="page-number"></span>
    </div>
</body>
</html>
