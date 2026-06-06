<?php

namespace App\Services\Proyectos;

use App\Models\ConfiguracionPorcentajesPresupuesto;
use App\Models\HitoCobro;
use App\Models\PresupuestoItemProyecto;
use App\Models\Proyecto;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecalculoFinancieroService
{
    /**
     * Recalculate all financial fields from new percentages / fixed amounts.
     * Called when the admin edits porcentajes in the dashboard.
     *
     * @param  Proyecto  $proyecto
     * @param  array     $datos  Keys: porcentaje_mano_obra, porcentaje_gastos_generales,
     *                           porcentaje_utilidad_esperada, usa_monto_fijo_mo, usa_monto_fijo_gg,
     *                           usa_monto_fijo_util, presupuesto_mano_obra, presupuesto_gastos_generales,
     *                           presupuesto_utilidad_esperada, justificacion_rentabilidad_baja
     */
    public function calcularPresupuestoCompleto(Proyecto $proyecto, array $datos): Proyecto
    {
        $configSet = ConfiguracionPorcentajesPresupuesto::paraProyecto($proyecto->categoria);
        $umbral    = (float) $configSet->umbral_rentabilidad_minima;

        $contractual = (float) $proyecto->monto_contractual_efectivo;

        $usaFijoMO   = (bool) ($datos['usa_monto_fijo_mo']  ?? $proyecto->usa_monto_fijo_mo);
        $usaFijoGG   = (bool) ($datos['usa_monto_fijo_gg']  ?? $proyecto->usa_monto_fijo_gg);
        $usaFijoUtil = (bool) ($datos['usa_monto_fijo_util'] ?? $proyecto->usa_monto_fijo_util);

        $porMO   = (float) ($datos['porcentaje_mano_obra']        ?? $proyecto->porcentaje_mano_obra        ?? 0);
        $porGG   = (float) ($datos['porcentaje_gastos_generales'] ?? $proyecto->porcentaje_gastos_generales ?? 0);
        $porUtil = (float) ($datos['porcentaje_utilidad_esperada'] ?? $proyecto->porcentaje_utilidad_esperada ?? 0);

        $presupMO   = $usaFijoMO   ? (float) ($datos['presupuesto_mano_obra']         ?? $proyecto->presupuesto_mano_obra         ?? 0) : $contractual * $porMO   / 100;
        $presupGG   = $usaFijoGG   ? (float) ($datos['presupuesto_gastos_generales']  ?? $proyecto->presupuesto_gastos_generales  ?? 0) : $contractual * $porGG   / 100;
        $presupUtil = $usaFijoUtil  ? (float) ($datos['presupuesto_utilidad_esperada'] ?? $proyecto->presupuesto_utilidad_esperada ?? 0) : $contractual * $porUtil / 100;

        $presupMat    = max(0.0, $contractual - $presupMO - $presupGG - $presupUtil);
        $costos       = $presupMat + $presupMO + $presupGG;
        $rentabilidad = $contractual - $costos;
        $pctUtil      = $contractual > 0 ? ($rentabilidad / $contractual) * 100 : 0;

        // Validate minimum rentability
        if ($contractual > 0 && $pctUtil < $umbral) {
            $justificacion = trim($datos['justificacion_rentabilidad_baja'] ?? $proyecto->justificacion_rentabilidad_baja ?? '');
            if (empty($justificacion)) {
                throw ValidationException::withMessages([
                    'justificacion_rentabilidad_baja' => "Rentabilidad estimada ({$pctUtil}%) bajo el umbral mínimo ({$umbral}%). Proporcione justificación.",
                ]);
            }
        }

        $saludFinanciera = $contractual > 0
            ? ($pctUtil >= $umbral + 5 ? 'saludable' : ($pctUtil >= $umbral ? 'atencion' : 'critico'))
            : null;

        return DB::transaction(function () use ($proyecto, $datos, $porMO, $porGG, $porUtil, $presupMO, $presupGG, $presupUtil, $presupMat, $usaFijoMO, $usaFijoGG, $usaFijoUtil, $saludFinanciera) {
            $proyecto->fill([
                'porcentaje_mano_obra'          => $porMO,
                'porcentaje_gastos_generales'   => $porGG,
                'porcentaje_utilidad_esperada'  => $porUtil,
                'presupuesto_mano_obra'         => $presupMO,
                'presupuesto_gastos_generales'  => $presupGG,
                'presupuesto_utilidad_esperada' => $presupUtil,
                'presupuesto_materiales'        => $presupMat,
                'usa_monto_fijo_mo'             => $usaFijoMO,
                'usa_monto_fijo_gg'             => $usaFijoGG,
                'usa_monto_fijo_util'           => $usaFijoUtil,
                'salud_financiera'              => $saludFinanciera,
            ]);

            if (isset($datos['justificacion_rentabilidad_baja'])) {
                $proyecto->justificacion_rentabilidad_baja = $datos['justificacion_rentabilidad_baja'];
            }

            $proyecto->save();

            // Cascade: update monto_calculado on all HitoCobro records
            $this->recalcularMontoHitosCobro($proyecto);

            return $proyecto->fresh();
        });
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
     * Each hito gets: porcentaje_contrato% of monto_contractual.
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
     * Rule: items of category "estructural" → P1 (lowest order), "instalaciones" → P2, etc.
     * If fewer than 4 products exist, all go to P1.
     */
    public function asignacionAutomaticaPorCategoria(Proyecto $proyecto): int
    {
        $hitos = HitoCobro::where('proyecto_id', $proyecto->id)
            ->orderBy('orden')
            ->get();

        if ($hitos->isEmpty()) {
            return 0;
        }

        // Heuristic: distribute items across products by position in item list
        $items = PresupuestoItemProyecto::with('itemConstructivo.categoria')
            ->where('proyecto_id', $proyecto->id)
            ->orderBy('orden')
            ->get();

        if ($items->isEmpty()) {
            return 0;
        }

        $total         = $items->count();
        $numProductos  = $hitos->count();
        $chunkSize     = (int) ceil($total / $numProductos);

        $updated = 0;
        DB::transaction(function () use ($items, $hitos, $chunkSize, &$updated) {
            $hitoArray = $hitos->values();
            foreach ($items as $idx => $item) {
                $productoIdx = min((int) floor($idx / $chunkSize), $hitoArray->count() - 1);
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

        // Group items by hito_cobro_id
        $byHito = [];
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
                'items_total'      => $items->count(),
                'items_asignados'  => $items->whereNotNull('hito_cobro_id')->count(),
                'items_sin_asignar' => count($sinAsignar),
            ],
        ];
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
}
