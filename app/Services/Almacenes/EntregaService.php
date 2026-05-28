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
use App\Services\Almacenes\StockService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EntregaService
{
    // Umbrales de sobre-consumo
    const UMBRAL_ALERTA     = 1.10; // 110% → amarillo + justificación
    const UMBRAL_BLOQUEO    = 1.50; // 150% → rojo + aprobación admin

    public function __construct(private StockService $stockService) {}

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

                // Actualizar cantidad_comprada en presupuesto_material_proyecto si aplica
                if (!empty($data['proyecto_id'])) {
                    PresupuestoMaterialProyecto::where('proyecto_id', $data['proyecto_id'])
                        ->where('material_id', $mat['material_id'])
                        ->increment('cantidad_comprada', $mat['cantidad']);
                }

                $montoTotal += $mat['cantidad'] * $mat['precio_unitario'];
            }

            $movimiento->update(['monto_total' => $montoTotal]);

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
            foreach ($data['materiales'] as $mat) {
                $pct = $this->calcularPorcentajeConsumo($itemPpto->id, $mat['material_id'], $mat['cantidad']);
                if ($pct > self::UMBRAL_BLOQUEO * 100) {
                    if (empty($data['aprobado_por_id'])) {
                        throw new \RuntimeException(
                            "Entrega supera el 150% del presupuesto para material {$mat['material_id']}. Requiere aprobación de administrador."
                        );
                    }
                    $requiereAprobacion = true;
                }
            }

            $movimiento = MovimientoAlmacen::create([
                'codigo'                       => MovimientoAlmacen::generarCodigo('salida_social'),
                'tipo'                         => 'salida_social',
                'estado'                       => 'completado',
                'almacen_origen_id'            => $almacen->id,
                'almacen_destino_id'           => null,
                'proyecto_id'                  => $almacen->proyecto_id ?? $itemPpto->proyecto_id,
                'beneficiario_id'              => $beneficiario->id,
                'presupuesto_item_proyecto_id' => $itemPpto->id,
                'modalidad_entrega'            => $data['modalidad_entrega'] ?? 'total',
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

                // Actualizar entregada_obra en presupuesto consolidado
                PresupuestoMaterialProyecto::where('proyecto_id', $itemPpto->proyecto_id)
                    ->where('material_id', $mat['material_id'])
                    ->increment('cantidad_entregada_obra', $mat['cantidad']);

                $montoTotal += $kardex->costo_total;
            }

            // Cascada: actualizar porcentaje_avance del ítem
            $this->actualizarAvanceItem($itemPpto, $data['materiales'], $data['modalidad_entrega'] ?? 'parcial');

            $movimiento->update(['monto_total' => $montoTotal]);

            // Guardar evidencias (foto + firma)
            if (!empty($data['evidencias'])) {
                $this->guardarEvidencias($movimiento->id, $data['evidencias'], $userId);
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

            return $movimiento->fresh();
        });
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
        // Cantidad teórica desde la receta del presupuesto
        $itemPpto = PresupuestoItemProyecto::find($itemId);
        if (!$itemPpto) return 0;

        // Buscar la cantidad planificada de ese material en el contexto del ítem
        // (mediante la receta del ítem constructivo para ese proyecto/beneficiario)
        $cantidadPlanificada = $this->getCantidadPlanificadaMaterial($itemPpto, $materialId);
        if (!$cantidadPlanificada || $cantidadPlanificada == 0) return 0;

        // Ya entregado anteriormente para este ítem + beneficiario
        $entregadoAntes = DetalleMovimientoAlmacen::whereHas('movimiento', function ($q) use ($itemId) {
            $q->where('presupuesto_item_proyecto_id', $itemId)
              ->whereNotIn('estado', ['anulado', 'borrador']);
        })->where('material_id', $materialId)->sum('cantidad');

        $totalConNuevo = $entregadoAntes + $nuevaCantidad;
        return round(($totalConNuevo / $cantidadPlanificada) * 100, 2);
    }

    private function getCantidadPlanificadaMaterial(PresupuestoItemProyecto $itemPpto, int $materialId): float
    {
        // La cantidad planificada de un material dentro de un ítem constructivo
        // se obtiene de la receta: cantidad_item × cantidad_receta_por_unidad
        $receta = $itemPpto->itemConstructivo?->recetas()
            ->where('material_id', $materialId)
            ->first();

        if (!$receta) return 0;

        return (float) ($itemPpto->cantidad_planificada * $receta->cantidad_por_unidad);
    }

    private function actualizarAvanceItem(PresupuestoItemProyecto $item, array $materiales, string $modalidad): void
    {
        if ($modalidad === 'total') {
            $item->update([
                'estado_ejecucion' => 'terminado',
                'porcentaje_avance'=> 100,
            ]);
            return;
        }

        // Parcial: calcular avance proporcional al consumo del material principal
        $maxPct = 0;
        foreach ($materiales as $mat) {
            $pct    = $this->calcularPorcentajeConsumo($item->id, $mat['material_id'], 0);
            $maxPct = max($maxPct, $pct);
        }

        $nuevoAvance = min(99, round($maxPct)); // nunca 100% en parcial

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
