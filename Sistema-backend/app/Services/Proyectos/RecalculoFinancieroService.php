<?php

namespace App\Services\Proyectos;

use App\Models\ConfiguracionPorcentajesPresupuesto;
use App\Models\HitoCobro;
use App\Models\PresupuestoItemProyecto;
use App\Models\PresupuestoMaterialProyecto;
use App\Models\Proyecto;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecalculoFinancieroService
{
    /**
     * Recalculate all financial fields when the admin edits MO/Utilidad percentages.
     * GG is NOT editable — it is always the residual after Materiales + MO + Utilidad.
     *
     * @param  Proyecto  $proyecto
     * @param  array     $datos  Keys: porcentaje_mano_obra, porcentaje_utilidad_esperada,
     *                           usa_monto_fijo_mo, usa_monto_fijo_util,
     *                           presupuesto_mano_obra, presupuesto_utilidad_esperada,
     *                           justificacion_rentabilidad_baja
     */
    public function calcularPresupuestoCompleto(Proyecto $proyecto, array $datos): Proyecto
    {
        $configSet    = ConfiguracionPorcentajesPresupuesto::paraProyecto($proyecto->categoria);
        $umbralUtil   = (float) $configSet->umbral_rentabilidad_minima;
        $umbralGGPct  = (float) ($configSet->umbral_gg_minimo ?? 3.00);

        $contractual = (float) $proyecto->monto_contractual_efectivo;

        // ── MO ───────────────────────────────────────────────────────────────
        $usaFijoMO = (bool) ($datos['usa_monto_fijo_mo']  ?? $proyecto->usa_monto_fijo_mo);
        $porMO     = (float) ($datos['porcentaje_mano_obra'] ?? $proyecto->porcentaje_mano_obra ?? 0);
        $presupMO  = $usaFijoMO
            ? (float) ($datos['presupuesto_mano_obra'] ?? $proyecto->presupuesto_mano_obra ?? 0)
            : $contractual * $porMO / 100;

        // ── Utilidad ─────────────────────────────────────────────────────────
        $usaFijoUtil = (bool) ($datos['usa_monto_fijo_util'] ?? $proyecto->usa_monto_fijo_util);
        $porUtil     = (float) ($datos['porcentaje_utilidad_esperada'] ?? $proyecto->porcentaje_utilidad_esperada ?? 0);
        $presupUtil  = $usaFijoUtil
            ? (float) ($datos['presupuesto_utilidad_esperada'] ?? $proyecto->presupuesto_utilidad_esperada ?? 0)
            : $contractual * $porUtil / 100;

        // ── Materiales: sum from DB + sobreentregas ──────────────────────────
        $sumMateriales  = (float) PresupuestoMaterialProyecto::where('proyecto_id', $proyecto->id)
            ->whereNull('deleted_at')
            ->sum('monto_total');
        $sobreentregas  = (float) ($proyecto->sobreentregas_materiales ?? 0);
        $presupMat      = $sumMateriales + $sobreentregas;

        // ── GG residual ──────────────────────────────────────────────────────
        $presupGG = $contractual - $presupMat - $presupMO - $presupUtil;
        $porGG    = $contractual > 0 ? ($presupGG / $contractual) * 100 : 0.0;

        // ── Alert: GG below minimum threshold or negative ────────────────────
        $umbralGGMonto = $contractual * $umbralGGPct / 100;
        $alertaGGBajo  = $presupGG < $umbralGGMonto;

        // ── Validate minimum utilidad ────────────────────────────────────────
        $pctUtil = $contractual > 0 ? ($presupUtil / $contractual) * 100 : 0.0;
        if ($contractual > 0 && $pctUtil < $umbralUtil) {
            $justificacion = trim($datos['justificacion_rentabilidad_baja'] ?? $proyecto->justificacion_rentabilidad_baja ?? '');
            if (empty($justificacion)) {
                throw ValidationException::withMessages([
                    'justificacion_rentabilidad_baja' => "Utilidad estimada ({$pctUtil}%) bajo el umbral mínimo ({$umbralUtil}%). Proporcione justificación.",
                ]);
            }
        }

        $saludFinanciera = $this->calcularSaludFinanciera($presupGG, $pctUtil, $umbralUtil);

        return DB::transaction(function () use (
            $proyecto, $datos,
            $porMO, $porGG, $porUtil,
            $presupMO, $presupGG, $presupUtil, $presupMat,
            $usaFijoMO, $usaFijoUtil, $alertaGGBajo, $saludFinanciera
        ) {
            $proyecto->fill([
                'porcentaje_mano_obra'          => $porMO,
                'porcentaje_gastos_generales'   => round($porGG, 4),
                'porcentaje_utilidad_esperada'  => $porUtil,
                'presupuesto_mano_obra'         => $presupMO,
                'presupuesto_gastos_generales'  => $presupGG,
                'presupuesto_utilidad_esperada' => $presupUtil,
                'presupuesto_materiales'        => $presupMat,
                'usa_monto_fijo_mo'             => $usaFijoMO,
                'usa_monto_fijo_gg'             => false,   // GG never fixed
                'usa_monto_fijo_util'           => $usaFijoUtil,
                'alerta_gg_bajo'                => $alertaGGBajo,
                'salud_financiera'              => $saludFinanciera,
            ]);

            if (isset($datos['justificacion_rentabilidad_baja'])) {
                $proyecto->justificacion_rentabilidad_baja = $datos['justificacion_rentabilidad_baja'];
            }

            $proyecto->save();
            $this->recalcularMontoHitosCobro($proyecto);

            return $proyecto->fresh();
        });
    }

    /**
     * Recalculate presupuesto_materiales from the DB sum and update GG (residual).
     * Call this whenever PIPs are added/deleted or beneficiary count changes.
     */
    public function recalcularMaterialesYGG(Proyecto $proyecto): void
    {
        $configSet   = ConfiguracionPorcentajesPresupuesto::paraProyecto($proyecto->categoria);
        $umbralGGPct = (float) ($configSet->umbral_gg_minimo ?? 3.00);
        $contractual = (float) $proyecto->monto_contractual_efectivo;

        $sumMateriales = (float) PresupuestoMaterialProyecto::where('proyecto_id', $proyecto->id)
            ->whereNull('deleted_at')
            ->sum('monto_total');
        $sobreentregas = (float) ($proyecto->sobreentregas_materiales ?? 0);
        $presupMat     = $sumMateriales + $sobreentregas;

        $presupMO   = (float) ($proyecto->presupuesto_mano_obra         ?? 0);
        $presupUtil = (float) ($proyecto->presupuesto_utilidad_esperada  ?? 0);
        $presupGG   = $contractual - $presupMat - $presupMO - $presupUtil;
        $porGG      = $contractual > 0 ? ($presupGG / $contractual) * 100 : 0.0;

        $umbralGGMonto = $contractual * $umbralGGPct / 100;
        $alertaGGBajo  = $presupGG < $umbralGGMonto;

        $pctUtil         = $contractual > 0 ? ($presupUtil / $contractual) * 100 : 0.0;
        $umbralUtil      = (float) $configSet->umbral_rentabilidad_minima;
        $saludFinanciera = $this->calcularSaludFinanciera($presupGG, $pctUtil, $umbralUtil);

        $proyecto->update([
            'presupuesto_materiales'      => $presupMat,
            'presupuesto_gastos_generales' => $presupGG,
            'porcentaje_gastos_generales'  => round($porGG, 4),
            'alerta_gg_bajo'              => $alertaGGBajo,
            'salud_financiera'            => $saludFinanciera,
        ]);
    }

    /**
     * Recalculate the monto_calculado on all HitoCobro for the project.
     */
    public function recalcularMontosComponentes(Proyecto $proyecto): void
    {
        $this->recalcularMontoHitosCobro($proyecto);
    }

    /**
     * Recalculate budget per contractual product (HitoCobro).
     */
    public function recalcularPresupuestoPorProducto(Proyecto $proyecto): void
    {
        $this->recalcularMontoHitosCobro($proyecto);
    }

    /**
     * Validates minimum rentability, throws ValidationException if below threshold.
     */
    public function validarRentabilidadMinima(Proyecto $proyecto, float $pctUtil, ?string $justificacion): void
    {
        $configSet = ConfiguracionPorcentajesPresupuesto::paraProyecto($proyecto->categoria);
        $umbral    = (float) $configSet->umbral_rentabilidad_minima;

        if ($pctUtil < $umbral && empty(trim($justificacion ?? ''))) {
            throw ValidationException::withMessages([
                'justificacion_rentabilidad_baja' => "La utilidad ({$pctUtil}%) está bajo el umbral ({$umbral}%). Proporcione justificación.",
            ]);
        }
    }

    /**
     * Auto-assign PresupuestoItemProyecto rows to HitoCobro products by constructive category.
     */
    public function asignacionAutomaticaPorCategoria(Proyecto $proyecto): int
    {
        $hitos = HitoCobro::where('proyecto_id', $proyecto->id)
            ->orderBy('orden')
            ->get();

        if ($hitos->isEmpty()) {
            return 0;
        }

        $items = PresupuestoItemProyecto::with('itemConstructivo.categoria')
            ->where('proyecto_id', $proyecto->id)
            ->orderBy('orden')
            ->get();

        if ($items->isEmpty()) {
            return 0;
        }

        $total        = $items->count();
        $numProductos = $hitos->count();
        $chunkSize    = (int) ceil($total / $numProductos);

        $updated = 0;
        DB::transaction(function () use ($items, $hitos, $chunkSize, &$updated) {
            $hitoArray = $hitos->values();
            foreach ($items as $idx => $item) {
                $productoIdx      = min((int) floor($idx / $chunkSize), $hitoArray->count() - 1);
                $item->hito_cobro_id = $hitoArray[$productoIdx]->id;
                $item->save();
                $updated++;
            }
        });

        return $updated;
    }

    /**
     * Build the Items×Productos matrix for a project.
     */
    public function obtenerMatriz(Proyecto $proyecto): array
    {
        $hitos = HitoCobro::where('proyecto_id', $proyecto->id)
            ->orderBy('orden')
            ->get(['id', 'nombre', 'tipo', 'orden', 'porcentaje_contrato', 'monto_calculado']);

        $items = PresupuestoItemProyecto::with([
            'itemConstructivo:id,nombre,codigo,unidad_base,categoria_constructiva_id',
            'itemConstructivo.categoria:id,nombre,color',
            'vivienda:id,codigo',
            'hitoCobro:id,nombre,orden',
        ])
        ->where('proyecto_id', $proyecto->id)
        ->orderBy('orden')
        ->get();

        $byHito     = [];
        $sinAsignar = [];

        foreach ($items as $item) {
            if ($item->hito_cobro_id) {
                $byHito[$item->hito_cobro_id][] = $item;
            } else {
                $sinAsignar[] = $item;
            }
        }

        return [
            'hitos'        => $hitos,
            'items'        => $items,
            'por_producto' => $byHito,
            'sin_asignar'  => $sinAsignar,
            'totales'      => [
                'items_total'       => $items->count(),
                'items_asignados'   => $items->whereNotNull('hito_cobro_id')->count(),
                'items_sin_asignar' => count($sinAsignar),
            ],
        ];
    }

    /**
     * Build the Items×Productos matrix grouped by ItemConstructivo (one row per item type).
     * Ignores per-vivienda duplication — assignment is treated as a property of the item type.
     */
    public function obtenerMatrizAgrupada(Proyecto $proyecto): array
    {
        $hitos = HitoCobro::where('proyecto_id', $proyecto->id)
            ->orderBy('orden')
            ->get(['id', 'nombre', 'tipo', 'orden', 'porcentaje_contrato', 'monto_calculado']);

        $pips = PresupuestoItemProyecto::with([
            'itemConstructivo:id,nombre,codigo,unidad_base,categoria_constructiva_id',
            'itemConstructivo.categoria:id,nombre,color',
        ])
        ->where('proyecto_id', $proyecto->id)
        ->get();

        $agrupados = $pips->groupBy('item_constructivo_id')
            ->map(function ($grupo, $icId) {
                $first   = $grupo->first();
                $hitoIds = $grupo->pluck('hito_cobro_id')->unique()->values();
                $hitoCobroId = ($hitoIds->count() === 1) ? $hitoIds->first() : null;

                return [
                    'item_constructivo_id' => (int) $icId,
                    'nombre'               => $first->itemConstructivo?->nombre ?? "Ítem #{$icId}",
                    'codigo'               => $first->itemConstructivo?->codigo,
                    'unidad_base'          => $first->itemConstructivo?->unidad_base,
                    'categoria_id'         => $first->itemConstructivo?->categoria_constructiva_id,
                    'categoria_nombre'     => $first->itemConstructivo?->categoria?->nombre,
                    'categoria_color'      => $first->itemConstructivo?->categoria?->color,
                    'cantidad_total'       => (float) $grupo->sum('cantidad_planificada'),
                    'viviendas_count'      => $grupo->count(),
                    'hito_cobro_id'        => $hitoCobroId,
                    'mixto'                => $hitoIds->count() > 1,
                ];
            })
            ->values()
            ->sortBy('nombre')
            ->values();

        $asignados = $agrupados->filter(fn($i) => $i['hito_cobro_id'] !== null)->count();

        return [
            'hitos'   => $hitos,
            'items'   => $agrupados,
            'totales' => [
                'items_total'       => $agrupados->count(),
                'items_asignados'   => $asignados,
                'items_sin_asignar' => $agrupados->count() - $asignados,
            ],
        ];
    }

    /**
     * Assign ALL PresupuestoItemProyecto rows with a given item_constructivo_id to a HitoCobro.
     * Returns the number of rows updated.
     */
    public function asignarPorItemConstructivo(Proyecto $proyecto, int $itemConstructivoId, ?int $hitoCobroId): int
    {
        return PresupuestoItemProyecto::where('proyecto_id', $proyecto->id)
            ->where('item_constructivo_id', $itemConstructivoId)
            ->update(['hito_cobro_id' => $hitoCobroId]);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private function recalcularMontoHitosCobro(Proyecto $proyecto): void
    {
        $contractual = (float) $proyecto->monto_contractual_efectivo;

        HitoCobro::where('proyecto_id', $proyecto->id)->each(function (HitoCobro $hito) use ($contractual) {
            $hito->monto_calculado = $contractual * ((float) $hito->porcentaje_contrato / 100);
            $hito->save();
        });
    }

    private function calcularSaludFinanciera(float $presupGG, float $pctUtil, float $umbralUtil): ?string
    {
        if ($presupGG < 0) {
            return 'critico';
        }
        if ($pctUtil >= $umbralUtil + 5) {
            return 'saludable';
        }
        if ($pctUtil >= $umbralUtil) {
            return 'atencion';
        }
        return 'critico';
    }
}
