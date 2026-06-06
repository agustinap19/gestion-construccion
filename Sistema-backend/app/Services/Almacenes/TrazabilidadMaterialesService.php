<?php

namespace App\Services\Almacenes;

use App\Models\Almacen;
use App\Models\DetalleMovimientoAlmacen;
use App\Models\Material;
use App\Models\MovimientoAlmacen;
use App\Models\PresupuestoMaterialProyecto;
use App\Models\Proyecto;
use App\Models\StockMaterial;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * TrazabilidadMaterialesService
 *
 * Responsable de mantener las columnas cacheadas de trazabilidad en
 * presupuesto_material_proyecto completamente consistentes con los
 * movimientos reales del almacén.
 *
 * Identidad contable que debe cumplirse SIEMPRE:
 *   Comprado = EnAlmacén + DevueltoCentral + EntregadoObra + Merma + Retrabajo
 *
 * Llamar SIEMPRE dentro de la misma transacción del movimiento.
 */
class TrazabilidadMaterialesService
{
    /**
     * Recalcula las columnas de trazabilidad para un material específico de un proyecto.
     * Invocado después de cada movimiento que afecta stock.
     *
     * @param int $proyectoId  ID del proyecto
     * @param int $materialId  ID del material
     */
    public function recalcularMaterial(int $proyectoId, int $materialId): void
    {
        // Buscar el registro de presupuesto
        $pmp = PresupuestoMaterialProyecto::where('proyecto_id', $proyectoId)
            ->where('material_id', $materialId)
            ->whereNull('deleted_at')
            ->first();

        // Si no hay entrada en presupuesto para este material, no hay nada que actualizar
        if (!$pmp) {
            return;
        }

        // Obtener el almacén del proyecto (no central)
        $almacenProyecto = Almacen::where('proyecto_id', $proyectoId)
            ->where('tipo', '!=', 'central')
            ->whereNull('deleted_at')
            ->first();

        if (!$almacenProyecto) {
            return;
        }

        // Almacén central (para detectar transferencias)
        $almacenCentral = Almacen::where('tipo', 'central')
            ->whereNull('deleted_at')
            ->first();

        // 1. COMPRADO: SUM de entrada_compra al almacén del proyecto (estado completado)
        $cantidadComprada = DetalleMovimientoAlmacen::whereHas('movimiento', function ($q) use ($almacenProyecto) {
            $q->where('tipo', 'entrada_compra')
              ->where('almacen_destino_id', $almacenProyecto->id)
              ->where('estado', 'completado')
              ->whereNull('deleted_at');
        })->where('material_id', $materialId)->sum('cantidad');

        // 2. EN ALMACÉN: stock físico actual del material en el almacén del proyecto
        $stockActual = StockMaterial::where('almacen_id', $almacenProyecto->id)
            ->where('material_id', $materialId)
            ->value('cantidad') ?? 0;

        // 3. DEVUELTO CENTRAL: transferencias COMPLETADAS o EN_TRANSITO desde almacén proyecto → almacén central
        $cantidadDevueltaCentral = 0;
        if ($almacenCentral) {
            $cantidadDevueltaCentral = DetalleMovimientoAlmacen::whereHas('movimiento', function ($q) use ($almacenProyecto, $almacenCentral) {
                $q->where('tipo', 'transferencia_interna')
                  ->where('almacen_origen_id', $almacenProyecto->id)
                  ->where('almacen_destino_id', $almacenCentral->id)
                  ->whereIn('estado', ['completado', 'en_transito'])
                  ->whereNull('deleted_at');
            })->where('material_id', $materialId)->sum('cantidad');
        }

        // 4. ENTREGADO OBRA: SUM de salida_social desde almacén del proyecto
        $cantidadEntregadaObra = DetalleMovimientoAlmacen::whereHas('movimiento', function ($q) use ($almacenProyecto) {
            $q->whereIn('tipo', ['salida_social', 'salida_privado'])
              ->where('almacen_origen_id', $almacenProyecto->id)
              ->whereIn('estado', ['completado', 'en_transito'])
              ->whereNull('deleted_at');
        })->where('material_id', $materialId)->sum('cantidad');

        // 5. MERMA: SUM de salida_ajuste con cantidad negativa (pérdidas)
        //    Convenio: salida_ajuste = merma. Si en el futuro hay tipo 'salida_merma', incluirlo.
        $cantidadMerma = DetalleMovimientoAlmacen::whereHas('movimiento', function ($q) use ($almacenProyecto) {
            $q->whereIn('tipo', ['salida_ajuste', 'salida_devolucion_proveedor'])
              ->where('almacen_origen_id', $almacenProyecto->id)
              ->whereIn('estado', ['completado', 'en_transito'])
              ->whereNull('deleted_at');
        })->where('material_id', $materialId)->sum('cantidad');

        // 6. RETRABAJO: inicialmente 0 (tipo reservado para futuro)
        $cantidadRetrabajo = (float) ($pmp->cantidad_retrabajo ?? 0); // conservar si se seteó externamente

        // Calcular desfase: Comprado - (EnAlmacén + Devuelto + Entregado + Merma + Retrabajo)
        $sumaSalidas = (float) $stockActual
                     + (float) $cantidadDevueltaCentral
                     + (float) $cantidadEntregadaObra
                     + (float) $cantidadMerma
                     + (float) $cantidadRetrabajo;

        $desfase          = (float) $cantidadComprada - $sumaSalidas;
        $identidadOk      = abs($desfase) < 0.001;

        // Log si hay desfase
        if (!$identidadOk) {
            Log::warning("TrazabilidadMateriales: desfase contable detectado", [
                'proyecto_id'  => $proyectoId,
                'material_id'  => $materialId,
                'comprado'     => $cantidadComprada,
                'en_almacen'   => $stockActual,
                'devuelto'     => $cantidadDevueltaCentral,
                'entregado'    => $cantidadEntregadaObra,
                'merma'        => $cantidadMerma,
                'retrabajo'    => $cantidadRetrabajo,
                'desfase'      => $desfase,
            ]);
        }

        // Persistir en la misma transacción
        $pmp->update([
            'cantidad_comprada'           => round((float) $cantidadComprada, 4),
            'cantidad_en_almacen_proyecto' => round((float) $stockActual, 4),
            'cantidad_devuelta_central'    => round((float) $cantidadDevueltaCentral, 4),
            'cantidad_entregada_obra'      => round((float) $cantidadEntregadaObra, 4),
            'cantidad_merma'               => round((float) $cantidadMerma, 4),
            'cantidad_retrabajo'           => round((float) $cantidadRetrabajo, 4),
            'desfase_contable'             => round($desfase, 4),
            'identidad_contable_ok'        => $identidadOk,
        ]);
    }

