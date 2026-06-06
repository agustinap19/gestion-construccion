<?php

namespace App\Services\Almacenes;

use App\Models\Almacen;
use App\Models\MovimientoMaterial;
use App\Models\StockMaterial;
use Illuminate\Support\Facades\DB;
use Exception;

class StockService
{
    /**
     * Registra una entrada de material aplicando PMP (Precio Medio Ponderado).
     */
    public function registrarEntrada(
        int    $almacenId,
        int    $materialId,
        float  $cantidad,
        float  $precioUnitario,
        string $concepto,
        int    $actorId,
        string $referenciaTipo     = null,
        int    $referenciaId       = null,
        int    $movimientoAlmacenId = null
    ): MovimientoMaterial {
        if ($cantidad <= 0) throw new Exception('La cantidad debe ser mayor a cero.');
        if ($precioUnitario < 0) throw new Exception('El precio unitario no puede ser negativo.');

        return DB::transaction(function () use (
            $almacenId, $materialId, $cantidad, $precioUnitario,
            $concepto, $actorId, $referenciaTipo, $referenciaId, $movimientoAlmacenId
        ) {
            $stock = $this->obtenerOCrearStock($almacenId, $materialId);

            $saldoAnterior  = (float) $stock->cantidad;
            $pmpoAnterior   = (float) $stock->costo_promedio;
            $costoTotal     = $cantidad * $precioUnitario;

            // PMP = (stock_anterior × PMP_anterior + cantidad × precio) / (stock_anterior + cantidad)
            $nuevoSaldo = $saldoAnterior + $cantidad;
            $nuevoPMP   = $nuevoSaldo > 0
                ? (($saldoAnterior * $pmpoAnterior) + ($cantidad * $precioUnitario)) / $nuevoSaldo
                : $precioUnitario;

            $stock->update([
                'cantidad'               => $nuevoSaldo,
                'costo_promedio'         => $nuevoPMP,
                'ultimo_precio_entrada'  => $precioUnitario,
                'ultima_fecha_movimiento'=> now(),
                'ultima_actualizacion'   => now(),
            ]);

            return MovimientoMaterial::create([
                'movimiento_almacen_id'     => $movimientoAlmacenId,
                'almacen_id'                => $almacenId,
                'material_id'               => $materialId,
                'tipo'                      => 'entrada',
                'cantidad'                  => $cantidad,
                'precio_unitario'           => $precioUnitario,
                'costo_total'               => $costoTotal,
                'saldo_anterior'            => $saldoAnterior,
                'saldo_posterior'           => $nuevoSaldo,
                'costo_promedio_resultante' => $nuevoPMP,
                'concepto'                  => $concepto,
                'referencia_tipo'           => $referenciaTipo,
                'referencia_id'             => $referenciaId,
                'registrado_por_id'         => $actorId,
                'fecha_movimiento'          => now(),
            ]);
        });
    }

    /**
     * Registra una salida de material.
     */
    public function registrarSalida(
        int    $almacenId,
        int    $materialId,
        float  $cantidad,
        string $concepto,
        int    $actorId,
        string $referenciaTipo      = null,
        int    $referenciaId        = null,
        int    $movimientoAlmacenId = null
    ): MovimientoMaterial {
        if ($cantidad <= 0) throw new Exception('La cantidad debe ser mayor a cero.');

        return DB::transaction(function () use (
            $almacenId, $materialId, $cantidad, $concepto,
            $actorId, $referenciaTipo, $referenciaId, $movimientoAlmacenId
        ) {
            $stock = StockMaterial::where('almacen_id', $almacenId)
                ->where('material_id', $materialId)
                ->lockForUpdate()
                ->firstOrFail();

            $disponible = (float) $stock->cantidad - (float) $stock->cantidad_reservada;
            if ($cantidad > $disponible) {
                throw new Exception("Stock insuficiente. Disponible: {$disponible}, solicitado: {$cantidad}.");
            }

            $saldoAnterior = (float) $stock->cantidad;
            $nuevoSaldo    = $saldoAnterior - $cantidad;
            $pmp           = (float) $stock->costo_promedio;

            $stock->update([
                'cantidad'                => $nuevoSaldo,
                'ultima_fecha_movimiento' => now(),
                'ultima_actualizacion'    => now(),
            ]);

            return MovimientoMaterial::create([
                'movimiento_almacen_id'     => $movimientoAlmacenId,
                'almacen_id'                => $almacenId,
                'material_id'               => $materialId,
                'tipo'                      => 'salida',
                'cantidad'                  => $cantidad,
                'precio_unitario'           => $pmp,
                'costo_total'               => $cantidad * $pmp,
                'saldo_anterior'            => $saldoAnterior,
                'saldo_posterior'           => $nuevoSaldo,
                'costo_promedio_resultante' => $pmp,
                'concepto'                  => $concepto,
                'referencia_tipo'           => $referenciaTipo,
                'referencia_id'             => $referenciaId,
                'registrado_por_id'         => $actorId,
                'fecha_movimiento'          => now(),
            ]);
        });
    }

