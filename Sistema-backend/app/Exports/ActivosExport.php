<?php

namespace App\Exports;

use App\Models\Activo;
use Illuminate\Support\Collection;

class ActivosExport extends BaseExport
{
    protected string $titulo = 'Catálogo de Maquinaria y Herramientas';

    private Collection $datos;

    public function __construct(array $filtros = [])
    {
        $query = Activo::with(['almacen:id,nombre'])->orderBy('nombre');

        if (!empty($filtros['tipo']) && $filtros['tipo'] !== 'todos') {
            $query->where('tipo', $filtros['tipo']);
        }
        if (!empty($filtros['estado']) && $filtros['estado'] !== 'todos') {
            $query->where('estado', $filtros['estado']);
        }
        if (!empty($filtros['almacen_id'])) {
            $query->where('almacen_id', $filtros['almacen_id']);
        }
        if (!empty($filtros['buscar'])) {
            $b = $filtros['buscar'];
            $query->where(function ($q) use ($b) {
                $q->where('nombre', 'like', "%{$b}%")
                  ->orWhere('codigo', 'like', "%{$b}%");
            });
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
            'Código', 'Nombre', 'Tipo', 'Marca', 'Modelo', 'Año',
            'Propiedad', 'Ubicación', 'Costo/día (Bs.)', 'Horas Acumuladas',
            'Horas Mantenimiento', '% hasta Mantenimiento', 'Estado',
        ];
    }

    public function map($row): array
    {
        $pct = (float) $row->horas_mantenimiento_cada > 0
            ? min(100, round(((float) $row->horas_uso_acumuladas / (float) $row->horas_mantenimiento_cada) * 100, 1))
            : 0;

        return [
            $row->codigo,
            $row->nombre,
            ucfirst($row->tipo),
            $row->marca ?? '—',
            $row->modelo ?? '—',
            $row->anio_fabricacion ?? '—',
            ucfirst(str_replace('_', ' ', $row->propiedad)),
            $row->almacen?->nombre ?? '—',
            number_format((float) $row->costo_dia_uso, 2),
            number_format((float) $row->horas_uso_acumuladas, 2),
            number_format((float) $row->horas_mantenimiento_cada, 2),
            $this->formatPct($pct),
            ucfirst(str_replace('_', ' ', $row->estado)),
        ];
    }

    public function count(): int
    {
        return $this->datos->count();
    }
}