    /**
     * Recalcula TODOS los materiales presupuestados de un proyecto.
     * Usado por el comando de reconciliación y por el endpoint "reconsolidar".
     *
     * @param Proyecto $proyecto
     * @return array ['revisados' => int, 'con_desfase' => int, 'corregidos' => int]
     */
    public function recalcularProyectoCompleto(Proyecto $proyecto): array
    {
        $presupuestos = PresupuestoMaterialProyecto::where('proyecto_id', $proyecto->id)
            ->whereNull('deleted_at')
            ->get();

        $revisados   = 0;
        $conDesfase  = 0;
        $corregidos  = 0;

        foreach ($presupuestos as $pmp) {
            $desfaseAnterior = (float) $pmp->desfase_contable;
            $okAnterior      = (bool)  $pmp->identidad_contable_ok;

            $this->recalcularMaterial($proyecto->id, $pmp->material_id);

            $pmp->refresh();
            $revisados++;

            if (!$pmp->identidad_contable_ok) {
                $conDesfase++;
            }

            // Si antes tenía desfase y ahora está ok, fue corregido
            if (!$okAnterior && $pmp->identidad_contable_ok) {
                $corregidos++;
            }
        }

        return [
            'revisados'   => $revisados,
            'con_desfase' => $conDesfase,
            'corregidos'  => $corregidos,
        ];
    }

