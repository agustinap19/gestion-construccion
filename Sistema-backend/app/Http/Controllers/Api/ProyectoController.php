<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Proyectos\CrearProyectoRequest;
use App\Http\Requests\Proyectos\ActualizarProyectoRequest;
use App\Http\Requests\Proyectos\CambiarEstadoProyectoRequest;
use App\Models\Proyecto;
use App\Services\Proyectos\ProyectoService;
use App\Services\Almacenes\CierreProyectoService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf;

class ProyectoController extends Controller
{
    protected ProyectoService $service;
    protected CierreProyectoService $cierreService;

    public function __construct(ProyectoService $service, CierreProyectoService $cierreService)
    {
        $this->service       = $service;
        $this->cierreService = $cierreService;
    }

    public function index(Request $request): JsonResponse
    {
        $filtros = $request->only([
            'busqueda', 'categoria', 'estado', 'tipo_proyecto_id', 'zona_id',
            'responsable_id', 'cliente_id', 'entidad_estatal_id', 'prioridad',
            'fecha_desde', 'fecha_hasta', 'ordenar_por', 'direccion', 'archivados',
        ]);
        $perPage = $request->input('per_page', 20);

        $proyectos = $this->service->listarConFiltros($filtros, $perPage, $request->user());
        return response()->json($proyectos);
    }

    public function estadisticas(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data'   => $this->service->obtenerEstadisticasGenerales($request->user()),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $data = $this->service->obtenerCompleto($id);
        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(CrearProyectoRequest $request): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('proyectos.crear')) {
            return response()->json(['status' => 'error', 'message' => 'No tiene permiso para crear proyectos.'], 403);
        }

        $datos = $request->validated();

        // Subida del PDF de contrato
        if ($request->hasFile('contrato_pdf')) {
            $codigo = 'PRJ-' . date('Y') . '-' . uniqid();
            $path = $request->file('contrato_pdf')->storeAs(
                'contratos',
                "{$codigo}.pdf",
                'public'
            );
            $datos['contrato_url'] = Storage::url($path);
        }
        unset($datos['contrato_pdf']);

