<?php

namespace App\Services\Almacenes;

use App\Models\Material;
use App\Models\UnidadMedida;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Exception;

class MaterialService
{
    public function __construct()
    {
    }

    public function listarConFiltros(array $filtros, int $perPage = 15): LengthAwarePaginator
    {
        $query = Material::with(['categoria', 'unidadMedida', 'proyecto']);

        if (!empty($filtros['busqueda'])) {
            $b = $filtros['busqueda'];
            $query->where(function ($q) use ($b) {
                $q->where('nombre', 'like', "%{$b}%")
                  ->orWhere('codigo', 'like', "%{$b}%")
                  ->orWhere('marca', 'like', "%{$b}%");
            });
        }

        if (isset($filtros['tipo']) && $filtros['tipo'] !== 'todos') {
            $query->where('tipo', $filtros['tipo']);
        }

        if (isset($filtros['activo'])) {
            $activo = filter_var($filtros['activo'], FILTER_VALIDATE_BOOLEAN);
            $query->where('activo', $activo);
        }

        if (!empty($filtros['categorias']) && is_array($filtros['categorias'])) {
            $query->whereIn('categoria_id', $filtros['categorias']);
        }

        $ordenar = $filtros['ordenar_por'] ?? 'created_at';
        $dir = $filtros['direccion'] ?? 'desc';
        
        $columnasValidas = ['nombre', 'codigo', 'created_at', 'precio_referencial', 'stock_minimo'];
        if (in_array($ordenar, $columnasValidas)) {
            $query->orderBy($ordenar, $dir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        return $query->paginate($perPage);
    }

    public function generarCodigo(): string
    {
        $ultimo = Material::withTrashed()
            ->where('codigo', 'like', 'MAT-%')
            ->orderByRaw("CAST(SUBSTRING(codigo, 5) AS UNSIGNED) DESC")
            ->value('codigo');

        if ($ultimo) {
            $numero = (int) substr($ultimo, 4);
            return 'MAT-' . str_pad($numero + 1, 4, '0', STR_PAD_LEFT);
        }

        return 'MAT-0001';
    }

    public function crear(array $datos, int $actorId): Material
    {
        return DB::transaction(function () use ($datos, $actorId) {
            // Validar unicidad de nombre en la categoría
            $existeNombre = Material::where('categoria_id', $datos['categoria_id'])
                ->where('nombre', $datos['nombre'])
                ->exists();
                
            if ($existeNombre) {
                throw new Exception("Ya existe un material con el nombre '{$datos['nombre']}' en esta categoría.");
            }

            if (empty($datos['codigo'])) {
                $datos['codigo'] = $this->generarCodigo();
            } else {
                if (Material::where('codigo', $datos['codigo'])->exists()) {
                    throw new Exception("El código '{$datos['codigo']}' ya está en uso.");
                }
            }

            // Manejo de nueva unidad de medida si viene como string nuevo
            if (!empty($datos['nueva_unidad'])) {
                $unidad = UnidadMedida::firstOrCreate(
                    ['nombre' => $datos['nueva_unidad']],
                    ['simbolo' => substr($datos['nueva_unidad'], 0, 3), 'tipo' => 'unidad', 'activa' => true]
                );
                $datos['unidad_medida_id'] = $unidad->id;
            }

            $material = Material::create([
                'codigo' => $datos['codigo'],
                'nombre' => $datos['nombre'],
                'descripcion' => $datos['descripcion'] ?? null,
                'imagen_url' => $datos['imagen_url'] ?? null,
                'tipo' => $datos['tipo'] ?? 'maestro',
                'proyecto_id' => ($datos['tipo'] ?? 'maestro') === 'especial' ? ($datos['proyecto_id'] ?? null) : null,
                'categoria_id' => $datos['categoria_id'],
                'unidad_medida_id' => $datos['unidad_medida_id'],
                'precio_referencial' => $datos['precio_referencial'] ?? null,
                'stock_minimo' => $datos['stock_minimo'] ?? 0,
                'marca' => $datos['marca'] ?? null,
                'equivalencias' => $datos['equivalencias'] ?? null,
                'activo' => true,
            ]);

            return $material->load(['categoria', 'unidadMedida', 'proyecto']);
        });
    }

    public function actualizar(int $id, array $datos, int $actorId): Material
    {
        return DB::transaction(function () use ($id, $datos, $actorId) {
            $material = Material::findOrFail($id);
            $datosAnteriores = $material->toArray();

            // Validar unicidad de nombre si cambia
            if (isset($datos['nombre']) || isset($datos['categoria_id'])) {
                $nuevoNombre = $datos['nombre'] ?? $material->nombre;
                $nuevaCat = $datos['categoria_id'] ?? $material->categoria_id;

                if ($nuevoNombre !== $material->nombre || $nuevaCat !== $material->categoria_id) {
                    $existeNombre = Material::where('categoria_id', $nuevaCat)
                        ->where('nombre', $nuevoNombre)
                        ->where('id', '!=', $id)
                        ->exists();

                    if ($existeNombre) {
                        throw new Exception("Ya existe un material con el nombre '{$nuevoNombre}' en esta categoría.");
                    }
                }
            }

            if (!empty($datos['codigo']) && $datos['codigo'] !== $material->codigo) {
                if (Material::where('codigo', $datos['codigo'])->where('id', '!=', $id)->exists()) {
                    throw new Exception("El código '{$datos['codigo']}' ya está en uso.");
                }
            }

            if (!empty($datos['nueva_unidad'])) {
                $unidad = UnidadMedida::firstOrCreate(
                    ['nombre' => $datos['nueva_unidad']],
                    ['simbolo' => substr($datos['nueva_unidad'], 0, 3), 'tipo' => 'unidad', 'activa' => true]
                );
                $datos['unidad_medida_id'] = $unidad->id;
            }

            $material->update([
                'codigo' => $datos['codigo'] ?? $material->codigo,
                'nombre' => $datos['nombre'] ?? $material->nombre,
                'descripcion' => array_key_exists('descripcion', $datos) ? $datos['descripcion'] : $material->descripcion,
                'imagen_url' => array_key_exists('imagen_url', $datos) ? $datos['imagen_url'] : $material->imagen_url,
                'tipo' => $datos['tipo'] ?? $material->tipo,
                'proyecto_id' => isset($datos['tipo']) && $datos['tipo'] === 'especial' ? ($datos['proyecto_id'] ?? $material->proyecto_id) : null,
                'categoria_id' => $datos['categoria_id'] ?? $material->categoria_id,
                'unidad_medida_id' => $datos['unidad_medida_id'] ?? $material->unidad_medida_id,
                'precio_referencial' => $datos['precio_referencial'] ?? $material->precio_referencial,
                'stock_minimo' => $datos['stock_minimo'] ?? $material->stock_minimo,
                'marca' => array_key_exists('marca', $datos) ? $datos['marca'] : $material->marca,
                'equivalencias' => array_key_exists('equivalencias', $datos) ? $datos['equivalencias'] : $material->equivalencias,
            ]);

            return $material->load(['categoria', 'unidadMedida', 'proyecto']);
        });
    }

    public function cambiarEstado(int $id, bool $estado, int $actorId): Material
    {
        $material = Material::findOrFail($id);
        
        if ($material->activo === $estado) {
            return $material;
        }

        $material->update(['activo' => $estado]);

        return $material;
    }

    public function guardarImagen($file): string
    {
        $extension = $file->getClientOriginalExtension();
        $filename  = Str::uuid() . '.' . $extension;
        $file->storeAs('materiales', $filename, 'public');
        // Relativa para que funcione en cualquier puerto/host de desarrollo
        return '/storage/materiales/' . $filename;
    }
}