    /**
     * Verifica la identidad contable de un registro específico.
     * No persiste — solo verifica.
     *
     * @param PresupuestoMaterialProyecto $registro
     * @return bool
     */
    public function verificarIdentidadContable(PresupuestoMaterialProyecto $registro): bool
    {
        $sumaSalidas = (float) $registro->cantidad_en_almacen_proyecto
                     + (float) $registro->cantidad_devuelta_central
                     + (float) $registro->cantidad_entregada_obra
                     + (float) $registro->cantidad_merma
                     + (float) $registro->cantidad_retrabajo;

        return abs((float) $registro->cantidad_comprada - $sumaSalidas) < 0.001;
    }

    /**
     * Obtiene el detalle de movimientos de un tipo específico para un material en un proyecto.
     * Usado por el frontend cuando el usuario hace click en una columna.
     *
     * @param int $proyectoId
     * @param int $materialId
     * @param string $tipo  'compras' | 'transferencias' | 'entregas' | 'mermas'
     * @return array
     */
    public function obtenerDetalleMovimientos(int $proyectoId, int $materialId, string $tipo): array
    {
        $almacenProyecto = Almacen::where('proyecto_id', $proyectoId)
            ->where('tipo', '!=', 'central')
            ->whereNull('deleted_at')
            ->first();

        if (!$almacenProyecto) {
            return [];
        }

        $query = DetalleMovimientoAlmacen::with([
            'movimiento:id,codigo,tipo,estado,fecha_movimiento,proveedor_nombre,receptor_nombre,beneficiario_id,registrado_por_id',
            'movimiento.beneficiario:id,nombre,apellido_paterno',
            'movimiento.registradoPor:id,nombre,apellido_paterno',
        ])->where('material_id', $materialId);

        switch ($tipo) {
            case 'compras':
                $query->whereHas('movimiento', function ($q) use ($almacenProyecto) {
                    $q->where('tipo', 'entrada_compra')
                      ->where('almacen_destino_id', $almacenProyecto->id)
                      ->where('estado', 'completado');
                });
                break;

            case 'transferencias':
                $almacenCentral = Almacen::where('tipo', 'central')->whereNull('deleted_at')->first();
                $query->whereHas('movimiento', function ($q) use ($almacenProyecto, $almacenCentral) {
                    $q->where('tipo', 'transferencia_interna')
                      ->where('almacen_origen_id', $almacenProyecto->id)
                      ->when($almacenCentral, fn($q2) => $q2->where('almacen_destino_id', $almacenCentral->id))
                      ->whereIn('estado', ['completado', 'en_transito']);
                });
                break;

            case 'entregas':
                $query->whereHas('movimiento', function ($q) use ($almacenProyecto) {
                    $q->whereIn('tipo', ['salida_social', 'salida_privado'])
                      ->where('almacen_origen_id', $almacenProyecto->id)
                      ->whereIn('estado', ['completado', 'en_transito']);
                });
                break;

            case 'mermas':
                $query->whereHas('movimiento', function ($q) use ($almacenProyecto) {
                    $q->whereIn('tipo', ['salida_ajuste', 'salida_devolucion_proveedor'])
                      ->where('almacen_origen_id', $almacenProyecto->id)
                      ->whereIn('estado', ['completado', 'en_transito']);
                });
                break;
        }

        return $query->latest('created_at')->get()->map(function ($detalle) {
            $mov = $detalle->movimiento;
            return [
                'id'               => $detalle->id,
                'movimiento_codigo' => $mov?->codigo,
                'tipo'             => $mov?->tipo,
                'fecha'            => $mov?->fecha_movimiento?->toDateString(),
                'cantidad'         => (float) $detalle->cantidad,
                'precio_unitario'  => (float) $detalle->precio_unitario,
                'subtotal'         => round((float) $detalle->cantidad * (float) $detalle->precio_unitario, 2),
                'proveedor'        => $mov?->proveedor_nombre,
                'receptor'         => $mov?->receptor_nombre,
                'beneficiario'     => $mov?->beneficiario
                    ? ($mov->beneficiario->nombre . ' ' . $mov->beneficiario->apellido_paterno)
                    : null,
                'registrado_por'   => $mov?->registradoPor
                    ? ($mov->registradoPor->nombre . ' ' . $mov->registradoPor->apellido_paterno)
                    : null,
            ];
        })->toArray();
    }
}
