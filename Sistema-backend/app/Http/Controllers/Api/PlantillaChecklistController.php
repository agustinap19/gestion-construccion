<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FaseProyecto;
use App\Models\ItemPlantilla;
use App\Models\PlantillaChecklist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlantillaChecklistController extends Controller
{
    // GET /plantillas-checklist
    public function index(): JsonResponse
    {
        $plantillas = PlantillaChecklist::with(['items' => fn($q) => $q->orderBy('orden')])
            ->orderBy('nombre')
            ->get();

        return response()->json(['status' => 'success', 'data' => $plantillas]);
    }

    // POST /plantillas-checklist
    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('configuracion.plantillas_checklist')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $datos = $request->validate([
            'clave'             => 'required|string|max:60|unique:plantillas_checklist,clave',
            'nombre'            => 'required|string|max:120',
            'tipo_obra'         => 'nullable|string|max:60',
            'descripcion'       => 'nullable|string',
            'es_predeterminada' => 'boolean',
            'activo'            => 'boolean',
            'items'             => 'nullable|array',
            'items.*.nombre'       => 'required|string|max:200',
            'items.*.ponderacion'  => 'required|numeric|min:0|max:100',
            'items.*.descripcion'  => 'nullable|string',
        ]);

        $plantilla = DB::transaction(function () use ($datos) {
            if ($datos['es_predeterminada'] ?? false) {
                PlantillaChecklist::where('es_predeterminada', true)->update(['es_predeterminada' => false]);
            }

            $plantilla = PlantillaChecklist::create($datos);

            foreach (($datos['items'] ?? []) as $i => $itemData) {
                $plantilla->items()->create(array_merge($itemData, ['orden' => $i + 1]));
            }

            return $plantilla;
        });

        return response()->json(['status' => 'success', 'data' => $plantilla->load('items')], 201);
    }

    // GET /plantillas-checklist/{id}
    public function show(int $id): JsonResponse
    {
        $plantilla = PlantillaChecklist::with(['items' => fn($q) => $q->orderBy('orden')])->findOrFail($id);
        return response()->json(['status' => 'success', 'data' => $plantilla]);
    }

    // PUT /plantillas-checklist/{id}
    public function update(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('configuracion.plantillas_checklist')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $plantilla = PlantillaChecklist::findOrFail($id);

        $datos = $request->validate([
            'clave'             => 'sometimes|string|max:60|unique:plantillas_checklist,clave,' . $id,
            'nombre'            => 'sometimes|string|max:120',
            'tipo_obra'         => 'nullable|string|max:60',
            'descripcion'       => 'nullable|string',
            'es_predeterminada' => 'boolean',
            'activo'            => 'boolean',
        ]);

        DB::transaction(function () use ($plantilla, $datos) {
            if (($datos['es_predeterminada'] ?? false) && !$plantilla->es_predeterminada) {
                PlantillaChecklist::where('es_predeterminada', true)->update(['es_predeterminada' => false]);
            }
            $plantilla->update($datos);
        });

        return response()->json(['status' => 'success', 'data' => $plantilla->fresh()->load('items')]);
    }

    // DELETE /plantillas-checklist/{id}
    public function destroy(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('configuracion.plantillas_checklist')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $plantilla = PlantillaChecklist::findOrFail($id);

        if ($plantilla->es_predeterminada) {
            return response()->json(['status' => 'error', 'message' => 'No se puede eliminar la plantilla predeterminada.'], 422);
        }

        $plantilla->delete();
        return response()->json(['status' => 'success', 'message' => 'Plantilla eliminada.']);
    }

    // PATCH /plantillas-checklist/{id}/toggle-activo
    public function toggleActivo(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('configuracion.plantillas_checklist')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $plantilla = PlantillaChecklist::findOrFail($id);
        $plantilla->update(['activo' => !$plantilla->activo]);

        return response()->json(['status' => 'success', 'data' => ['activo' => $plantilla->activo]]);
    }

    // ── Gestión de ítems ──────────────────────────────────────────────────────

    // POST /plantillas-checklist/{id}/items
    public function storeItem(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('configuracion.plantillas_checklist')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $plantilla = PlantillaChecklist::findOrFail($id);
        $datos = $request->validate([
            'nombre'      => 'required|string|max:200',
            'ponderacion' => 'required|numeric|min:0|max:100',
            'descripcion' => 'nullable|string',
        ]);

        $this->validarPonderacion($plantilla, $datos['ponderacion']);

        $orden = $plantilla->items()->max('orden') + 1;
        $item = $plantilla->items()->create(array_merge($datos, ['orden' => $orden]));

        return response()->json(['status' => 'success', 'data' => $item], 201);
    }

    // PUT /plantillas-checklist/{plantillaId}/items/{itemId}
    public function updateItem(Request $request, int $plantillaId, int $itemId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('configuracion.plantillas_checklist')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $plantilla = PlantillaChecklist::findOrFail($plantillaId);
        $item = ItemPlantilla::where('plantilla_id', $plantillaId)->findOrFail($itemId);

        $datos = $request->validate([
            'nombre'      => 'sometimes|string|max:200',
            'ponderacion' => 'sometimes|numeric|min:0|max:100',
            'descripcion' => 'nullable|string',
        ]);

        if (isset($datos['ponderacion'])) {
            $this->validarPonderacion($plantilla, $datos['ponderacion'], $item->ponderacion);
        }

        $item->update($datos);
        return response()->json(['status' => 'success', 'data' => $item]);
    }

    // DELETE /plantillas-checklist/{plantillaId}/items/{itemId}
    public function destroyItem(Request $request, int $plantillaId, int $itemId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('configuracion.plantillas_checklist')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $item = ItemPlantilla::where('plantilla_id', $plantillaId)->findOrFail($itemId);
        $item->delete();

        return response()->json(['status' => 'success', 'message' => 'Ítem eliminado.']);
    }

    // PUT /plantillas-checklist/{id}/reordenar
    public function reordenar(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('configuracion.plantillas_checklist')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'orden' => 'required|array',
            'orden.*' => 'integer|exists:items_plantilla,id',
        ]);

        PlantillaChecklist::findOrFail($id);

        DB::transaction(function () use ($request) {
            foreach ($request->input('orden') as $pos => $itemId) {
                ItemPlantilla::where('id', $itemId)->update(['orden' => $pos + 1]);
            }
        });

        return response()->json(['status' => 'success', 'message' => 'Orden actualizado.']);
    }

    // POST /plantillas-checklist/{id}/aplicar-a-proyecto/{proyectoId}
    public function aplicarAProyecto(Request $request, int $id, int $proyectoId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('configuracion.plantillas_checklist')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $plantilla = PlantillaChecklist::with('items')->findOrFail($id);

        // Aplica la plantilla a todas las fases del proyecto que no tengan ítems de checklist
        $fases = FaseProyecto::where('proyecto_id', $proyectoId)->get();
        $aplicadas = 0;

        DB::transaction(function () use ($plantilla, $fases, &$aplicadas) {
            foreach ($fases as $fase) {
                if ($fase->itemsChecklist()->count() === 0) {
                    foreach ($plantilla->items as $item) {
                        $fase->itemsChecklist()->create([
                            'nombre'      => $item->nombre,
                            'ponderacion' => $item->ponderacion,
                            'descripcion' => $item->descripcion,
                            'orden'       => $item->orden,
                            'completado'  => false,
                        ]);
                    }
                    $aplicadas++;
                }
            }
        });

        return response()->json([
            'status'  => 'success',
            'message' => "Plantilla aplicada a {$aplicadas} fase(s) del proyecto.",
            'data'    => ['fases_aplicadas' => $aplicadas],
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function validarPonderacion(PlantillaChecklist $plantilla, float $nueva, float $anterior = 0): void
    {
        $suma = $plantilla->items()->sum('ponderacion') - $anterior + $nueva;
        if ($suma > 100.01) {
            throw new \Exception("La suma de ponderaciones ({$suma}%) supera el 100%.");
        }
    }
}
