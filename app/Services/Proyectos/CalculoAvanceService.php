<?php

namespace App\Services\Proyectos;

use App\Models\Proyecto;
use App\Models\Vivienda;
use App\Models\FaseProyecto;

/**
 * Servicio dedicado al cálculo de avance de proyectos.
 * Invocado desde ViviendaService y FaseProyectoService para evitar dependencias circulares.
 */
class CalculoAvanceService
{
    /**
     * Recalcula el avance de un proyecto según su categoría.
     */
    public function recalcularAvance(int $proyectoId): float
    {
        $proyecto = Proyecto::findOrFail($proyectoId);

        if ($proyecto->es_social) {
            return $this->recalcularAvanceProyectoSocial($proyecto);
        }

        return $this->recalcularAvanceProyectoPrivado($proyecto);
    }

    /**
     * Proyectos sociales: promedio del avance de viviendas activas (no eliminadas).
     * Regla 13: porcentaje_avance = promedio de viviendas.
     */
    public function recalcularAvanceProyectoSocial(Proyecto $proyecto): float
    {
        $viviendas = $proyecto->viviendas()->get();

        if ($viviendas->isEmpty()) {
            $avance = 0;
        } else {
            $avance = round($viviendas->avg('porcentaje_avance'), 2);
        }

        $proyecto->porcentaje_avance = $avance;
        $proyecto->save();

        return $avance;
    }

    /**
     * Proyectos privados: suma ponderada de (avance_interno * peso_porcentual / 100).
     * Regla 13: cada fase contribuye según su peso porcentual.
     */
    public function recalcularAvanceProyectoPrivado(Proyecto $proyecto): float
    {
        $fases = $proyecto->fasesProyecto()
            ->whereNotIn('estado', ['cancelada'])
            ->get();

        if ($fases->isEmpty()) {
            $avance = 0;
        } else {
            // Cada fase contribuye: (porcentaje_avance_interno * peso_porcentual) / 100
            $avance = $fases->sum(function ($fase) {
                return ($fase->porcentaje_avance_interno * $fase->peso_porcentual) / 100;
            });
            $avance = round($avance, 2);
        }

        $proyecto->porcentaje_avance = $avance;
        $proyecto->save();

        return $avance;
    }

    /**
     * Regla 15: Valida que cantidad_unidades coincida con el count real.
     * Actualiza el campo si difiere.
     */
    public function validarConsistenciaUnidades(int $proyectoId): array
    {
        $proyecto = Proyecto::findOrFail($proyectoId);

        if ($proyecto->es_social) {
            $countReal = $proyecto->viviendas()->count();
        } else {
            $countReal = $proyecto->fasesProyecto()
                ->whereNotIn('estado', ['cancelada'])
                ->count();
        }

        $consistent = $proyecto->cantidad_unidades === $countReal;

        if (!$consistent) {
            $proyecto->cantidad_unidades = $countReal;
            $proyecto->save();
        }

        return [
            'consistente' => $consistent,
            'cantidad_registrada' => $proyecto->getOriginal('cantidad_unidades'),
            'cantidad_real' => $countReal,
        ];
    }
}
