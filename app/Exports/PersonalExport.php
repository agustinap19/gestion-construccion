<?php

namespace App\Exports;

use App\Models\Personal;
use Illuminate\Support\Collection;

class PersonalExport extends BaseExport
{
    protected string $titulo = 'Lista de Personal';

    private Collection $datos;

    public function __construct(array $filtros = [])
    {
        $query = Personal::with(['usuario.rol'])
            ->withCount('competencias')
            ->orderBy('apellido_paterno');

        if (!empty($filtros['estado_laboral'])) {
            $query->where('estado_laboral', $filtros['estado_laboral']);
        }
        if (!empty($filtros['tipo'])) {
            $query->where('tipo', $filtros['tipo']);
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
            'C.I.', 'Tipo', 'Especialidad', 'Categoría',
            'Estado Laboral', 'Salario Base (Bs.)', 'Banco', 'Nº Cuenta',
            'Fecha Contratación', 'Competencias', 'Usuario del Sistema',
        ];
    }

    public function map($row): array
    {
        return [
            $row->codigo_empleado,
            $row->apellido_paterno,
            $row->apellido_materno ?? '—',
            $row->nombre,
            "{$row->ci}" . ($row->ci_complemento ? "-{$row->ci_complemento}" : ''),
            ucfirst($row->tipo ?? '—'),
            $row->especialidad ?? '—',
            $row->categoria ?? '—',
            ucfirst($row->estado_laboral),
            number_format($row->salario_base ?? 0, 2),
            $row->banco ?? '—',
            $row->numero_cuenta ?? '—',
            $this->formatDate($row->fecha_contratacion),
            $row->competencias_count,
            $row->usuario?->email ?? '—',
        ];
    }

    public function count(): int
    {
        return $this->datos->count();
    }
}
