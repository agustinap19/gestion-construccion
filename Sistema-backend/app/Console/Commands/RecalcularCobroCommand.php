<?php

namespace App\Console\Commands;

use App\Models\HitoCobro;
use App\Models\Proyecto;
use Illuminate\Console\Command;

class RecalcularCobroCommand extends Command
{
    protected $signature   = 'cobros:recalcular {--proyecto= : ID de proyecto específico}';
    protected $description = 'Recalcula monto_calculado de todos los hitos de cobro: monto_contractual × porcentaje / 100';

    public function handle(): int
    {
        $proyectoId = $this->option('proyecto');

        $query = Proyecto::with('hitosCobro');
        if ($proyectoId) {
            $query->where('id', $proyectoId);
        }

        $proyectos = $query->get();
        $totalFix  = 0;
        $totalSkip = 0;

        $this->info("Recalculando montos de hitos de cobro ({$proyectos->count()} proyectos)...");
        $this->newLine();

        foreach ($proyectos as $proyecto) {
            $contractual = (float) $proyecto->monto_contractual_efectivo;
            $hitos       = $proyecto->hitosCobro;

            if ($hitos->isEmpty()) {
                $this->line("  [SKIP] {$proyecto->nombre} — sin hitos de cobro");
                $totalSkip++;
                continue;
            }

            if ($contractual <= 0) {
                $this->warn("  [WARN] {$proyecto->nombre} — monto_contractual = 0, se omite");
                $totalSkip++;
                continue;
            }

            $this->line("  Proyecto: <fg=cyan>{$proyecto->nombre}</> (ID {$proyecto->id}) — Contrato: Bs. " . number_format($contractual, 2));

            $sumaPct = 0;
            foreach ($hitos as $hito) {
                $pct           = (float) $hito->porcentaje_contrato;
                $montoAntes    = (float) $hito->monto_calculado;
                $montoCorrecto = round($contractual * $pct / 100, 2);
                $sumaPct      += $pct;

                if (abs($montoAntes - $montoCorrecto) > 0.01) {
                    $hito->monto_calculado = $montoCorrecto;
                    $hito->save();
                    $this->line("    ✓ {$hito->nombre}: {$pct}%  Bs. " . number_format($montoAntes, 2) . " → <fg=green>Bs. " . number_format($montoCorrecto, 2) . "</>");
                    $totalFix++;
                } else {
                    $this->line("    = {$hito->nombre}: {$pct}%  Bs. " . number_format($montoCorrecto, 2) . " (ya correcto)");
                }
            }

            $sumaMonto    = round($hitos->fresh()->sum('monto_calculado'), 2);
            $simboloPct   = abs($sumaPct - 100) < 0.01 ? '<fg=green>✓</>' : '<fg=yellow>⚠ </>';
            $this->line("    {$simboloPct} Suma porcentajes: {$sumaPct}%   Suma montos: Bs. " . number_format($sumaMonto, 2));
            $this->newLine();
        }

        $this->info("─────────────────────────────────────────────────");
        $this->info("Hitos corregidos  : {$totalFix}");
        $this->info("Proyectos omitidos: {$totalSkip}");
        $this->newLine();
        $this->info("✅  Recálculo completado.");

        return self::SUCCESS;
    }
}