        $proyecto = $this->service->crear($datos, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $proyecto, 'message' => 'Proyecto creado exitosamente.'], 201);
    }

    public function update(ActualizarProyectoRequest $request, int $id): JsonResponse
    {
        $datos = $request->validated();

        if ($request->hasFile('contrato_pdf')) {
            $proyecto = Proyecto::findOrFail($id);
            $path = $request->file('contrato_pdf')->storeAs(
                'contratos',
                "{$proyecto->codigo}.pdf",
                'public'
            );
            $datos['contrato_url'] = Storage::url($path);
        }
        unset($datos['contrato_pdf']);

        $proyecto = $this->service->actualizar($id, $datos, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $proyecto, 'message' => 'Proyecto actualizado exitosamente.']);
    }

    public function cambiarEstado(CambiarEstadoProyectoRequest $request, int $id): JsonResponse
    {
        $esGerente = $request->user()->rol && $request->user()->rol->nombre === 'gerente';
        $proyecto  = $this->service->cambiarEstado($id, $request->estado, $request->razon, $request->user()->id, $esGerente);

        // Cierre automático de almacenes cuando el proyecto finaliza
        $cierreInfo = null;
        if (in_array($request->estado, ['finalizado', 'pausado', 'cancelado'])) {
            try {
                $cierreInfo = $this->cierreService->cerrarProyecto(
                    $proyecto instanceof Proyecto ? $proyecto : Proyecto::find($id),
                    $request->user()->id
                );
            } catch (\Throwable $e) {
                // Cierre no crítico: el estado ya cambió, solo registrar el error
                \Log::warning("Cierre automático de almacenes falló para proyecto {$id}: " . $e->getMessage());
            }
        }

        return response()->json([
            'status'  => 'success',
            'data'    => $proyecto,
            'message' => 'Estado del proyecto actualizado.',
            'cierre_almacenes' => $cierreInfo,
        ]);
    }

    public function cambiarAdministrador(Request $request, int $id): JsonResponse
    {
        $request->validate(['administrador_id' => 'required|exists:users,id']);
        $proyecto = $this->service->cambiarAdministrador($id, $request->administrador_id, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $proyecto, 'message' => 'Administrador cambiado.']);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $request->validate(['razon' => 'required|string|min:5|max:1000']);
        $this->service->eliminar($id, $request->user()->id, $request->razon);
        return response()->json(['status' => 'success', 'message' => 'Proyecto archivado exitosamente.']);
    }

    public function restaurar(Request $request, int $id): JsonResponse
    {
        $proyecto = $this->service->restaurar($id, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $proyecto, 'message' => 'Proyecto restaurado.']);
    }

    public function dashboard(int $id): JsonResponse
    {
        $data = $this->service->obtenerDashboard($id);
        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function exportar(Request $request, int $id)
    {
        $tipo    = $request->input('tipo', 'pdf');
        $data    = $this->service->obtenerDashboard($id);
        $proyecto = $data['proyecto'];
        $avance   = $data['avance'];
        $gantt    = $data['gantt'] ?? ['items' => [], 'dias_totales' => null, 'fecha_inicio_proyecto' => null, 'fecha_fin_proyecto' => null, 'hoy' => now()->format('Y-m-d'), 'pos_hoy' => null];
        $unidades = $avance['avance_por_unidad'] ?? [];
        $nombre   = preg_replace('/[^A-Za-z0-9_\-]/', '_', $proyecto->codigo ?? 'proyecto');

        if ($tipo === 'excel') {
            $ganttItems = $gantt['items'] ?? [];
            $csv  = "Proyecto;{$proyecto->nombre}\r\n";
            $csv .= "Código;{$proyecto->codigo}\r\n";
            $csv .= "Estado;{$proyecto->estado}\r\n";
            $csv .= "Avance Global;{$avance['global']}%\r\n";
            $csv .= "Período;{$gantt['fecha_inicio_proyecto']} → {$gantt['fecha_fin_proyecto']}\r\n";
            $csv .= "Días Totales;{$gantt['dias_totales']}\r\n\r\n";
            $csv .= "Producto/Fase;Avance;Estado;Fecha Inicio;Fecha Fin\r\n";
            foreach ($ganttItems as $item) {
                $avItem = $item['porcentaje_avance'] ?? $item['porcentaje'] ?? 0;
                $fI = $item['fecha_inicio_planificada'] ?? '';
                $fF = $item['fecha_fin_planificada'] ?? $item['fecha_planificada_cobro'] ?? '';
                $csv .= "{$item['nombre']};{$avItem}%;{$item['estado']};{$fI};{$fF}\r\n";
            }

            return response($csv, 200, [
                'Content-Type'        => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"cronograma_{$nombre}.csv\"",
            ]);
        }

        $proyecto->load(['modificatorios' => fn($q) => $q->where('tipo', 'plazo')->where('estado', 'aplicado')]);

        $auth    = $request->user();
        $usuario = $auth ? "{$auth->nombre} {$auth->apellido_paterno}" : '';

        $html = view('exports.cronograma_proyecto', compact('proyecto', 'avance', 'gantt', 'unidades', 'usuario'))->render();
        $pdf  = Pdf::loadHTML($html)->setPaper('a4', 'landscape');

        return $pdf->download("cronograma_{$nombre}.pdf");
    }

    public function simples(): JsonResponse
    {
        $proyectos = Proyecto::select('id', 'codigo', 'nombre', 'categoria', 'estado')->get();
        return response()->json($proyectos);
    }

    public function sociales(): JsonResponse
    {
        $proyectos = Proyecto::where('categoria', 'social')
            ->whereIn('estado', ['formulacion', 'en_ejecucion'])
            ->select('id', 'codigo', 'nombre', 'entidad_estatal_id', 'cantidad_beneficiarios')
            ->with('entidadEstatal:id,nombre')
            ->get();
        return response()->json($proyectos);
    }
}
