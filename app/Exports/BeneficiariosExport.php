<?php

namespace App\Exports;

use App\Models\Beneficiario;
use Illuminate\Support\Collection;

class BeneficiariosExport extends BaseExport
{
    protected string $titulo = 'Lista de Beneficiarios';

    private Collection $datos;

    public function __construct(int $proyectoId, array $filtros = [])
    {
        $query = Beneficiario::with(['tipoVivienda', 'vivienda'])
            ->where('proyecto_id', $proyectoId)
            ->orderBy('apellido_paterno');

        if (!empty($filtros['estado_seleccion'])) {
            $query->where('estado_seleccion', $filtros['estado_seleccion']);
        }
        if (!empty($filtros['comunidad'])) {
            $query->where('comunidad', 'like', "%{$filtros['comunidad']}%");
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
            'Código', 'Apellido Paterno', 'Apellido Materno', 'Nombre(s)',
            'C.I.', 'Teléfono', 'Comunidad', 'Estado', 'Tipología',
            'Vivienda', 'Avance Vivienda (%)', 'Estado Vivienda',
            'Fecha Registro',
        ];
    }

    public function map($row): array
    {
        return [
            $row->codigo_beneficiario,
            $row->apellido_paterno,
            $row->apellido_materno ?? '—',
            $row->nombre,
            "{$row->ci}" . ($row->ci_complemento ? "-{$row->ci_complemento}" : ''),
            $row->telefono_principal ?? '—',
            $row->comunidad ?? '—',
            ucfirst(str_replace('_', ' ', $row->estado_seleccion)),
            $row->tipoVivienda?->nombre ?? '—',
            $row->vivienda?->codigo ?? '—',
            $row->vivienda ? $this->formatPct($row->vivienda->porcentaje_avance) : '—',
            $row->vivienda ? ucfirst(str_replace('_', ' ', $row->vivienda->estado)) : '—',
            $this->formatDate($row->created_at),
        ];
    }

    public function count(): int
    {
        return $this->datos->count();
    }
}
