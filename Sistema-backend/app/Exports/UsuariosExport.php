<?php

namespace App\Exports;

use App\Models\User;
use Illuminate\Support\Collection;

class UsuariosExport extends BaseExport
{
    protected string $titulo = 'Lista de Usuarios';

    private Collection $datos;

    public function __construct(array $filtros = [])
    {
        $query = User::with('rol')
            ->withCount('personal')
            ->orderBy('apellido_paterno');

        if (!empty($filtros['estado'])) {
            $query->where('estado', $filtros['estado']);
        }
        if (!empty($filtros['rol_id'])) {
            $query->where('rol_id', $filtros['rol_id']);
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
            'Nombre(s)', 'Apellido Paterno', 'Apellido Materno',
            'C.I.', 'Email', 'Rol', 'Estado',
            '2FA Activo', 'Admin Central', 'Último Acceso',
            'Fecha Registro',
        ];
    }

    public function map($row): array
    {
        return [
            $row->nombre,
            $row->apellido_paterno,
            $row->apellido_materno ?? '—',
            $row->ci,
            $row->email,
            $row->rol?->nombre_visible ?? '—',
            ucfirst($row->estado),
            $row->tiene_2fa ? 'Sí' : 'No',
            $row->es_admin_central ? 'Sí' : 'No',
            $row->ultimo_acceso ? $this->formatDate($row->ultimo_acceso) : '—',
            $this->formatDate($row->created_at),
        ];
    }

    public function count(): int
    {
        return $this->datos->count();
    }
}
