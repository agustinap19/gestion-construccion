<?php

namespace App\Exports;

use App\Models\Proyecto;
use App\Services\Proyectos\CalculadoraAvanceService;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class AvanceProyectoExport extends BaseExport
{
    protected string $titulo = 'Planilla de Avance';

    private Proyecto $proyecto;
    private array    $avance;
    private Collection $unidades;

    public function __construct(int $proyectoId)
    {
        $this->proyecto = Proyecto::with([
            'responsable',
            'entidadEstatal',
            'cliente',
            'viviendas.itemsChecklist',
            'fasesProyecto.itemsChecklist',
        ])->findOrFail($proyectoId);

        $calculadora   = app(CalculadoraAvanceService::class);
        $dashboard     = $calculadora->calcularDashboard($this->proyecto);
        $this->avance  = $dashboard['avance'];
        $this->unidades = collect($this->avance['avance_por_unidad'] ?? []);
    }

    public function collection(): Collection
    {
        return $this->unidades;
    }

    public function headings(): array
    {
        return [
            'Código', 'Nombre / Beneficiario', 'Estado',
            'Items Totales', 'Items Completados',
            'Avance Real (%)', 'Avance Plazo (%)', 'Indicador',
        ];
    }

    public function map($row): array
    {
        $avanceReal  = $row['porcentaje_avance']  ?? 0;
        $avancePlazo = $this->avance['porcentaje_plazo'] ?? null;
        $indicador   = '—';
        if ($avancePlazo !== null) {
            $diff = $avancePlazo - $avanceReal;
            $indicador = $diff <= 10 ? 'Al día' : ($diff <= 25 ? 'Retraso menor' : 'Retraso crítico');
        }

        return [
            $row['codigo'] ?? '—',
            $row['beneficiario'] ?? ($row['nombre'] ?? '—'),
            ucfirst(str_replace('_', ' ', $row['estado'] ?? '')),
            $row['items_total']     ?? '—',
            $row['items_completados'] ?? '—',
            $this->formatPct($avanceReal),
            $avancePlazo !== null ? $this->formatPct($avancePlazo) : '—',
            $indicador,
        ];
    }

    public function getProyecto(): Proyecto
    {
        return $this->proyecto;
    }

    public function getAvance(): array
    {
        return $this->avance;
    }

    public function count(): int
    {
        return $this->unidades->count();
    }
}
