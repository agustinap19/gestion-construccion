<?php

namespace App\Console\Commands;

use App\Models\Proyecto;
use App\Services\Almacenes\PresupuestoAutomaticoService;
use Illuminate\Console\Command;

class PresupuestoReconsolidar extends Command
{
    protected $signature = 'presupuesto:reconsolidar {proyecto_id? : ID del proyecto (todos los activos si se omite)}';
    protected $description = 'Recalcula el consolidado de materiales (presupuesto_material_proyecto) desde los ítems de presupuesto existentes';

    public function __construct(protected PresupuestoAutomaticoService $service)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $proyectoId = $this->argument('proyecto_id') ? (int) $this->argument('proyecto_id') : null;

        $proyectos = $proyectoId
            ? Proyecto::where('id', $proyectoId)->get()
            : Proyecto::whereNotIn('estado', ['cancelado', 'finalizado'])->get();

        if ($proyectos->isEmpty()) {
            $this->warn('No se encontraron proyectos para reconsolidar.');
            return Command::FAILURE;
        }

        $ok = 0;
        $fail = 0;

        foreach ($proyectos as $proyecto) {
            $this->line("Reconsolidando proyecto <info>{$proyecto->codigo}</info> (ID {$proyecto->id})...");
            try {
                $resultado = $this->service->recalcularConsolidado($proyecto->id, 1);
                $this->info("  ✓ {$proyecto->codigo} — " . count($resultado) . " materiales calculados.");
                $ok++;
            } catch (\Throwable $e) {
                $this->error("  ✗ {$proyecto->codigo} — {$e->getMessage()}");
                $fail++;
            }
        }

        $this->newLine();
        $this->info("Reconsolidación completa: {$ok} exitosos, {$fail} fallidos.");

        return $fail > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
