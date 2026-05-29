<?php

namespace App\Services\Almacenes;

use App\Models\Almacen;
use App\Models\Beneficiario;
use App\Models\DetalleMovimientoAlmacen;
use App\Models\EvidenciaMovimiento;
use App\Models\MovimientoAlmacen;
use App\Models\PresupuestoItemProyecto;
use App\Models\PresupuestoMaterialProyecto;
use App\Models\StockMaterial;
use App\Services\Almacenes\RecetaResolverService;
use App\Services\Almacenes\StockService;
use App\Services\Almacenes\TrazabilidadMaterialesService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EntregaService
{
    // Umbrales de sobre-consumo
    const UMBRAL_ALERTA     = 1.10; // 110% → amarillo + justificación
    const UMBRAL_BLOQUEO    = 1.50; // 150% → rojo + aprobación admin

    public function __construct(
        private StockService $stockService,
        private TrazabilidadMaterialesService $trazabilidad,
        private RecetaResolverService $recetaResolver,
    ) {}

    // ─── ENTRADA (compra) ────────────────────────────────────────────────────────

    public function registrarEntrada(array $data, int $userId): MovimientoAlmacen
    {
        return DB::transaction(function () use ($data, $userId) {
            $almacen = Almacen::findOrFail($data['almacen_id']);

            $movimiento = MovimientoAlmacen::create([
                'codigo'             => MovimientoAlmacen::generarCodigo('entrada_compra'),
                'tipo'               => 'entrada_compra',
                'estado'             => 'completado',
                'almacen_origen_id'  => null,
                'almacen_destino_id' => $almacen->id,
                'proyecto_id'        => $data['proyecto_id'] ?? null,
                'proveedor_nombre'   => $data['proveedor_nombre'] ?? null,
                'numero_factura'     => $data['numero_factura'] ?? null,
                'fecha_factura'      => $data['fecha_factura'] ?? null,
                'archivo_factura_url'=> $data['archivo_factura_url'] ?? null,
                'notas'              => $data['notas'] ?? null,
                'registrado_por_id'  => $userId,
                'fecha_movimiento'   => now(),
                'monto_total'        => 0,
            ]);

            $montoTotal = 0;

            foreach ($data['materiales'] as $mat) {
                $kardex = $this->stockService->registrarEntrada(
                    almacenId:          $almacen->id,
                    materialId:         $mat['material_id'],
                    cantidad:           (float) $mat['cantidad'],
                    precioUnitario:     (float) $mat['precio_unitario'],
                    concepto:           "Compra — Factura " . ($data['numero_factura'] ?? 'S/N'),
                    actorId:            $userId,
                    referenciaTipo:     'MovimientoAlmacen',
                    referenciaId:       $movimiento->id,
                    movimientoAlmacenId: $movimiento->id,
                );

                $detalle = DetalleMovimientoAlmacen::create([
                    'movimiento_almacen_id'  => $movimiento->id,
                    'material_id'            => $mat['material_id'],
                    'cantidad'               => $mat['cantidad'],
                    'precio_unitario'        => $mat['precio_unitario'],
                    'pmp_anterior'           => $kardex->saldo_anterior > 0
                        ? $kardex->costo_promedio_resultante
                        : null,
                    'pmp_posterior'          => $kardex->costo_promedio_resultante,
                    'saldo_anterior'         => $kardex->saldo_anterior,
                    'saldo_posterior'        => $kardex->saldo_posterior,
                    'movimiento_material_id' => $kardex->id,
                ]);

                $montoTotal += $mat['cantidad'] * $mat['precio_unitario'];
            }

            $movimiento->update(['monto_total' => $montoTotal]);

            // ── Hook de trazabilidad (dentro de la misma transacción) ────────
            if (!empty($data['proyecto_id'])) {
                foreach ($data['materiales'] as $mat) {
                    $this->trazabilidad->recalcularMaterial(
                        (int) $data['proyecto_id'],
                        (int) $mat['material_id']
                    );
                }
            }

            return $movimiento->load(['detalles.material', 'almacenDestino']);
        });
    }

    // ─── SALIDA SOCIAL (entrega a beneficiario) ──────────────────────────────────

    public function registrarSalidaSocial(array $data, int $userId): MovimientoAlmacen
    {
        return DB::transaction(function () use ($data, $userId) {
            $almacen      = Almacen::findOrFail($data['almacen_id']);
            $beneficiario = Beneficiario::findOrFail($data['beneficiario_id']);
            $itemPpto     = PresupuestoItemProyecto::findOrFail($data['presupuesto_item_proyecto_id']);

            // Validación de sobre-consumo por material
            $requiereAprobacion = false;
            $hayAlerta          = false;
            foreach ($data['materiales'] as $mat) {
                $pct = $this->calcularPorcentajeConsumo($itemPpto->id, $mat['material_id'], $mat['cantidad']);
                if ($pct > self::UMBRAL_BLOQUEO * 100) {
                    if (empty($data['aprobado_por_id'])) {
                        throw new \RuntimeException(
                            "Entrega supera el 150% del presupuesto para material {$mat['material_id']}. Requiere aprobación de administrador."
                        );
                    }
                    $requiereAprobacion = true;
                } elseif ($pct > self::UMBRAL_ALERTA * 100) {
                    $hayAlerta = true;
                }
            }
            if ($hayAlerta && empty(trim($data['justificacion_sobre_consumo'] ?? ''))) {
                throw ValidationException::withMessages([
                    'justificacion_sobre_consumo' => 'El consumo supera el 110% del presupuesto. Se requiere justificación.',
                ]);
            }

            // Detección automática de modalidad (ignorar el campo del request si viene)
            $modalidadDetectada = $this->detectarModalidad($itemPpto, $data['materiales']);

            $movimiento = MovimientoAlmacen::create([
                'codigo'                       => MovimientoAlmacen::generarCodigo('salida_social'),
                'tipo'                         => 'salida_social',
                'estado'                       => 'completado',
                'almacen_origen_id'            => $almacen->id,
                'almacen_destino_id'           => null,
                'proyecto_id'                  => $almacen->proyecto_id ?? $itemPpto->proyecto_id,
                'beneficiario_id'              => $beneficiario->id,
                'presupuesto_item_proyecto_id' => $itemPpto->id,
                'modalidad_entrega'            => $modalidadDetectada,
                'justificacion_sobre_consumo'  => $data['justificacion_sobre_consumo'] ?? null,
                'requiere_aprobacion'          => $requiereAprobacion,
                'aprobado_por_id'              => $data['aprobado_por_id'] ?? null,
                'aprobado_en'                  => isset($data['aprobado_por_id']) ? now() : null,
                'notas'                        => $data['notas'] ?? null,
                'registrado_por_id'            => $userId,
                'fecha_movimiento'             => now(),
                'monto_total'                  => 0,
            ]);

            $montoTotal = 0;

            foreach ($data['materiales'] as $mat) {
                $pct = $this->calcularPorcentajeConsumo($itemPpto->id, $mat['material_id'], $mat['cantidad']);

                $kardex = $this->stockService->registrarSalida(
                    almacenId:          $almacen->id,
                    materialId:         $mat['material_id'],
                    cantidad:           (float) $mat['cantidad'],
                    concepto:           "Entrega social — " . ($beneficiario->nombre_completo ?? "BEN#{$beneficiario->id}"),
                    actorId:            $userId,
                    referenciaTipo:     'MovimientoAlmacen',
                    referenciaId:       $movimiento->id,
                    movimientoAlmacenId: $movimiento->id,
                );

                DetalleMovimientoAlmacen::create([
                    'movimiento_almacen_id'  => $movimiento->id,
                    'material_id'            => $mat['material_id'],
                    'cantidad'               => $mat['cantidad'],
                    'precio_unitario'        => $kardex->precio_unitario,
                    'pmp_anterior'           => $kardex->saldo_anterior,
                    'pmp_posterior'          => $kardex->saldo_posterior,
                    'saldo_anterior'         => $kardex->saldo_anterior,
                    'saldo_posterior'        => $kardex->saldo_posterior,
                    'movimiento_material_id' => $kardex->id,
                    'porcentaje_presupuesto' => $pct,
                    'observacion'            => $mat['observacion'] ?? null,
                ]);

                $montoTotal += $kardex->costo_total;
            }

            // Cascada: actualizar porcentaje_avance del ítem con modalidad auto-detectada
            $this->actualizarAvanceItem($itemPpto, $modalidadDetectada);

            $movimiento->update(['monto_total' => $montoTotal]);

            // Guardar evidencias (foto + firma)
            if (!empty($data['evidencias'])) {
                $this->guardarEvidencias($movimiento->id, $data['evidencias'], $userId);
            }

            // ── Hook de trazabilidad (dentro de la misma transacción) ────────
            $proyectoId = $almacen->proyecto_id ?? $itemPpto->proyecto_id;
            if ($proyectoId) {
                foreach ($data['materiales'] as $mat) {
                    $this->trazabilidad->recalcularMaterial(
                        (int) $proyectoId,
                        (int) $mat['material_id']
                    );
                }
            }

            return $movimiento->load(['detalles.material', 'beneficiario', 'presupuestoItem.itemConstructivo', 'evidencias']);
        });
    }

    // ─── SALIDA PRIVADA (entrega a personal) ─────────────────────────────────────

    public function registrarSalidaPrivada(array $data, int $userId): MovimientoAlmacen
    {
        return DB::transaction(function () use ($data, $userId) {
            $almacen = Almacen::findOrFail($data['almacen_id']);

            $movimiento = MovimientoAlmacen::create([
                'codigo'              => MovimientoAlmacen::generarCodigo('salida_privado'),
                'tipo'                => 'salida_privado',
                'estado'              => 'completado',
                'almacen_origen_id'   => $almacen->id,
                'almacen_destino_id'  => null,
                'proyecto_id'         => $data['proyecto_id'] ?? $almacen->proyecto_id,
                'receptor_personal_id'=> $data['receptor_personal_id'] ?? null,
                'receptor_nombre'     => $data['receptor_nombre'] ?? null,
                'receptor_ci'         => $data['receptor_ci'] ?? null,
                'notas'               => $data['notas'] ?? null,
                'registrado_por_id'   => $userId,
                'fecha_movimiento'    => now(),
                'monto_total'         => 0,
            ]);

            $montoTotal = 0;

            foreach ($data['materiales'] as $mat) {
                $kardex = $this->stockService->registrarSalida(
                    almacenId:          $almacen->id,
                    materialId:         $mat['material_id'],
                    cantidad:           (float) $mat['cantidad'],
                    concepto:           "Entrega privada — " . ($data['receptor_nombre'] ?? 'Personal'),
                    actorId:            $userId,
                    referenciaTipo:     'MovimientoAlmacen',
                    referenciaId:       $movimiento->id,
                    movimientoAlmacenId: $movimiento->id,
                );

                DetalleMovimientoAlmacen::create([
                    'movimiento_almacen_id'  => $movimiento->id,
                    'material_id'            => $mat['material_id'],
                    'cantidad'               => $mat['cantidad'],
                    'precio_unitario'        => $kardex->precio_unitario,
                    'saldo_anterior'         => $kardex->saldo_anterior,
                    'saldo_posterior'        => $kardex->saldo_posterior,
                    'movimiento_material_id' => $kardex->id,
                ]);

                $montoTotal += $kardex->costo_total;
            }

            $movimiento->update(['monto_total' => $montoTotal]);

            if (!empty($data['evidencias'])) {
                $this->guardarEvidencias($movimiento->id, $data['evidencias'], $userId);
            }

            // ── Hook de trazabilidad (salida privada) ──────────────────────
            $proyectoId = $data['proyecto_id'] ?? $almacen->proyecto_id;
            if ($proyectoId) {
                foreach ($data['materiales'] as $mat) {
                    $this->trazabilidad->recalcularMaterial(
                        (int) $proyectoId,
                        (int) $mat['material_id']
                    );
                }
            }

            return $movimiento->load(['detalles.material', 'receptorPersonal', 'evidencias']);
        });
    }

    // ─── TRANSFERENCIA ───────────────────────────────────────────────────────────

    public function registrarTransferencia(array $data, int $userId): MovimientoAlmacen
    {
        return DB::transaction(function () use ($data, $userId) {
            $origen  = Almacen::findOrFail($data['almacen_origen_id']);
            $destino = Almacen::findOrFail($data['almacen_destino_id']);

            $movimiento = MovimientoAlmacen::create([
                'codigo'              => MovimientoAlmacen::generarCodigo('transferencia_interna'),
                'tipo'                => 'transferencia_interna',
                'estado'              => 'en_transito',
                'almacen_origen_id'   => $origen->id,
                'almacen_destino_id'  => $destino->id,
                'proyecto_id'         => $data['proyecto_id'] ?? $origen->proyecto_id,
                'notas'               => $data['notas'] ?? null,
                'registrado_por_id'   => $userId,
                'fecha_movimiento'    => now(),
                'monto_total'         => 0,
            ]);

            $montoTotal = 0;

            foreach ($data['materiales'] as $mat) {
                $kardexPair = $this->stockService->transferir(
                    almacenOrigenId:     $origen->id,
                    almacenDestinoId:    $destino->id,
                    materialId:          $mat['material_id'],
                    cantidad:            (float) $mat['cantidad'],
                    concepto:            "Transferencia interna — " . ($data['notas'] ?? ''),
                    actorId:             $userId,
                    movimientoAlmacenId: $movimiento->id,
                );
                $salidaKardex = $kardexPair['salida'];

                DetalleMovimientoAlmacen::create([
                    'movimiento_almacen_id'  => $movimiento->id,
                    'material_id'            => $mat['material_id'],
                    'cantidad'               => $mat['cantidad'],
                    'precio_unitario'        => $salidaKardex->precio_unitario,
                    'saldo_anterior'         => $salidaKardex->saldo_anterior,
                    'saldo_posterior'        => $salidaKardex->saldo_posterior,
                    'movimiento_material_id' => $salidaKardex->id,
                ]);

                $montoTotal += $salidaKardex->costo_total;
            }

            $movimiento->update(['monto_total' => $montoTotal]);

            // ── Hook de trazabilidad para el almacén origen (proyecto que transfiere) ─
            $proyectoId = $data['proyecto_id'] ?? $origen->proyecto_id;
            if ($proyectoId) {
                foreach ($data['materiales'] as $mat) {
                    $this->trazabilidad->recalcularMaterial(
                        (int) $proyectoId,
                        (int) $mat['material_id']
                    );
                }
            }

            return $movimiento->load(['detalles.material', 'almacenOrigen', 'almacenDestino']);
        });
    }

    // ─── ANULACIÓN ───────────────────────────────────────────────────────────────

    public function anular(MovimientoAlmacen $movimiento, string $motivo, int $userId): MovimientoAlmacen
    {
        if ($movimiento->estado === 'anulado') {
            throw new \RuntimeException('El movimiento ya fue anulado.');
        }
        if ($movimiento->estado === 'en_transito') {
            throw new \RuntimeException('No se puede anular un movimiento en tránsito. Confírmelo o rechácelo primero.');
        }

        return DB::transaction(function () use ($movimiento, $motivo, $userId) {
            // Revertir cada línea del kardex
            foreach ($movimiento->detalles as $detalle) {
                if ($movimiento->esEntrada()) {
                    $this->stockService->registrarSalida(
                        almacenId:      $movimiento->almacen_destino_id,
                        materialId:     $detalle->material_id,
                        cantidad:       (float) $detalle->cantidad,
                        concepto:       "Anulación — " . $movimiento->codigo,
                        actorId:        $userId,
                        referenciaTipo: 'MovimientoAlmacen_Anulacion',
                        referenciaId:   $movimiento->id,
                    );
                } else {
                    $this->stockService->registrarEntrada(
                        almacenId:      $movimiento->almacen_origen_id,
                        materialId:     $detalle->material_id,
                        cantidad:       (float) $detalle->cantidad,
                        precioUnitario: (float) $detalle->precio_unitario,
                        concepto:       "Anulación — " . $movimiento->codigo,
                        actorId:        $userId,
                        referenciaTipo: 'MovimientoAlmacen_Anulacion',
                        referenciaId:   $movimiento->id,
                    );
                }
            }

            $movimiento->update([
                'estado'          => 'anulado',
                'motivo_anulacion'=> $motivo,
                'anulado_por_id'  => $userId,
                'anulado_en'      => now(),
            ]);

            // ── Hook de trazabilidad: recalcular todos los materiales afectados ─
            $proyectoId = $movimiento->proyecto_id
                ?? $movimiento->almacenOrigen?->proyecto_id
                ?? $movimiento->almacenDestino?->proyecto_id;

            if ($proyectoId) {
                $movimiento->load('detalles');
                foreach ($movimiento->detalles as $detalle) {
                    $this->trazabilidad->recalcularMaterial(
                        (int) $proyectoId,
                        (int) $detalle->material_id
                    );
                }
            }

            return $movimiento->fresh();
        });
    }

    // ─── Confirmar recepción de transferencia ────────────────────────────────────

    public function confirmarRecepcionTransferencia(MovimientoAlmacen $movimiento, int $userId): MovimientoAlmacen
    {
        if ($movimiento->estado !== 'en_transito') {
            throw new \RuntimeException('Solo se pueden confirmar movimientos en estado en_transito.');
        }
        if ($movimiento->tipo !== 'transferencia_interna') {
            throw new \RuntimeException('Solo se pueden confirmar transferencias internas.');
        }

        return DB::transaction(function () use ($movimiento, $userId) {
            $movimiento->update(['estado' => 'completado']);

            // ── Hook de trazabilidad al confirmar recepción ───────────────────
            // Al confirmarse, la transferencia queda 'completado' → devuelto_central sube
            $proyectoId = $movimiento->proyecto_id
                ?? $movimiento->almacenOrigen?->proyecto_id;

            if ($proyectoId) {
                $movimiento->load('detalles');
                foreach ($movimiento->detalles as $detalle) {
                    $this->trazabilidad->recalcularMaterial(
                        (int) $proyectoId,
                        (int) $detalle->material_id
                    );
                }
            }

            return $movimiento->fresh();
        });
    }

    // ─── Devolver a Central ───────────────────────────────────────────────────────

    public function devolverCentral(int $almacenId, int $userId): MovimientoAlmacen
    {
        $almacenOrigen = Almacen::findOrFail($almacenId);
        $almacenCentral = Almacen::where('tipo', 'central')->where('estado', 'activo')->first();

        if (!$almacenCentral) {
            throw new \RuntimeException('No existe un almacén central activo para recibir la devolución.');
        }

        $stocks = StockMaterial::where('almacen_id', $almacenId)->where('cantidad', '>', 0)->get();

        if ($stocks->isEmpty()) {
            throw new \RuntimeException('No hay stock en el almacén para devolver.');
        }

        $materiales = $stocks->map(fn($s) => [
            'material_id' => $s->material_id,
            'cantidad'    => (float) $s->cantidad,
        ])->toArray();

        return $this->registrarTransferencia([
            'almacen_origen_id'  => $almacenId,
            'almacen_destino_id' => $almacenCentral->id,
            'proyecto_id'        => $almacenOrigen->proyecto_id,
            'materiales'         => $materiales,
            'notas'              => 'Devolución de excedentes al almacén central.',
        ], $userId);
    }

    // ─── Cierre formal de almacén ─────────────────────────────────────────────────

    public function cerrarAlmacenProyecto(Almacen $almacen, string $motivo, int $userId): Almacen
    {
        if ($almacen->estado === 'cerrado') {
            throw new \RuntimeException('El almacén ya está cerrado.');
        }

        $stockConSaldo = StockMaterial::where('almacen_id', $almacen->id)
            ->where('cantidad', '>', 0)
            ->count();

        if ($stockConSaldo > 0) {
            throw new \RuntimeException(
                "No se puede cerrar el almacén: hay {$stockConSaldo} materiales con stock mayor a cero."
            );
        }

        $almacen->update([
            'estado'        => 'cerrado',
            'fecha_cierre'  => now()->toDateString(),
            'observaciones' => $motivo,
        ]);

        return $almacen->fresh();
    }

    // ─── Validación porcentaje sobre-consumo ─────────────────────────────────────

    public function validarSobreConsumo(int $itemId, array $materiales): array
    {
        $resultado = [];
        foreach ($materiales as $mat) {
            $pct = $this->calcularPorcentajeConsumo($itemId, $mat['material_id'], $mat['cantidad']);
            $resultado[] = [
                'material_id'          => $mat['material_id'],
                'porcentaje'           => $pct,
                'nivel'                => $pct <= 110 ? 'ok' : ($pct <= 150 ? 'alerta' : 'bloqueado'),
                'requiere_justificacion' => $pct > 110,
                'requiere_aprobacion'  => $pct > 150,
            ];
        }
        return $resultado;
    }

    // ─── Helpers privados ────────────────────────────────────────────────────────

    private function calcularPorcentajeConsumo(int $itemId, int $materialId, float $nuevaCantidad): float
    {
        $itemPpto = PresupuestoItemProyecto::find($itemId);
        if (!$itemPpto) return 0;

        $teoricoTotal = $this->getCantidadPlanificadaMaterial($itemPpto, $materialId);
        if (!$teoricoTotal || $teoricoTotal == 0) return 0;

        // Ya entregado anteriormente para este ítem/material
        $entregadoAntes = (float) DetalleMovimientoAlmacen::whereHas('movimiento', function ($q) use ($itemId) {
            $q->where('presupuesto_item_proyecto_id', $itemId)
              ->whereNotIn('estado', ['anulado', 'borrador']);
        })->where('material_id', $materialId)->sum('cantidad');

        // FIX 3: porcentaje = nueva_cantidad / teórico_restante × 100
        // Si teórico_restante ≤ 0 → el ítem ya está completo → cualquier entrega adicional = 9999%
        $teoricoRestante = $teoricoTotal - $entregadoAntes;
        if ($teoricoRestante <= 0) {
            return $nuevaCantidad > 0 ? 9999.0 : 0.0;
        }

        return round(($nuevaCantidad / $teoricoRestante) * 100, 2);
    }

    private function getCantidadPlanificadaMaterial(PresupuestoItemProyecto $itemPpto, int $materialId): float
    {
        // Usa el resolver de jerarquía: vivienda > tipología > global
        $coef = $this->recetaResolver->resolverMaterial(
            $itemPpto->item_constructivo_id,
            $itemPpto->proyecto_id,
            $itemPpto->vivienda_id,
            $materialId
        );

        if ($coef <= 0) return 0;

        return (float) ($itemPpto->cantidad_planificada * $coef);
    }

    /**
     * Detecta si la entrega es total (≥ 95% del teórico restante) o parcial.
     * Se llama ANTES de persistir los detalles (entregadoAntes no incluye entrega actual).
     */
    private function detectarModalidad(PresupuestoItemProyecto $itemPpto, array $materiales): string
    {
        foreach ($materiales as $mat) {
            $teoricoTotal = $this->getCantidadPlanificadaMaterial($itemPpto, $mat['material_id']);
            if ($teoricoTotal <= 0) continue;

            $entregadoAntes = (float) DetalleMovimientoAlmacen::whereHas('movimiento', fn($q) => $q
                ->where('presupuesto_item_proyecto_id', $itemPpto->id)
                ->whereNotIn('estado', ['anulado', 'borrador'])
            )->where('material_id', $mat['material_id'])->sum('cantidad');

            $teoricoRestante = max(0.0, $teoricoTotal - $entregadoAntes);

            // Si queda restante y lo entregado ahora no cubre el 95% → parcial
            if ($teoricoRestante > 0 && (float) $mat['cantidad'] < $teoricoRestante * 0.95) {
                return 'parcial';
            }
        }
        return 'total';
    }

    /**
     * Actualiza porcentaje_avance e estado_ejecucion del ítem.
     * Parcial: ya_entregado_total / teorico_total × 100 (incluye entrega actual).
     * Se llama DESPUÉS de persistir los detalles.
     */
    private function actualizarAvanceItem(PresupuestoItemProyecto $item, string $modalidad): void
    {
        if ($modalidad === 'total') {
            $item->update([
                'estado_ejecucion'  => 'terminado',
                'porcentaje_avance' => 100,
            ]);
            return;
        }

        // Parcial: avance = MAX(ya_entregado_total / teorico_total) × 100 por material de receta
        $item->loadMissing('itemConstructivo.receta');
        $receta  = $item->itemConstructivo?->receta ?? collect();
        $maxPct  = 0.0;

        foreach ($receta as $r) {
            $teoricoTotal = (float) ($item->cantidad_planificada * $r->cantidad_por_unidad_base);
            if ($teoricoTotal <= 0) continue;

            $yaEntregado = (float) DetalleMovimientoAlmacen::whereHas('movimiento', fn($q) => $q
                ->where('presupuesto_item_proyecto_id', $item->id)
                ->whereNotIn('estado', ['anulado', 'borrador'])
            )->where('material_id', $r->material_id)->sum('cantidad');

            $pct    = min(100.0, round(($yaEntregado / $teoricoTotal) * 100, 2));
            $maxPct = max($maxPct, $pct);
        }

        $nuevoAvance = min(99.0, $maxPct); // nunca 100% si es parcial

        if ($nuevoAvance > (float) ($item->porcentaje_avance ?? 0)) {
            $item->update([
                'porcentaje_avance' => $nuevoAvance,
                'estado_ejecucion'  => 'en_proceso',
            ]);
        }
    }

    private function guardarEvidencias(int $movimientoId, array $evidencias, int $userId): void
    {
        foreach ($evidencias as $ev) {
            // Si viene en base64, guardar en storage
            $url = $ev['archivo_url'] ?? null;
            if (!empty($ev['base64'])) {
                $url = $this->guardarBase64($ev['base64'], $ev['tipo'] ?? 'foto');
            }

            EvidenciaMovimiento::create([
                'movimiento_almacen_id' => $movimientoId,
                'tipo'                  => $ev['tipo'] ?? 'foto',
                'archivo_url'           => $url,
                'hash_validacion'       => $url ? hash('sha256', $url . $movimientoId) : null,
                'latitud'               => $ev['latitud'] ?? null,
                'longitud'              => $ev['longitud'] ?? null,
                'dispositivo'           => $ev['dispositivo'] ?? null,
                'usuario_captura_id'    => $userId,
                'fecha_captura'         => now(),
            ]);
        }
    }

    private function guardarBase64(string $base64, string $tipo): string
    {
        $extension = $tipo === 'firma' ? 'png' : 'jpg';
        $nombre    = 'evidencias/' . Str::uuid() . '.' . $extension;

        // Remover encabezado data:image/...;base64,
        $datos = preg_replace('/^data:image\/\w+;base64,/', '', $base64);
        Storage::disk('public')->put($nombre, base64_decode($datos));

        return Storage::url($nombre);
    }
}
