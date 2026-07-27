<?php

namespace App\Observers;

use App\Models\AsignacionActivo;

class AsignacionActivoObserver
{
    public function created(AsignacionActivo $asignacion): void
    {
        if ($asignacion->estado === 'activa') {
            $asignacion->activo()->update(['estado' => 'asignado']);
        }
    }

    public function updating(AsignacionActivo $asignacion): void
    {
        if ($asignacion->isDirty('estado') && $asignacion->estado === 'completada') {
            $costoDiaUso = (float) ($asignacion->activo?->costo_dia_uso ?? 0);
            $asignacion->costo_total_real = round((float) $asignacion->horas_reales_acumuladas * ($costoDiaUso / 8), 2);
        }
    }

    public function updated(AsignacionActivo $asignacion): void
    {
        if (! $asignacion->wasChanged('estado')) {
            return;
        }

        if ($asignacion->estado === 'activa') {
            $asignacion->activo()->update(['estado' => 'asignado']);
        } elseif (in_array($asignacion->estado, ['completada', 'cancelada'], true)) {
            // No forzar 'disponible' a ciegas: si el flujo que completó la asignación
            // (p.ej. ActaEntregaService al registrar una devolución dañada) ya dejó el
            // activo en 'mantenimiento' o 'baja', respetar esa decisión.
            $activo = $asignacion->activo()->first();
            if ($activo && !in_array($activo->estado, ['mantenimiento', 'baja'], true)) {
                $activo->update(['estado' => $activo->necesitaMantenimiento() ? 'mantenimiento' : 'disponible']);
            }
        }
    }
}
