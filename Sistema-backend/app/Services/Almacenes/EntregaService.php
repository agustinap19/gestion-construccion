<?php

namespace App\Services\Almacenes;

use App\Models\Almacen;
use App\Models\Beneficiario;
use App\Models\DetalleMovimientoAlmacen;
use App\Models\Proveedor;
use App\Models\EvidenciaMovimiento;
use App\Models\Material;
use App\Models\MovimientoAlmacen;
use App\Models\PresupuestoItemProyecto;
use App\Models\PresupuestoMaterialProyecto;
use App\Models\Proyecto;
use App\Models\StockMaterial;
use App\Models\User;
use App\Notifications\SobreentregaMaterialNotification;
use App\Services\Almacenes\RecetaResolverService;
use App\Services\Almacenes\StockService;
use App\Services\Almacenes\TrazabilidadMaterialesService;
use App\Services\Proyectos\RecalculoFinancieroService;
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
        private StockService               $stockService,
        private TrazabilidadMaterialesService $trazabilidad,
        private RecetaResolverService      $recetaResolver,
        private RecalculoFinancieroService $recalculoFinanciero,
    ) {}

    // ─── ENTRADA (compra) ────────────────────────────────────────────────────────

    public function registrarEntrada(array $data, int $userId): MovimientoAlmacen
    {
        $movimiento = DB::transaction(function () use ($data, $userId) {
            $almacen = Almacen::findOrFail($data['almacen_id']);

            // Resolver nombre del proveedor desde FK si se envió proveedor_id
            $proveedorId     = isset($data['proveedor_id']) && $data['proveedor_id'] ? (int) $data['proveedor_id'] : null;
            $proveedorNombre = $data['proveedor_nombre'] ?? null;
            if ($proveedorId && !$proveedorNombre) {
                $proveedorNombre = Proveedor::find($proveedorId)?->razon_social;
            }

            $movimiento = MovimientoAlmacen::create([
                'codigo'             => MovimientoAlmacen::generarCodigo('entrada_compra'),
                'tipo'               => 'entrada_compra',
                'estado'             => 'completado',
                'almacen_origen_id'  => null,
                'almacen_destino_id' => $almacen->id,
                'proyecto_id'        => $data['proyecto_id'] ?? null,
                'proveedor_id'       => $proveedorId,
                'proveedor_nombre'   => $proveedorNombre,
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

            return $movimiento;
        });

        // ── Evidencias: solo se escriben a disco una vez confirmado el commit ──
        // (evita archivos huérfanos si la transacción anterior se revierte)
        if (!empty($data['evidencias'])) {
            $this->guardarEvidencias($movimiento->id, $data['evidencias'], $userId);
        }

        return $movimiento->load(['detalles.material', 'almacenDestino', 'evidencias']);
    }

    // ─── SALIDA SOCIAL (entrega a beneficiario) ──────────────────────────────────

    /**
     * Creates one MovimientoAlmacen per item in a single transaction.
     * When items_distribucion is empty, registers an extra delivery without item linkage.
     * Returns array of created movements.
     */
    public function registrarSalidaSocial(array $data, int $userId): array
    {
        $movimientoIdEvidencias = null;

        $movimientos = DB::transaction(function () use ($data, $userId, &$movimientoIdEvidencias) {
            $almacen      = Almacen::findOrFail($data['almacen_id']);
            $beneficiario = Beneficiario::findOrFail($data['beneficiario_id']);
            $materialId   = (int) $data['material_id'];
            $itemsDist    = $data['items_distribucion'] ?? [];
            $proyectoId   = $almacen->proyecto_id;
            $movimientos  = [];
            $concepto     = "Entrega social — " . ($beneficiario->nombre_completo ?? "BEN#{$beneficiario->id}");

            if (empty($itemsDist)) {
                // ── Entrega adicional sin ítem (todos los ítems ya completos) ─────
                if (empty(trim($data['justificacion_sobre_consumo'] ?? ''))) {
                    throw ValidationException::withMessages([
                        'justificacion_sobre_consumo' => 'Se requiere justificación para entregas sin ítem vinculado.',
                    ]);
                }
                $mov = $this->crearMovimientoIndividual(
                    $almacen, $beneficiario, null,
                    $materialId, (float) $data['cantidad_total'],
                    $data['justificacion_sobre_consumo'], $data, $userId, $concepto
                );
                $movimientoIdEvidencias = $mov->id;
                $movimientos[] = $mov;
            } else {
                // ── Un movimiento por ítem ────────────────────────────────────────
                foreach ($itemsDist as $idx => $dist) {
                    $itemPpto = PresupuestoItemProyecto::findOrFail($dist['presupuesto_item_proyecto_id']);
                    $cantidad = (float) $dist['cantidad'];
                    $just     = $dist['justificacion'] ?? null;

                    // Validate over-consumption
                    $pct = $this->calcularPorcentajeConsumo($itemPpto->id, $materialId, $cantidad);
                    if ($pct > self::UMBRAL_BLOQUEO * 100 && empty($data['aprobado_por_id'])) {
                        throw new \RuntimeException(
                            "Entrega supera 150% para ítem «{$itemPpto->itemConstructivo?->nombre}». Requiere aprobación."
                        );
                    }
                    if ($pct > self::UMBRAL_ALERTA * 100 && empty(trim($just ?? ''))) {
                        throw ValidationException::withMessages([
                            "items_distribucion.{$idx}.justificacion" =>
                                'El consumo supera 110% del presupuesto. Se requiere justificación.',
                        ]);
                    }

                    $mov = $this->crearMovimientoIndividual(
                        $almacen, $beneficiario, $itemPpto,
                        $materialId, $cantidad, $just, $data, $userId, $concepto
                    );

                    // Evidencias solo en el primer movimiento
                    if ($idx === 0) {
                        $movimientoIdEvidencias = $mov->id;
                    }

                    $this->registrarPrimeraEntrega($itemPpto);
                    $modalidad = $this->detectarModalidad($itemPpto, [['material_id' => $materialId, 'cantidad' => $cantidad]]);
                    $this->actualizarEstadoItem($itemPpto, $modalidad);

                    $proyectoId = $proyectoId ?? $itemPpto->proyecto_id;

                    // Sobreentregas por ítem
                    if ($proyectoId) {
                        $mov->load('detalles');
                        $this->procesarSobreentregas(
                            $proyectoId, $itemPpto, $beneficiario,
                            [['material_id' => $materialId, 'cantidad' => $cantidad]],
                            $mov->detalles,
                            $just ?? ''
                        );
                    }

                    $movimientos[] = $mov;
                }
            }

            // Hook de trazabilidad (una vez por material)
            if ($proyectoId) {
                $this->trazabilidad->recalcularMaterial((int) $proyectoId, $materialId);
            }

            return $movimientos;
        });

        // ── Evidencias: solo se escriben a disco una vez confirmado el commit ──
        // (evita archivos huérfanos si la transacción anterior se revierte)
        if (!empty($data['evidencias']) && $movimientoIdEvidencias) {
            $this->guardarEvidencias($movimientoIdEvidencias, $data['evidencias'], $userId);
        }

        return $movimientos;
    }

    private function crearMovimientoIndividual(
        Almacen $almacen,
        Beneficiario $beneficiario,
        ?PresupuestoItemProyecto $itemPpto,
        int $materialId,
        float $cantidad,
        ?string $justificacion,
        array $data,
        int $userId,
        string $concepto
    ): MovimientoAlmacen {
        $pct        = $itemPpto ? $this->calcularPorcentajeConsumo($itemPpto->id, $materialId, $cantidad) : 0;
        $modalidad  = $itemPpto
            ? $this->detectarModalidad($itemPpto, [['material_id' => $materialId, 'cantidad' => $cantidad]])
            : null;

        $movimiento = MovimientoAlmacen::create([
            'codigo'                       => MovimientoAlmacen::generarCodigo('salida_social'),
            'tipo'                         => 'salida_social',
            'estado'                       => 'completado',
            'almacen_origen_id'            => $almacen->id,
            'almacen_destino_id'           => null,
            'proyecto_id'                  => $almacen->proyecto_id ?? $itemPpto?->proyecto_id,
            'beneficiario_id'              => $beneficiario->id,
            'presupuesto_item_proyecto_id' => $itemPpto?->id,
            'modalidad_entrega'            => $modalidad,
            'justificacion_sobre_consumo'  => $justificacion,
            'requiere_aprobacion'          => $pct > self::UMBRAL_BLOQUEO * 100,
            'aprobado_por_id'              => $data['aprobado_por_id'] ?? null,
            'aprobado_en'                  => isset($data['aprobado_por_id']) ? now() : null,
            'notas'                        => $data['notas'] ?? null,
            'registrado_por_id'            => $userId,
            'fecha_movimiento'             => now(),
            'monto_total'                  => 0,
        ]);

        $kardex = $this->stockService->registrarSalida(
            almacenId:           $almacen->id,
            materialId:          $materialId,
            cantidad:            $cantidad,
            concepto:            $concepto,
            actorId:             $userId,
            referenciaTipo:      'MovimientoAlmacen',
            referenciaId:        $movimiento->id,
            movimientoAlmacenId: $movimiento->id,
        );

        DetalleMovimientoAlmacen::create([
            'movimiento_almacen_id'  => $movimiento->id,
            'material_id'            => $materialId,
            'cantidad'               => $cantidad,
            'precio_unitario'        => $kardex->precio_unitario,
            'pmp_anterior'           => $kardex->saldo_anterior,
            'pmp_posterior'          => $kardex->saldo_posterior,
            'saldo_anterior'         => $kardex->saldo_anterior,
            'saldo_posterior'        => $kardex->saldo_posterior,
            'movimiento_material_id' => $kardex->id,
            'porcentaje_presupuesto' => $pct,
            'observacion'            => null,
        ]);

        $movimiento->update(['monto_total' => $kardex->costo_total]);

        return $movimiento;
    }

    // ─── SALIDA PRIVADA (entrega a personal) ─────────────────────────────────────

    public function registrarSalidaPrivada(array $data, int $userId): MovimientoAlmacen
    {
        $movimiento = DB::transaction(function () use ($data, $userId) {
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

            return $movimiento;
        });

        // ── Evidencias: solo se escriben a disco una vez confirmado el commit ──
        // (evita archivos huérfanos si la transacción anterior se revierte)
        if (!empty($data['evidencias'])) {
            $this->guardarEvidencias($movimiento->id, $data['evidencias'], $userId);
        }

        return $movimiento->load(['detalles.material', 'receptorPersonal', 'evidencias']);
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
     * Calculates over-delivery cost for materials that exceed 100% of planned quantity.
     * Adds the cost to proyecto.sobreentregas_materiales and triggers GG recalculation.
     * Notifies admin/gerente users.
     */
    private function procesarSobreentregas(
        int $proyectoId,
        PresupuestoItemProyecto $itemPpto,
        Beneficiario $beneficiario,
        array $materialesData,
        $detalles,
        string $justificacion
    ): void {
        $costoExtra = 0.0;
        $sobreentregas = [];

        foreach ($materialesData as $mat) {
            $teoricoTotal = $this->getCantidadPlanificadaMaterial($itemPpto, $mat['material_id']);
            if ($teoricoTotal <= 0) continue;

            $entregadoTotal = (float) DetalleMovimientoAlmacen::whereHas('movimiento', fn($q) => $q
                ->where('presupuesto_item_proyecto_id', $itemPpto->id)
                ->whereNotIn('estado', ['anulado', 'borrador'])
            )->where('material_id', $mat['material_id'])->sum('cantidad');

            if ($entregadoTotal <= $teoricoTotal) continue;

            $exceso       = $entregadoTotal - $teoricoTotal;
            $detalle      = $detalles->firstWhere('material_id', $mat['material_id']);
            $precioUnit   = $detalle ? (float) $detalle->precio_unitario : 0.0;
            $costoExceso  = round($exceso * $precioUnit, 4);
            $costoExtra  += $costoExceso;
            $porcentajeEx = $teoricoTotal > 0 ? round(($exceso / $teoricoTotal) * 100, 2) : 0;

            $sobreentregas[] = [
                'material_id'     => $mat['material_id'],
                'exceso'          => $exceso,
                'costo'           => $costoExceso,
                'porcentaje'      => $porcentajeEx,
            ];
        }

        if ($costoExtra <= 0) return;

        // Accumulate cost in proyecto
        Proyecto::where('id', $proyectoId)->increment('sobreentregas_materiales', $costoExtra);

        // Recalculate GG residual
        $proyecto = Proyecto::find($proyectoId);
        if ($proyecto) {
            $this->recalculoFinanciero->recalcularMaterialesYGG($proyecto);
        }

        // Notify admin and gerente roles
        $admins = User::permission(['proyectos.aprobar', 'admin'])->get();
        foreach ($sobreentregas as $sb) {
            $material = Material::find($sb['material_id']);
            foreach ($admins as $admin) {
                $admin->notify(new SobreentregaMaterialNotification(
                    proyectoId:         $proyectoId,
                    proyectoNombre:     $proyecto?->nombre ?? "Proyecto #{$proyectoId}",
                    materialNombre:     $material?->nombre ?? "Material #{$sb['material_id']}",
                    beneficiarioId:     $beneficiario->id,
                    beneficiarioNombre: $beneficiario->nombre_completo ?? "Ben #{$beneficiario->id}",
                    costoSobreentrega:  $sb['costo'],
                    porcentajeExceso:   $sb['porcentaje'],
                    justificacion:      $justificacion,
                ));
            }
        }
    }

    /**
     * Registers the timestamp of the very first material delivery for an item.
     * Used as the start of the 3-day no-report alert countdown.
     */
    private function registrarPrimeraEntrega(PresupuestoItemProyecto $item): void
    {
        if ($item->fecha_primera_entrega_material === null) {
            $item->update(['fecha_primera_entrega_material' => now()]);
        }
    }

    /**
     * Updates estado_ejecucion based on delivery modality.
     * Does NOT touch porcentaje_avance — progress must be reported manually.
     */
    private function actualizarEstadoItem(PresupuestoItemProyecto $item, string $modalidad): void
    {
        if ($item->estado_ejecucion === 'terminado') {
            return; // Already marked done by user — don't revert
        }

        // Only transition to en_proceso via photo reports (ReporteAvanceService),
        // not material delivery — avoids showing 0% items as "en proceso".
    }

    private function guardarEvidencias(int $movimientoId, array $evidencias, int $userId): void
    {
        // Se ejecuta fuera de la transacción del movimiento: si una foto falla
        // (base64 corrupto, etc.) no debe hacer parecer que el movimiento no se guardó.
        foreach ($evidencias as $ev) {
            try {
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
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('No se pudo guardar evidencia de movimiento', [
                    'movimiento_almacen_id' => $movimientoId,
                    'error'                 => $e->getMessage(),
                ]);
            }
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
