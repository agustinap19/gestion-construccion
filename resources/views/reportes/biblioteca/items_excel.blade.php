<table>
    <thead>
        <tr>
            <th colspan="7" style="font-size: 14px; font-weight: bold; text-align: center;">{{ $empresa }}</th>
        </tr>
        <tr>
            <th colspan="7" style="font-size: 12px; font-weight: bold; text-align: center;">{{ $titulo }}</th>
        </tr>
        <tr>
            <th colspan="7" style="text-align: center;">Fecha de emisión: {{ $fechaEmision }} | Generado por: {{ $generadoPor }}</th>
        </tr>
        <tr>
            <th colspan="7"></th>
        </tr>
        <tr>
            <th style="font-weight: bold; background-color: #f1f5f9; border: 1px solid #cbd5e1;">N°</th>
            <th style="font-weight: bold; background-color: #f1f5f9; border: 1px solid #cbd5e1;">Código</th>
            <th style="font-weight: bold; background-color: #f1f5f9; border: 1px solid #cbd5e1;">Nombre del Ítem</th>
            <th style="font-weight: bold; background-color: #f1f5f9; border: 1px solid #cbd5e1;">Categoría</th>
            <th style="font-weight: bold; background-color: #f1f5f9; border: 1px solid #cbd5e1;">Unidad</th>
            <th style="font-weight: bold; background-color: #f1f5f9; border: 1px solid #cbd5e1;">Precio Ref. (Bs)</th>
            <th style="font-weight: bold; background-color: #f1f5f9; border: 1px solid #cbd5e1;">Estado</th>
        </tr>
    </thead>
    <tbody>
        @foreach($items as $index => $item)
        <tr>
            <td style="border: 1px solid #cbd5e1;">{{ $index + 1 }}</td>
            <td style="border: 1px solid #cbd5e1;">{{ $item->codigo ?? 'S/C' }}</td>
            <td style="border: 1px solid #cbd5e1;">{{ $item->nombre }}</td>
            <td style="border: 1px solid #cbd5e1;">{{ $item->categoria->nombre ?? '—' }}</td>
            <td style="border: 1px solid #cbd5e1;">{{ $item->unidad_base }}</td>
            <td style="border: 1px solid #cbd5e1;">{{ $item->precio_unitario_referencial ?? 0 }}</td>
            <td style="border: 1px solid #cbd5e1;">{{ $item->estado ? 'ACTIVO' : 'INACTIVO' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
