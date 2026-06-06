<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Modificatorio;
use App\Models\Proyecto;
use App\Services\ExportacionService;
use App\Services\ModificatorioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModificatorioController extends Controller
{
    public function __construct(
        private ModificatorioService $service,
        private ExportacionService   $exportService,
    ) {}

    // GET /proyectos/{id}/modificatorios
    public function index(int $proyectoId): JsonResponse
    {
        $proyecto = Proyecto::findOrFail($proyectoId);
        $lista = $proyecto->modificatorios()
            ->with(['creadoPor:id,name', 'aprobadoPor:id,name', 'items'])
            ->get();

        return response()->json(['status' => 'success', 'data' => $lista]);
    }

    // POST /proyectos/{id}/modificatorios/monto
    public function storeMonto(Request $request, int $proyectoId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.modificatorios.crear')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $datos = $request->validate([
            'motivo'              => 'required|string|max:200',
            'justificacion'       => 'required|string',
            'justificativo_legal' => 'nullable|string',
            'subtipo'             => 'nullable|string|max:40',
            'items'               => 'required|array|min:1',
            'items.*.nombre'      => 'required|string|max:200',
            'items.*.unidad'      => 'nullable|string|max:40',
            'items.*.cantidad_original' => 'required|numeric|min:0',
            'items.*.precio_unitario'   => 'required|numeric|min:0',
            'items.*.cantidad_nueva'    => 'required|numeric|min:0',
            'items.*.item_presupuesto_id' => 'nullable|integer|exists:items_presupuesto,id',
        ]);

        $proyecto = Proyecto::findOrFail($proyectoId);
        $modificatorio = $this->service->crearModificatorioMonto($proyecto, $datos, $request->user());

        return response()->json(['status' => 'success', 'data' => $modificatorio], 201);
    }

    // POST /proyectos/{id}/modificatorios/plazo
    public function storePlazo(Request $request, int $proyectoId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.modificatorios.crear')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $datos = $request->validate([
            'motivo'              => 'required|string|max:200',
            'justificacion'       => 'required|string',
            'justificativo_legal' => 'nullable|string',
            'dias_ampliacion'     => 'required|integer|min:1',
        ]);

        $proyecto = Proyecto::findOrFail($proyectoId);
        $modificatorio = $this->service->crearAmpliacionPlazo($proyecto, $datos, $request->user());

        return response()->json(['status' => 'success', 'data' => $modificatorio], 201);
    }

    // GET /modificatorios/{id}
    public function show(int $id): JsonResponse
    {
        $m = Modificatorio::with(['proyecto', 'creadoPor:id,name', 'aprobadoPor:id,name', 'items.itemPresupuesto'])->findOrFail($id);
        return response()->json(['status' => 'success', 'data' => $m]);
    }

    // PUT /modificatorios/{id}/items
    public function updateItems(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'items'               => 'required|array|min:1',
            'items.*.nombre'      => 'required|string|max:200',
            'items.*.unidad'      => 'nullable|string|max:40',
            'items.*.cantidad_original' => 'required|numeric|min:0',
            'items.*.precio_unitario'   => 'required|numeric|min:0',
            'items.*.cantidad_nueva'    => 'required|numeric|min:0',
        ]);

        $m = Modificatorio::findOrFail($id);
        $this->service->actualizarItems($m, $request->input('items'));

        return response()->json(['status' => 'success', 'data' => $m->load('items')]);
    }

    // PUT /modificatorios/{id}/justificativo
    public function updateJustificativo(Request $request, int $id): JsonResponse
    {
        $request->validate(['justificativo_legal' => 'required|string']);
        $m = Modificatorio::findOrFail($id);

        if (!$m->esBorrador()) {
            return response()->json(['status' => 'error', 'message' => 'Solo se puede editar el justificativo en borradores.'], 422);
        }

        $m->update(['justificativo_legal' => $request->input('justificativo_legal')]);
        return response()->json(['status' => 'success', 'data' => $m]);
    }

    // POST /modificatorios/{id}/justificativo/generar
    public function generarJustificativo(int $id): JsonResponse
    {
        $m = Modificatorio::with('proyecto')->findOrFail($id);
        $texto = $this->service->generarJustificativoLegal($m);
        return response()->json(['status' => 'success', 'data' => ['texto' => $texto]]);
    }

    // POST /modificatorios/{id}/enviar-aprobacion
    public function enviarAprobacion(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.modificatorios.crear')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $m = Modificatorio::findOrFail($id);

        try {
            $this->service->enviarAAprobacion($m, $request->user());
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        return response()->json(['status' => 'success', 'data' => $m->fresh()]);
    }

    // POST /modificatorios/{id}/aprobar
    public function aprobar(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.modificatorios.aprobar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $m = Modificatorio::findOrFail($id);

        try {
            $this->service->aprobar($m, $request->user());
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        return response()->json(['status' => 'success', 'data' => $m->fresh()]);
    }

    // POST /modificatorios/{id}/rechazar
    public function rechazar(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.modificatorios.aprobar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate(['razon' => 'required|string|max:500']);
        $m = Modificatorio::findOrFail($id);

        try {
            $this->service->rechazar($m, $request->user(), $request->input('razon'));
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        return response()->json(['status' => 'success', 'data' => $m->fresh()]);
    }

    // POST /modificatorios/{id}/aplicar
    public function aplicar(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.modificatorios.aplicar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $m = Modificatorio::findOrFail($id);

        try {
            $this->service->aplicar($m, $request->user());
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        return response()->json(['status' => 'success', 'data' => $m->fresh()]);
    }

    // GET /modificatorios/{id}/pdf
    public function pdf(int $id)
    {
        $m = Modificatorio::with(['proyecto', 'creadoPor', 'aprobadoPor', 'items'])->findOrFail($id);

        $vista    = $m->tipo === 'plazo' ? 'ampliacion_plazo' : 'modificatorio_monto';
        $nombre   = 'modificatorio_' . ($m->numero ?? $m->id);

        return $this->exportService->pdf(
            $vista,
            ['modificatorio' => $m],
            'modificatorio',
            $nombre,
            auth()->user()
        );
    }
}
