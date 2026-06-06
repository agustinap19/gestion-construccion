<?php

namespace App\Services\Proyectos;

use App\Models\Proyecto;
use App\Models\FaseProyecto;

class CalculoAvanceService
{
    /**
     * Recalcula avance_fisico del proyecto como promedio de avance_porcentaje de sus fases activas.
     */
    public function recalcularAvance(int $proyectoId): float
    {
        $proyecto = Proyecto::findOrFail($proyectoId);

        $fases = $proyecto->fasesProyecto()
            ->whereNotIn('estado', ['pendiente'])
            ->get();

        if ($fases->isEmpty()) {
            $avance = 0.0;
        } else {
            $avance = round((float) $fases->avg('avance_porcentaje'), 2);
        }

        $proyecto->avance_fisico = $avance;
        $proyecto->save();

        return $avance;
    }

    /**
     * @deprecated No existe campo cantidad_unidades en el nuevo esquema.
     */
    public function validarConsistenciaUnidades(int $proyectoId): array
    {
        $proyecto = Proyecto::findOrFail($proyectoId);
        $countReal = $proyecto->fasesProyecto()
            ->whereNotIn('estado', ['completada'])
            ->count();

        return [
            'consistente'        => true,
            'cantidad_registrada' => $countReal,
            'cantidad_real'      => $countReal,
        ];
    }
}
