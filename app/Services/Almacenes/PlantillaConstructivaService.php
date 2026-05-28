<?php

namespace App\Services\Almacenes;

use App\Models\ItemPlantillaConstructiva;
use App\Models\PlantillaConstructiva;
use Illuminate\Support\Facades\DB;
use Exception;

class PlantillaConstructivaService
{
    public function listar(array $filtros = []): array
    {
        $q = PlantillaConstructiva::with([
            'items.itemConstructivo:id,nombre,codigo,unidad_base',
            'items.itemConstructivo.categoria:id,nombre,color',
            'creador:id,name',
        ]);

        if (!empty($filtros['tipo_obra']) && $filtros['tipo_obra'] !== 'todos') {
            $q->where('tipo_obra', $filtros['tipo_obra']);
        }

        if (isset($filtros['estado']) && $filtros['estado'] !== 'todos') {
            $q->where('estado', (bool) $filtros['estado']);
        }

        if (!empty($filtros['busqueda'])) {
            $b = $filtros['busqueda'];
            $q->where(fn($sq) => $sq
                ->where('nombre', 'like', "%{$b}%")
                ->orWhere('tipologia', 'like', "%{$b}%")
            );
        }

        return $q->orderBy('tipo_obra')->orderBy('nombre')->get()
            ->map(fn($p) => $this->formatear($p))
            ->toArray();
    }

    public function obtener(int $id): array
    {
        $plantilla = PlantillaConstructiva::with([
            'items.itemConstructivo.categoria:id,nombre,color',
            'items.itemConstructivo.receta.material:id,nombre,codigo',
            'creador:id,name',
        ])->findOrFail($id);

        return $this->formatear($plantilla);
    }

    public function crear(array $datos, int $actorId): PlantillaConstructiva
    {
        return DB::transaction(function () use ($datos, $actorId) {
            $plantilla = PlantillaConstructiva::create([
                'nombre'              => $datos['nombre'],
                'descripcion'         => $datos['descripcion'] ?? null,
                'tipo_obra'           => $datos['tipo_obra'],
                'tipologia'           => $datos['tipologia'] ?? null,
                'version'             => 1,
                'estado'              => $datos['estado'] ?? true,
                'es_sistema'          => false,
                'usuario_creador_id'  => $actorId,
            ]);

            if (!empty($datos['items'])) {
                $this->sincronizarItems($plantilla->id, $datos['items']);
            }

            return $plantilla->fresh(['items.itemConstructivo.categoria']);
        });
    }

    public function actualizar(int $id, array $datos, int $actorId): PlantillaConstructiva
    {
        return DB::transaction(function () use ($id, $datos, $actorId) {
            $plantilla = PlantillaConstructiva::findOrFail($id);

            if ($plantilla->es_sistema && isset($datos['es_sistema'])) {
                unset($datos['es_sistema']);
            }

            $plantilla->update(array_filter([
                'nombre'                  => $datos['nombre']      ?? $plantilla->nombre,
                'descripcion'             => $datos['descripcion'] ?? $plantilla->descripcion,
                'tipo_obra'               => $datos['tipo_obra']   ?? $plantilla->tipo_obra,
                'tipologia'               => $datos['tipologia']   ?? $plantilla->tipologia,
                'estado'                  => $datos['estado']      ?? $plantilla->estado,
                'usuario_actualizador_id' => $actorId,
            ], fn($v) => $v !== null));

            if (isset($datos['items'])) {
                $this->sincronizarItems($plantilla->id, $datos['items']);
            }

            return $plantilla->fresh(['items.itemConstructivo.categoria']);
        });
    }

    public function duplicar(int $id, int $actorId): PlantillaConstructiva
    {
        return DB::transaction(function () use ($id, $actorId) {
            $original = PlantillaConstructiva::with('items')->findOrFail($id);

            $copia = PlantillaConstructiva::create([
                'nombre'             => $original->nombre . ' (copia)',
                'descripcion'        => $original->descripcion,
                'tipo_obra'          => $original->tipo_obra,
                'tipologia'          => $original->tipologia,
                'version'            => $original->version,
                'estado'             => true,
                'es_sistema'         => false,
                'usuario_creador_id' => $actorId,
            ]);

            foreach ($original->items as $item) {
                ItemPlantillaConstructiva::create([
                    'plantilla_id'          => $copia->id,
                    'item_constructivo_id'  => $item->item_constructivo_id,
                    'orden'                 => $item->orden,
                    'ponderacion_avance'    => $item->ponderacion_avance,
                    'cantidad_sugerida'     => $item->cantidad_sugerida,
                ]);
            }

            return $copia->fresh(['items.itemConstructivo.categoria']);
        });
    }

    public function eliminar(int $id): void
    {
        $plantilla = PlantillaConstructiva::findOrFail($id);
        if ($plantilla->es_sistema) {
            throw new Exception('Las plantillas del sistema no pueden eliminarse. Puede editarlas o duplicarlas.');
        }
        $plantilla->items()->delete();
        $plantilla->delete();
    }

    public function cambiarEstado(int $id, bool $estado, int $actorId): PlantillaConstructiva
    {
        $plantilla = PlantillaConstructiva::findOrFail($id);
        $plantilla->update(['estado' => $estado, 'usuario_actualizador_id' => $actorId]);
        return $plantilla;
    }

    private function sincronizarItems(int $plantillaId, array $items): void
    {
        $suma = array_sum(array_column($items, 'ponderacion_avance'));
        if (abs($suma - 100) > 0.1) {
            throw new Exception("La suma de ponderaciones de avance debe ser 100% (actual: {$suma}%).");
        }

        ItemPlantillaConstructiva::where('plantilla_id', $plantillaId)->delete();

        foreach ($items as $orden => $item) {
            ItemPlantillaConstructiva::create([
                'plantilla_id'         => $plantillaId,
                'item_constructivo_id' => $item['item_constructivo_id'],
                'orden'                => $item['orden'] ?? $orden,
                'ponderacion_avance'   => $item['ponderacion_avance'],
                'cantidad_sugerida'    => $item['cantidad_sugerida'] ?? null,
            ]);
        }
    }

    private function formatear(PlantillaConstructiva $p): array
    {
        $items    = $p->items ?? collect();
        $totalPond = $items->sum('ponderacion_avance');

        return [
            'id'                => $p->id,
            'nombre'            => $p->nombre,
            'descripcion'       => $p->descripcion,
            'tipo_obra'         => $p->tipo_obra,
            'tipologia'         => $p->tipologia,
            'version'           => $p->version,
            'estado'            => $p->estado,
            'es_sistema'        => $p->es_sistema,
            'total_items'       => $items->count(),
            'ponderacion_total' => round((float) $totalPond, 4),
            'items'             => $items->values(),
            'creador'           => $p->creador,
            'created_at'        => $p->created_at,
            'updated_at'        => $p->updated_at,
        ];
    }
}
