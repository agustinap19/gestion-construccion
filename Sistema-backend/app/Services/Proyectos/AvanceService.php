<?php

namespace App\Services\Proyectos;

use App\Models\PresupuestoItemProyecto;
use App\Models\Proyecto;
use App\Models\ReporteAvance;
use App\Models\Vivienda;
use Illuminate\Support\Facades\DB;

class AvanceService
{
    /**
     * Recalcula en cascada: ítem → vivienda → proyecto.
     * Todo en una transacción atómica.
     * Se llama después de crear o actualizar un ReporteAvance,
     * tanto desde la web como desde la app móvil.
     */
    public function recalcularCascada(ReporteAvance $reporte): void
    {
        DB::transaction(function () use ($reporte) {
            $pip = PresupuestoItemProyecto::findOrFail($reporte->presupuesto_item_proyecto_id);

            // 1. Actualizar avance del ítem al último reporte aprobado
            $ultimoAvance = ReporteAvance::where('presupuesto_item_proyecto_id', $pip->id)
                ->where('estado', 'aprobado')
                ->orderByDesc('fecha_reporte')
                ->value('porcentaje_avance');

            $avanceItem = $ultimoAvance !== null ? (float) $ultimoAvance : 0.0;

            $estadoNuevo = match (true) {
                $avanceItem >= 100 => 'terminado',
                $avanceItem > 0   => 'en_proceso',
                default           => 'pendiente',
            };

            $pip->porcentaje_avance = $avanceItem;
            $pip->estado_ejecucion  = $estadoNuevo;
            $pip->save();

            // 2. Recalcular avance de la vivienda (suma ponderada)
            $this->recalcularVivienda($pip->vivienda_id);

            // 3. Recalcular avance del proyecto (promedio de viviendas)
            $this->recalcularProyecto($pip->proyecto_id);
        });
    }

    /**
     * Recalcula avance de vivienda a partir de sus PIPs.
     * avance = SUM(pip.porcentaje_avance × pip.ponderacion_avance) / SUM(pip.ponderacion_avance)
     */
    public function recalcularVivienda(int $viviendaId): float
    {
        $pips = PresupuestoItemProyecto::where('vivienda_id', $viviendaId)->get();

        if ($pips->isEmpty()) {
            return 0.0;
        }

        $totalPond = (float) $pips->sum('ponderacion_avance');
        $avance    = $totalPond > 0
            ? $pips->sum(fn ($p) => (float) $p->porcentaje_avance * (float) $p->ponderacion_avance) / $totalPond
            : (float) ($pips->avg('porcentaje_avance') ?? 0.0);

        $avance   = round($avance, 2);
        $vivienda = Vivienda::findOrFail($viviendaId);

        $vivienda->porcentaje_avance = $avance;

        if ($vivienda->estado !== 'con_observaciones') {
            $vivienda->estado = match (true) {
                $avance >= 100 => 'entregada',
                $avance >= 90  => 'acabados',
                $avance >= 75  => 'obra_fina',
                $avance >= 50  => 'obra_gruesa',
                $avance >= 25  => 'cimentacion',
                $avance > 0    => 'terreno_preparado',
                default        => 'planificada',
            };
        }

        $vivienda->save();

        return $avance;
    }

    /**
     * Recalcula avance del proyecto como promedio de avance de todas sus viviendas.
     */
    public function recalcularProyecto(int $proyectoId): float
    {
        $proyecto = Proyecto::findOrFail($proyectoId);

        $avance = (float) (Vivienda::where('proyecto_id', $proyectoId)
            ->whereNull('deleted_at')
            ->avg('porcentaje_avance') ?? 0.0);

        $proyecto->avance_fisico = round($avance, 2);

        if ($proyecto->avance_fisico > 0 && in_array($proyecto->estado, ['formulacion', 'licitacion', 'adjudicado'])) {
            $proyecto->estado = 'en_ejecucion';
        } elseif ($proyecto->avance_fisico >= 100 && $proyecto->estado === 'en_ejecucion') {
            $proyecto->estado = 'finalizado';
        }

        $proyecto->save();

        return $proyecto->avance_fisico;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Distancia en km entre dos puntos (fórmula Haversine).
     */
    public function distanciaKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R    = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a    = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        $c    = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $R * $c;
    }
}
