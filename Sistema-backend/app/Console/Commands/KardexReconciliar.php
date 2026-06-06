<?php

namespace App\Console\Commands;

use App\Services\Almacenes\StockService;
use Illuminate\Console\Command;

class KardexReconciliar extends Command
{
    protected $signature = 'kardex:reconciliar {--almacen= : ID del almacén a reconciliar (todos si se omite)}';
    protected $description = 'Recalcula el kardex y corrige discrepancias de stock vs. movimientos registrados';

    public function __construct(protected StockService $stockService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $almacenId = $this->option('almacen') ? (int) $this->option('almacen') : null;

        $this->info($almacenId
            ? "Reconciliando kardex del almacén #{$almacenId}..."
            : 'Reconciliando kardex de todos los almacenes...'
        );

        $resultado = $this->stockService->reconciliarKardex($almacenId);

        $this->info("Stocks revisados : {$resultado['stocks_revisados']}");
        $this->info("Discrepancias    : {$resultado['discrepancias']}");

        if ($resultado['discrepancias'] > 0) {
            $this->warn('Se corrigieron las siguientes discrepancias:');
            $headers = ['Almacén', 'Material', 'Cantidad BD', 'Calculada', 'PMP BD', 'PMP Calculado'];
            $rows    = array_map(fn($d) => [
                $d['almacen'],
                $d['material'],
                $d['cantidad_bd'],
                $d['cantidad_calculada'],
                $d['pmp_bd'],
                $d['pmp_calculado'],
            ], $resultado['detalle']);
            $this->table($headers, $rows);
        } else {
            $this->info('Sin discrepancias. Kardex consistente.');
        }

        return self::SUCCESS;
    }
}
