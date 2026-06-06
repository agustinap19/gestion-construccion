<?php

namespace App\Exports;

use App\Models\Material;

class MaterialesExport extends BaseExport
{
    protected array $filtros;

    public function __construct(array $filtros = [])
    {
        $this->filtros = $filtros;
    }

    protected function getTitulo(): string
    {
        return 'Catálogo de Materiales';
    }

    protected function getDatos(): array
    {
        $query = Material::with(['categoria', 'unidadMedida', 'proyecto']);

        if (!empty($this->filtros['tipo']) && $this->filtros['tipo'] !== 'todos') {
            $query->where('tipo', $this->filtros['tipo']);
        }
        if (!empty($this->filtros['categoria'])) {
            $query->where('categoria_id', $this->filtros['categoria']);
        }
        if (!empty($this->filtros['busqueda'])) {
            $q = $this->filtros['busqueda'];
            $query->where(function($w) use ($q) {
                $w->where('nombre', 'like', "%{$q}%")
                  ->orWhere('codigo', 'like', "%{$q}%")
                  ->orWhere('marca', 'like', "%{$q}%");
            });
        }

        $materiales = $query->orderBy('nombre')->get();
        $filas = [];

        $i = 1;
        foreach ($materiales as $mat) {
            $filas[] = [
                'N°'               => $i++,
                'Código'           => $mat->codigo,
                'Nombre del Ítem'  => $mat->nombre,
                'Marca'            => $mat->marca,
                'Categoría'        => $mat->categoria->nombre ?? '—',
                'Tipo'             => $mat->tipo,
                'Unidad'           => $mat->unidadMedida->nombre ?? '—',
                'Precio Ref. (Bs)' => $mat->precio_referencial ?? 0,
                'Stock Total'      => $mat->stock_total_calculado,
                'Estado'           => $mat->activo ? 'ACTIVO' : 'INACTIVO',
            ];
        }

        return $filas;
    }
}
