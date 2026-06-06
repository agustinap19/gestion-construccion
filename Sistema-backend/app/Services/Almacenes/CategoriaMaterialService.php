<?php

namespace App\Services\Almacenes;

use App\Models\CategoriaMaterial;
use App\Models\Material;
use Illuminate\Database\Eloquent\Collection;
use Exception;

class CategoriaMaterialService
{
    public function obtenerTodas(): Collection
    {
        return CategoriaMaterial::orderBy('nombre', 'asc')
            ->withCount(['materiales' => function ($q) {
                $q->activos();
            }])
            ->get();
    }

    public function crear(array $datos, int $actorId): CategoriaMaterial
    {
        if (CategoriaMaterial::where('nombre', $datos['nombre'])->exists()) {
            throw new Exception("Ya existe una categoría con el nombre '{$datos['nombre']}'.");
        }

        return CategoriaMaterial::create([
            'nombre' => $datos['nombre'],
            'descripcion' => $datos['descripcion'] ?? null,
            'color' => $datos['color'] ?? '#94a3b8',
            'activo' => true,
        ]);
    }

    public function actualizar(int $id, array $datos, int $actorId): CategoriaMaterial
    {
        $categoria = CategoriaMaterial::findOrFail($id);

        if (isset($datos['nombre']) && $datos['nombre'] !== $categoria->nombre) {
            if (CategoriaMaterial::where('nombre', $datos['nombre'])->where('id', '!=', $id)->exists()) {
                throw new Exception("Ya existe otra categoría con el nombre '{$datos['nombre']}'.");
            }
        }

        $categoria->update([
            'nombre' => $datos['nombre'] ?? $categoria->nombre,
            'descripcion' => array_key_exists('descripcion', $datos) ? $datos['descripcion'] : $categoria->descripcion,
            'color' => $datos['color'] ?? $categoria->color,
            'activo' => isset($datos['activo']) ? $datos['activo'] : $categoria->activo,
        ]);

        return $categoria;
    }

    public function eliminar(int $id, int $actorId): void
    {
        $categoria = CategoriaMaterial::findOrFail($id);

        $materialesActivos = Material::where('categoria_id', $id)->activos()->count();

        if ($materialesActivos > 0) {
            throw new Exception("No se puede eliminar la categoría porque tiene {$materialesActivos} material(es) activo(s) asignado(s). Reasigne o desactive los materiales primero.");
        }

        $categoria->delete();
    }
}
