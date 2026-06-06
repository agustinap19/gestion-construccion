<?php

namespace App\Exports;

use App\Models\Proyecto;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProyectosExport extends BaseExport
{
    protected string $titulo = 'Lista de Proyectos';

    private Collection $datos;

    public function __construct(array $filtros = [])
    {
        $query = Proyecto::with(['responsable', 'cliente', 'entidadEstatal', 'tipoProyecto'])
            ->withCount('viviendas')
            ->orderByDesc('created_at');

        if (!empty($filtros['estado'])) {
            $query->where('estado', $filtros['estado']);
        }
        if (!empty($filtros['categoria'])) {
            $query->where('categoria', $filtros['categoria']);
        }

        $this->datos = $query->get();
    }

    public function collection(): Collection
    {
        return $this->datos;
    }

    public function headings(): array
    {
        return [
            'Código', 'Nombre del Proyecto', 'Categoría', 'Estado',
            'Responsable', 'Contraparte', 'Presupuesto (Bs.)',
            'Avance Físico (%)', 'Inicio Planificado', 'Fin Planificado',
            'Beneficiarios', 'Tipo Proyecto',
        ];
    }

    public function map($row): array
    {
        $contraparte = $row->categoria === 'social'
            ? ($row->entidadEstatal?->nombre ?? '—')
            : ($row->cliente?->nombre_completo ?? $row->cliente?->nombre_visible ?? '—');

        return [
            $row->codigo,
            $row->nombre,
            ucfirst($row->categoria),
            ucfirst(str_replace('_', ' ', $row->estado)),
            $row->responsable ? "{$row->responsable->nombre} {$row->responsable->apellido_paterno}" : '—',
            $contraparte,
            $row->presupuesto_referencial ? number_format($row->presupuesto_referencial, 2) : '—',
            $this->formatPct($row->avance_fisico),
            $this->formatDate($row->fecha_inicio_planificada),
            $this->formatDate($row->fecha_fin_planificada),
            $row->cantidad_beneficiarios ?? '—',
            $row->tipoProyecto?->nombre ?? '—',
        ];
    }

    public function count(): int
    {
        return $this->datos->count();
    }
}
