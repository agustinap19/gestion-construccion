<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithProperties;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Font;

abstract class BaseExport implements
    WithTitle,
    WithHeadings,
    FromCollection,
    WithMapping,
    WithStyles,
    WithProperties
{
    protected string $titulo = 'Reporte';
    protected string $empresa = 'CA & KANAGF S.R.L.';

    public function title(): string
    {
        return $this->titulo;
    }

    public function properties(): array
    {
        return [
            'creator'  => 'CA & KANAGF S.R.L.',
            'company'  => 'CA & KANAGF S.R.L.',
            'title'    => $this->titulo,
            'created'  => now()->toDateTimeString(),
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        $lastCol = $this->lastColumnLetter($sheet);
        $lastRow = $sheet->getHighestRow();

        return [
            // Fila de encabezados
            1 => [
                'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A5F']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '4A90D9']]],
            ],
        ];
    }

    protected function lastColumnLetter(Worksheet $sheet): string
    {
        return $sheet->getHighestColumn();
    }

    protected function formatCurrency(?float $value): string
    {
        if ($value === null) return '—';
        return 'Bs. ' . number_format($value, 2, '.', ',');
    }

    protected function formatDate(?string $date): string
    {
        if (!$date) return '—';
        return \Carbon\Carbon::parse($date)->format('d/m/Y');
    }

    protected function formatPct(?float $value): string
    {
        if ($value === null) return '0%';
        return number_format($value, 1) . '%';
    }
}