    /**
     * Transfiere stock entre almacenes.
     */
    public function transferir(
        int    $almacenOrigenId,
        int    $almacenDestinoId,
        int    $materialId,
        float  $cantidad,
        string $concepto,
        int    $actorId,
        int    $movimientoAlmacenId = null
    ): array {
        if ($almacenOrigenId === $almacenDestinoId) {
            throw new Exception('El almacén origen y destino deben ser distintos.');
        }
        if ($cantidad <= 0) throw new Exception('La cantidad debe ser mayor a cero.');

        return DB::transaction(function () use (
            $almacenOrigenId, $almacenDestinoId, $materialId, $cantidad, $concepto, $actorId, $movimientoAlmacenId
        ) {
            $stockOrigen = StockMaterial::where('almacen_id', $almacenOrigenId)
                ->where('material_id', $materialId)
                ->lockForUpdate()
                ->firstOrFail();

            $disponible = (float) $stockOrigen->cantidad - (float) $stockOrigen->cantidad_reservada;
            if ($cantidad > $disponible) {
                throw new Exception("Stock insuficiente en almacén origen. Disponible: {$disponible}.");
            }

            $saldoOrigenAnterior = (float) $stockOrigen->cantidad;
            $pmp                 = (float) $stockOrigen->costo_promedio;
            $nuevoSaldoOrigen    = $saldoOrigenAnterior - $cantidad;

            $stockOrigen->update([
                'cantidad'                => $nuevoSaldoOrigen,
                'ultima_fecha_movimiento' => now(),
                'ultima_actualizacion'    => now(),
            ]);

            $salidaMov = MovimientoMaterial::create([
                'movimiento_almacen_id'     => $movimientoAlmacenId,
                'almacen_id'                => $almacenOrigenId,
                'material_id'               => $materialId,
                'tipo'                      => 'transferencia_salida',
                'cantidad'                  => $cantidad,
                'precio_unitario'           => $pmp,
                'costo_total'               => $cantidad * $pmp,
                'saldo_anterior'            => $saldoOrigenAnterior,
                'saldo_posterior'           => $nuevoSaldoOrigen,
                'costo_promedio_resultante' => $pmp,
                'concepto'                  => $concepto . ' (transferencia hacia ALM#' . $almacenDestinoId . ')',
                'registrado_por_id'         => $actorId,
                'fecha_movimiento'          => now(),
            ]);

            $stockDestino          = $this->obtenerOCrearStock($almacenDestinoId, $materialId);
            $saldoDestinoAnterior  = (float) $stockDestino->cantidad;
            $pmpoDestino           = (float) $stockDestino->costo_promedio;
            $nuevoSaldoDestino     = $saldoDestinoAnterior + $cantidad;
            $nuevoPMPDestino       = $nuevoSaldoDestino > 0
                ? (($saldoDestinoAnterior * $pmpoDestino) + ($cantidad * $pmp)) / $nuevoSaldoDestino
                : $pmp;

            $stockDestino->update([
                'cantidad'                => $nuevoSaldoDestino,
                'costo_promedio'          => $nuevoPMPDestino,
                'ultimo_precio_entrada'   => $pmp,
                'ultima_fecha_movimiento' => now(),
                'ultima_actualizacion'    => now(),
            ]);

            $entradaMov = MovimientoMaterial::create([
                'movimiento_almacen_id'     => $movimientoAlmacenId,
                'almacen_id'                => $almacenDestinoId,
                'material_id'               => $materialId,
                'tipo'                      => 'transferencia_entrada',
                'cantidad'                  => $cantidad,
                'precio_unitario'           => $pmp,
                'costo_total'               => $cantidad * $pmp,
                'saldo_anterior'            => $saldoDestinoAnterior,
                'saldo_posterior'           => $nuevoSaldoDestino,
                'costo_promedio_resultante' => $nuevoPMPDestino,
                'concepto'                  => $concepto . ' (transferencia desde ALM#' . $almacenOrigenId . ')',
                'registrado_por_id'         => $actorId,
                'fecha_movimiento'          => now(),
            ]);

            return ['salida' => $salidaMov, 'entrada' => $entradaMov];
        });
    }

