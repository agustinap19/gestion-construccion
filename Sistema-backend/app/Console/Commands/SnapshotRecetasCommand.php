<?php

namespace App\Console\Commands;

use App\Models\OverrideItemProyecto;
use App\Models\PresupuestoItemProyecto;
use App\Models\RecetaItem;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SnapshotRecetasCommand extends Command
{
    protected $signature = 'recetas:snapshot
                            {--proyecto_id= : Solo snapshot para este proyecto}
                            {--dry-run : Muestra qué haría sin insertar nada}';

    protected $description = 'Crea snapshots de recetas para proyectos sin overrides (backfill de proyectos existentes)';

    public function handle(): int
    {
        $dryRun    = $this->option('dry-run');
        $proyectoId = $this->option('proyecto_id');

        $query = PresupuestoItemProyecto::query()
            ->select('proyecto_id', 'item_constructivo_id')
            ->distinct();

        if ($proyectoId) {
            $query->where('proyecto_id', $proyectoId);
        }

        // Solo pips cuyo proyecto+item NO tiene ya un snapshot tipología
        $query->whereNotExists(function ($sub) {
            $sub->from('overrides_items_proyecto as oip')
                ->whereColumn('oip.proyecto_id', 'presupuesto_items_proyecto.proyecto_id')
                ->whereColumn('oip.item_constructivo_id', 'presupuesto_items_proyecto.item_constructivo_id')
                ->whereNull('oip.vivienda_id')
                ->where('oip.nivel', 'tipologia');
        });

        $pares = $query->get();

        if ($pares->isEmpty()) {
            $this->info('No hay pares proyecto+item sin snapshot. Todo correcto.');
            return 0;
        }

        $this->info("Pares proyecto+item sin snapshot: {$pares->count()}");

        $creados = 0;
        $bar     = $this->output->createProgressBar($pares->count());
        $bar->start();

        foreach ($pares as $par) {
            $recetas = RecetaItem::where('item_constructivo_id', $par->item_constructivo_id)->get();
            foreach ($recetas as $r) {
                if (!$dryRun) {
                    OverrideItemProyecto::firstOrCreate(
                        [
                            'proyecto_id'          => $par->proyecto_id,
                            'item_constructivo_id' => $par->item_constructivo_id,
                            'material_id'          => $r->material_id,
                            'vivienda_id'          => null,
                        ],
                        [
                            'cantidad_por_unidad_base' => $r->cantidad_por_unidad_base,
                            'nivel'                    => 'tipologia',
                            'justificacion'            => 'Snapshot backfill — recetas:snapshot command.',
                            'usuario_autorizador_id'   => null,
                        ]
                    );
                }
                $creados++;
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();

        $verbo = $dryRun ? 'Se crearían' : 'Creados';
        $this->info("{$verbo} {$creados} snapshot(s) de receta.");

        if ($dryRun) {
            $this->warn('Modo dry-run: no se insertó nada. Ejecuta sin --dry-run para aplicar.');
        }

        return 0;
    }
}
