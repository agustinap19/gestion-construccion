<?php

namespace App\Imports;

use App\Models\CategoriaConstructiva;
use App\Models\ItemConstructivo;
use App\Models\Material;
use App\Models\RecetaItem;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ItemsConstructivosImport
{
    private array $errores = [];
    private int $creados = 0;
    private int $actualizados = 0;
    private int $actorId;

    public function __construct(int $actorId)
    {
        $this->actorId = $actorId;
    }

    public function fromArray(array $filas): array
    {
        $categorias = CategoriaConstructiva::pluck('id', 'nombre');
        $materiales = Material::pluck('id', 'nombre');

        foreach ($filas as $i => $fila) {
            $fila = array_map('trim', $fila);
            $fila = array_combine(
                ['codigo', 'nombre', 'categoria', 'unidad_base', 'precio_referencial', 'descripcion'],
                array_pad(array_values($fila), 6, '')
            );

            $rowNum = $i + 2;

            if (empty($fila['nombre'])) {
                $this->errores[] = "Fila {$rowNum}: El nombre es requerido.";
                continue;
            }

            if (!in_array($fila['unidad_base'], ['m3', 'm2', 'ml', 'pza', 'glb', 'kg'])) {
                $this->errores[] = "Fila {$rowNum}: Unidad '{$fila['unidad_base']}' inválida. Use: m3, m2, ml, pza, glb, kg.";
                continue;
            }

            $categoriaId = null;
            if (!empty($fila['categoria'])) {
                $categoriaId = $categorias->get($fila['categoria']);
                if (!$categoriaId) {
                    $this->errores[] = "Fila {$rowNum}: Categoría '{$fila['categoria']}' no encontrada.";
                    continue;
                }
            }

            $precio = !empty($fila['precio_referencial']) ? (float) $fila['precio_referencial'] : 0;

            try {
                DB::transaction(function () use ($fila, $categoriaId, $precio, $rowNum) {
                    $existe = !empty($fila['codigo'])
                        ? ItemConstructivo::where('codigo', $fila['codigo'])->first()
                        : null;

                    if ($existe) {
                        $existe->update([
                            'nombre'                   => $fila['nombre'],
                            'descripcion'              => $fila['descripcion'] ?? null,
                            'categoria_constructiva_id' => $categoriaId,
                            'precio_unitario_referencial' => $precio,
                            'usuario_actualizador_id'  => $this->actorId,
                        ]);
                        $this->actualizados++;
                    } else {
                        ItemConstructivo::create([
                            'codigo'                   => $fila['codigo'] ?: ItemConstructivo::generarCodigo(),
                            'nombre'                   => $fila['nombre'],
                            'descripcion'              => $fila['descripcion'] ?? null,
                            'categoria_constructiva_id' => $categoriaId,
                            'unidad_base'              => $fila['unidad_base'],
                            'precio_unitario_referencial' => $precio,
                            'estado'                   => true,
                            'usuario_creador_id'       => $this->actorId,
                            'usuario_actualizador_id'  => $this->actorId,
                        ]);
                        $this->creados++;
                    }
                });
            } catch (\Throwable $e) {
                $this->errores[] = "Fila {$rowNum}: {$e->getMessage()}";
            }
        }

        return [
            'creados'     => $this->creados,
            'actualizados' => $this->actualizados,
            'errores'     => $this->errores,
        ];
    }

    public static function plantillaHeaders(): array
    {
        return [
            'codigo',
            'nombre',
            'categoria',
            'unidad_base',
            'precio_referencial',
            'descripcion',
        ];
    }
}
