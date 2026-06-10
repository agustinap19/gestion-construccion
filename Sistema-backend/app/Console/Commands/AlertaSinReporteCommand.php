<?php

namespace App\Console\Commands;

use App\Models\HistorialCambioItem;
use App\Models\PresupuestoItemProyecto;
use Illuminate\Console\Command;

class AlertaSinReporteCommand extends Command
{
    protected $signature   = 'items:alertar-sin-reporte';
    protected $description = 'Marca alerta_sin_reporte en ítems con materiales entregados hace 3+ días sin reporte de avance.';

    public function handle(): int
    {
        $umbralDias = 3;
        $corte      = now()->subDays($umbralDias);

        // Candidates: first delivery happened more than 3 days ago, item not finished
        $candidatos = PresupuestoItemProyecto::query()
            ->whereNotNull('fecha_primera_entrega_material')
            ->where('fecha_primera_entrega_material', '<=', $corte)
            ->where('estado_ejecucion', '!=', 'terminado')
            ->where('alerta_sin_reporte', false)
            ->get();

        $marcados = 0;
        foreach ($candidatos as $pip) {
            $tieneReporte = HistorialCambioItem::where('pip_id', $pip->id)
                ->where('tipo_cambio', 'avance')
                ->where('created_at', '>=', $pip->fecha_primera_entrega_material)
                ->exists();

            if (!$tieneReporte) {
                $pip->update(['alerta_sin_reporte' => true]);
                $marcados++;
            }
        }

        // Clear alert if a report was registered since then
        $conReporte = PresupuestoItemProyecto::where('alerta_sin_reporte', true)->get();
        $limpiados  = 0;
        foreach ($conReporte as $pip) {
            $tieneReporte = HistorialCambioItem::where('pip_id', $pip->id)
                ->where('tipo_cambio', 'avance')
                ->where('created_at', '>=', $pip->fecha_primera_entrega_material)
                ->exists();

            if ($tieneReporte || $pip->estado_ejecucion === 'terminado') {
                $pip->update(['alerta_sin_reporte' => false]);
                $limpiados++;
            }
        }

        $this->info("Alertas marcadas: {$marcados} | Alertas limpiadas: {$limpiados}");
        return self::SUCCESS;
    }
}