    /**
     * Registra un ajuste de inventario (positivo o negativo).
     */
    public function registrarAjuste(
        int    $almacenId,
        int    $materialId,
        float  $cantidadReal,
        string $motivo,
        int    $actorId
    ): MovimientoMaterial {
        return DB::transaction(function () use ($almacenId, $materialId, $cantidadReal, $motivo, $actorId) {
            $stock         = $this->obtenerOCrearStock($almacenId, $materialId);
            $saldoActual   = (float) $stock->cantidad;
            $diferencia    = $cantidadReal - $saldoActual;
            $tipo          = $diferencia >= 0 ? 'ajuste_positivo' : 'ajuste_negativo';
            $cantidadMov   = abs($diferencia);
            $pmp           = (float) $stock->costo_promedio;

            $stock->update([
                'cantidad'                => $cantidadReal,
                'ultima_fecha_movimiento' => now(),
                'ultima_actualizacion'    => now(),
            ]);

            return MovimientoMaterial::create([
                'almacen_id'                => $almacenId,
                'material_id'               => $materialId,
                'tipo'                      => $tipo,
                'cantidad'                  => $cantidadMov,
                'precio_unitario'           => $pmp,
                'costo_total'               => $cantidadMov * $pmp,
                'saldo_anterior'            => $saldoActual,
                'saldo_posterior'           => $cantidadReal,
                'costo_promedio_resultante' => $pmp,
                'concepto'                  => $motivo,
                'registrado_por_id'         => $actorId,
                'fecha_movimiento'          => now(),
            ]);
        });
    }

    /**
     * Recalcula el kardex completo para verificar consistencia.
     * Puede limitarse a un almacén específico.
     */
    public function reconciliarKardex(?int $almacenId = null): array
    {
        $discrepancias = [];

        $stocksQuery = StockMaterial::with(['almacen:id,nombre,codigo', 'material:id,nombre,codigo']);
        if ($almacenId) $stocksQuery->where('almacen_id', $almacenId);
        $stocks = $stocksQuery->get();

        foreach ($stocks as $stock) {
            $movimientos = MovimientoMaterial::where('almacen_id', $stock->almacen_id)
                ->where('material_id', $stock->material_id)
                ->orderBy('fecha_movimiento')
                ->orderBy('id')
                ->get();

            $saldoCalculado = 0.0;
            $pmpCalculado   = 0.0;

            foreach ($movimientos as $mov) {
                if (in_array($mov->tipo, MovimientoMaterial::TIPOS_ENTRADA)) {
                    $nuevaCantidad  = $saldoCalculado + (float) $mov->cantidad;
                    $pmpCalculado   = $nuevaCantidad > 0
                        ? (($saldoCalculado * $pmpCalculado) + ((float) $mov->cantidad * (float) $mov->precio_unitario)) / $nuevaCantidad
                        : (float) $mov->precio_unitario;
                    $saldoCalculado = $nuevaCantidad;
                } else {
                    $saldoCalculado -= (float) $mov->cantidad;
                }
            }

            $diffCantidad = abs($saldoCalculado - (float) $stock->cantidad);
            $diffPmp      = abs($pmpCalculado - (float) $stock->costo_promedio);

            if ($diffCantidad > 0.0001 || $diffPmp > 0.0001) {
                $discrepancias[] = [
                    'almacen'             => $stock->almacen?->nombre,
                    'material'            => $stock->material?->nombre,
                    'cantidad_bd'         => (float) $stock->cantidad,
                    'cantidad_calculada'  => $saldoCalculado,
                    'pmp_bd'              => (float) $stock->costo_promedio,
                    'pmp_calculado'       => $pmpCalculado,
                ];

                // Auto-corregir
                $stock->update([
                    'cantidad'             => $saldoCalculado,
                    'costo_promedio'       => $pmpCalculado,
                    'ultima_actualizacion' => now(),
                ]);
            }
        }

        return [
            'stocks_revisados'  => $stocks->count(),
            'discrepancias'     => count($discrepancias),
            'detalle'           => $discrepancias,
        ];
    }

    /**
     * Obtiene o crea el registro de stock para almacén+material.
     */
    private function obtenerOCrearStock(int $almacenId, int $materialId): StockMaterial
    {
        return StockMaterial::firstOrCreate(
            ['almacen_id' => $almacenId, 'material_id' => $materialId],
            [
                'cantidad'                => 0,
                'cantidad_reservada'      => 0,
                'cantidad_en_transito'    => 0,
                'costo_promedio'          => 0,
                'ultima_actualizacion'    => now(),
            ]
        );
    }
}
