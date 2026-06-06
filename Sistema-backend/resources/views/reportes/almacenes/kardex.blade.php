@extends('reportes.layouts.oficial')

@section('title', 'Kardex ' . ucfirst($variante))

@section('content')
    <h2 style="text-align: center; margin-bottom: 20px;">
        KARDEX DE EXISTENCIAS {{ strtoupper($variante) }}<br>
        <span style="font-size: 14px; font-weight: normal; color: #475569;">Almacén: {{ $almacen->nombre }}</span>
    </h2>

    @foreach($materiales as $material)
        <div style="margin-bottom: 30px;">
            <div style="background-color: #f8fafc; padding: 10px; border: 1px solid #cbd5e1; border-bottom: none; font-weight: bold; font-size: 12px;">
                Producto: {{ $material['codigo'] }} - {{ $material['nombre'] }}
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th rowspan="2" class="text-center" style="width: 70px;">Fecha</th>
                        <th rowspan="2">Documento</th>
                        <th rowspan="2">Detalle / Tipo</th>
                        <th colspan="3" class="text-center">ENTRADAS</th>
                        <th colspan="3" class="text-center">SALIDAS</th>
                        <th colspan="3" class="text-center">SALDOS</th>
                    </tr>
                    <tr>
                        <th class="text-right">Cant.</th>
                        <th class="text-right">C.U.</th>
                        <th class="text-right">Total</th>
                        <th class="text-right">Cant.</th>
                        <th class="text-right">C.U.</th>
                        <th class="text-right">Total</th>
                        <th class="text-right">Cant.</th>
                        <th class="text-right">C.U.</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    @php
                        $saldoCant = 0;
                        $saldoTotal = 0;
                    @endphp
                    @forelse($material['movimientos_filtrados'] ?? [] as $det)
                        @php
                            $mov = $det['movimiento'] ?? [];
                            $tipo = $mov['tipo'] ?? 'Desconocido';
                            $esEntrada = in_array($tipo, ['entrada_compra', 'entrada_devolucion', 'entrada_traspaso', 'entrada_ajuste']);
                            
                            // Lógica básica de PMP / Saldos para la presentación (la BD ya tiene costo_unitario, pero reconstruimos el saldo móvil para el kardex)
                            $cant = (float)$det['cantidad'];
                            $cu = (float)$det['precio_unitario'];
                            $total = $cant * $cu;

                            if ($esEntrada) {
                                $saldoCant += $cant;
                                $saldoTotal += $total;
                            } else {
                                $saldoCant -= $cant;
                                $saldoTotal -= $total;
                            }
                            $saldoCu = $saldoCant > 0 ? $saldoTotal / $saldoCant : 0;
                        @endphp
                        <tr>
                            <td class="text-center">{{ \Carbon\Carbon::parse($mov['fecha_movimiento'] ?? '')->format('d/m/Y') }}</td>
                            <td>{{ $mov['codigo'] ?? '-' }}</td>
                            <td>{{ strtoupper(str_replace('_', ' ', $tipo)) }}</td>
                            
                            <!-- ENTRADAS -->
                            <td class="text-right">{{ $esEntrada ? number_format($cant, 2) : '' }}</td>
                            <td class="text-right">{{ $esEntrada ? number_format($cu, 2) : '' }}</td>
                            <td class="text-right">{{ $esEntrada ? number_format($total, 2) : '' }}</td>
                            
                            <!-- SALIDAS -->
                            <td class="text-right">{{ !$esEntrada ? number_format($cant, 2) : '' }}</td>
                            <td class="text-right">{{ !$esEntrada ? number_format($cu, 2) : '' }}</td>
                            <td class="text-right">{{ !$esEntrada ? number_format($total, 2) : '' }}</td>
                            
                            <!-- SALDOS -->
                            <td class="text-right">{{ number_format($saldoCant, 2) }}</td>
                            <td class="text-right">{{ number_format($saldoCu, 2) }}</td>
                            <td class="text-right font-bold">{{ number_format($saldoTotal, 2) }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="12" class="text-center" style="padding: 20px;">Sin movimientos registrados para los filtros aplicados.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    @endforeach

    <table class="signatures">
        <tr>
            <td>
                <div class="signature-line"></div>
                <strong>Almacenaje y Despacho</strong><br>
                Firma Responsable
            </td>
            <td>
                <div class="signature-line"></div>
                <strong>VoBo Administración</strong><br>
                Aprobación Final
            </td>
        </tr>
    </table>
@endsection
