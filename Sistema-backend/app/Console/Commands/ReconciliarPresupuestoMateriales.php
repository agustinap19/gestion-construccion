<?php

namespace App\Console\Commands;

use App\Models\Proyecto;
use App\Services\Almacenes\TrazabilidadMaterialesService;
use Illuminate\Console\Command;

class ReconciliarPresupuestoMateriales extends Command
{
    protected $signature   = 'presupuesto:reconciliar {proyecto_id? : ID del proyecto. Omitir para reconciliar todos los activos.}';
    protected $description = 'Recalcula las columnas de trazabilidad de presupuesto_material_proyecto desde los movimientos reales.';

    public function __construct(private TrazabilidadMaterialesService $trazabilidad)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $proyectoId = $this->argument('proyecto_id');

        if ($proyectoId) {
            $proyectos = Proyecto::where('id', $proyectoId)->get();
            if ($proyectos->isEmpty()) {
                $this->error("Proyecto #{$proyectoId} no encontrado.");
                return Command::FAILURE;
            }
        } else {
            $proyectos = Proyecto::whereIn('estado', ['en_ejecucion', 'adjudicado', 'pausado'])->get();
            $this->info("Reconciliando {$proyectos->count()} proyectos activos...");
        }

        $totalRevisados  = 0;
        $totalDesfase    = 0;
        $totalCorregidos = 0;

        foreach ($proyectos as $proyecto) {
            $this->line("  → Proyecto [{$proyecto->codigo}] {$proyecto->nombre}...");

            $resultado = $this->trazabilidad->recalcularProyectoCompleto($proyecto);

            $totalRevisados  += $resultado['revisados'];
            $totalDesfase    += $resultado['con_desfase'];
            $totalCorregidos += $resultado['corregidos'];

            $estado = $resultado['con_desfase'] > 0 ? '⚠' : '✓';
            $this->line("    {$estado} {$resultado['revisados']} materiales | {$resultado['con_desfase']} con desfase | {$resultado['corregidos']} corregidos");
        }

        $this->newLine();
        $this->info("Reconciliación completa:");
        $this->table(
            ['Métrica', 'Valor'],
            [
                ['Proyectos procesados', $proyectos->count()],
                ['Materiales revisados', $totalRevisados],
                ['Materiales con desfase', $totalDesfase],
                ['Registros corregidos', $totalCorregidos],
            ]
        );

        if ($totalDesfase > 0) {
            $this->warn("⚠ Hay {$totalDesfase} materiales con desfase contable. Revise los logs para más detalles.");
            return Command::SUCCESS; // No es FAILURE — los desfases pueden ser legítimos
        }

        $this->info('✓ Sin desfases contables detectados.');
        return Command::SUCCESS;
    }
}
