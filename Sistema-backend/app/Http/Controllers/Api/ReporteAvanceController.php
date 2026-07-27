<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Proyectos\ReporteAvanceService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReporteAvanceController extends Controller
{
    public function __construct(protected ReporteAvanceService $service) {}

    // GET /api/proyectos/{proyectoId}/reportes-avance/galeria
    public function galeriaProyecto(Request $request, int $proyectoId): JsonResponse
    {
        $data = $this->service->galeriaProyecto(
            $proyectoId,
            $request->input('desde'),
            $request->input('hasta'),
        );
        return response()->json($data);
    }

    // GET /api/viviendas/{viviendaId}/reportes-avance
    public function index(Request $request, int $viviendaId): JsonResponse
    {
        $pipId = $request->integer('item_id') ?: null;
        $data  = $this->service->listarPorVivienda($viviendaId, $pipId);
        return response()->json(['data' => $data]);
    }

    // POST /api/viviendas/{viviendaId}/reportes-avance  (multipart/form-data)
    public function store(Request $request, int $viviendaId): JsonResponse
    {
        if (!$this->puedeRegistrar($request->user())) {
            return response()->json(['message' => 'No tiene permiso para registrar avance de obra.'], 403);
        }

        // El frontend enviará un campo "items" que es un JSON string debido al FormData
        $itemsData = json_decode($request->input('items', '[]'), true);
        if (!is_array($itemsData) || count($itemsData) === 0) {
            return response()->json(['message' => 'Debe enviar al menos un ítem para registrar avance.'], 422);
        }
        if (count($itemsData) > 3) {
            return response()->json(['message' => 'No puede enviar más de 3 ítems a la vez.'], 422);
        }

        // Inyectar en el request para validación de Laravel
        $request->merge(['items_decoded' => $itemsData]);

        $request->validate([
            'items_decoded'                                => 'required|array|min:1|max:3',
            'items_decoded.*.presupuesto_item_proyecto_id' => 'required|integer|exists:presupuesto_items_proyecto,id',
            'items_decoded.*.porcentaje_avance'            => 'required|numeric|min:0|max:100',
            'foto'                                         => 'required|image|mimes:jpeg,jpg,png,webp|max:10240',
            'observacion'                                  => 'nullable|string|max:2000',
            'coordenadas_gps'                              => 'required|string|max:100',
        ], [
            'items_decoded.max' => 'Solo puede reportar hasta 3 ítems simultáneamente.',
            'foto.required'     => 'La foto es obligatoria para registrar el avance.',
            'foto.image'        => 'El archivo debe ser una imagen (JPEG, PNG, WEBP).',
            'foto.max'          => 'La foto no puede superar los 10 MB.',
        ]);

        try {
            $resultado = $this->service->registrarMulti(
                $viviendaId,
                $itemsData,
                $request->only('observacion', 'coordenadas_gps'),
                $request->file('foto'),
                $request->user()
            );

            return response()->json($resultado, 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // GET /api/viviendas/{viviendaId}/reportes-avance/exportar-fotografico
    public function exportarFotografico(Request $request, int $viviendaId)
    {
        $datos  = $this->service->datosParaExportarFotografico($viviendaId);
        $html   = view('exports.reporte_avance_fotografico', $datos)->render();
        $pdf    = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        $nombre = 'fotos_avance_' . ($datos['vivienda']->codigo ?? $viviendaId) . '.pdf';
        return $pdf->download($nombre);
    }

    // GET /api/viviendas/{viviendaId}/reportes-avance/exportar-concluidos
    public function exportarConcluidos(Request $request, int $viviendaId)
    {
        $datos  = $this->service->datosParaExportarConcluidos($viviendaId);
        $html   = view('exports.reporte_avance_concluidos', $datos)->render();
        $pdf    = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        $nombre = 'concluidos_' . ($datos['vivienda']->codigo ?? $viviendaId) . '.pdf';
        return $pdf->download($nombre);
    }

    private function puedeRegistrar($user): bool
    {
        if (!$user) return false;
        if ($user->es_admin_central) return true;
        return in_array($user->rol?->nombre, ['tecnico', 'admin_proyecto', 'gerente', 'super_admin']);
    }
}
