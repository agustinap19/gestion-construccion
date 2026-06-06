<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Proyectos\ReporteTecnicoService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReporteTecnicoController extends Controller
{
    public function __construct(private ReporteTecnicoService $service) {}

    /* GET /reportes-tecnicos/unidad/{tipo}/{id}  tipo=vivienda|fase */
    public function porUnidad(Request $request, string $tipo, int $id): JsonResponse
    {
        $this->validarTipo($tipo);
        $perPage = $request->integer('per_page', 15);
        return response()->json($this->service->listarPorUnidad($tipo, $id, $perPage));
    }

    /* GET /reportes-tecnicos/proyecto/{id}/galeria */
    public function galeriaProyecto(Request $request, int $proyectoId): JsonResponse
    {
        $filtros = $request->only('vivienda_id', 'fase_id', 'desde', 'hasta');
        $fotos   = $this->service->listarFotosPorProyecto($proyectoId, $filtros);
        return response()->json(['data' => $fotos]);
    }

    /* GET /reportes-tecnicos/{id} */
    public function show(int $id): JsonResponse
    {
        return response()->json($this->service->obtenerCompleto($id));
    }

    /* POST /reportes-tecnicos */
    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'proyecto_id'       => 'required|integer|exists:proyectos,id',
            'vivienda_id'       => 'nullable|integer|exists:viviendas,id',
            'fase_id'           => 'nullable|integer|exists:fases_proyecto,id',
            'fecha_reporte'     => 'nullable|date',
            'descripcion'       => 'nullable|string|max:2000',
            'observaciones'     => 'nullable|string|max:2000',
            'latitud_tecnico'   => 'nullable|numeric|between:-90,90',
            'longitud_tecnico'  => 'nullable|numeric|between:-180,180',
            'avances_items'     => 'nullable|array',
            'avances_items.*'   => 'numeric|between:0,100',
            'fotos'             => 'nullable|array|max:20',
            'fotos.*.url_original'  => 'required|string',
            'fotos.*.url_thumbnail' => 'nullable|string',
            'fotos.*.caption'       => 'nullable|string|max:200',
            'fotos.*.latitud'       => 'nullable|numeric',
            'fotos.*.longitud'      => 'nullable|numeric',
            'incidencias'           => 'nullable|array',
            'incidencias.*.tipo'        => 'required|in:clima,social,tecnica,seguridad,otro',
            'incidencias.*.gravedad'    => 'required|in:baja,media,alta,critica',
            'incidencias.*.descripcion' => 'required|string|max:1000',
        ]);

        try {
            $reporte = $this->service->crear($datos, $request->user()->id);
            return response()->json($reporte, 201);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /* GET /reportes-tecnicos/vivienda/{id}/exportar-avance */
    public function exportarAvance(Request $request, int $viviendaId)
    {
        $datos   = $this->service->datosParaExportarAvance($viviendaId);
        $html    = view('exports.avance_individual', $datos)->render();
        $pdf     = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        $nombre  = 'avance_' . ($datos['vivienda']->codigo ?? $viviendaId) . '.pdf';
        return $pdf->download($nombre);
    }

    /* GET /reportes-tecnicos/vivienda/{id}/exportar-fotos */
    public function exportarFotos(Request $request, int $viviendaId)
    {
        $datos  = $this->service->datosParaExportarFotos($viviendaId);
        $html   = view('exports.reporte_fotografico', $datos)->render();
        $pdf    = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        $nombre = 'fotos_' . ($datos['vivienda']->codigo ?? $viviendaId) . '.pdf';
        return $pdf->download($nombre);
    }

    private function validarTipo(string $tipo): void
    {
        if (!in_array($tipo, ['vivienda', 'fase'])) {
            abort(422, 'Tipo debe ser vivienda o fase.');
        }
    }
}
