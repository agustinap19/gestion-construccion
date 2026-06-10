<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Proyecto;
use App\Services\Beneficiarios\BeneficiarioService;
use App\Http\Requests\Beneficiarios\CrearBeneficiarioRequest;
use App\Http\Requests\Beneficiarios\ActualizarBeneficiarioRequest;
use App\Http\Requests\Beneficiarios\CambiarEstadoBeneficiarioRequest;
use App\Http\Requests\Beneficiarios\AsignarTipoViviendaRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\Almacenes\IntegracionBeneficiarioService;
use App\Services\Beneficiarios\SincronizarTipologiaService;
use Barryvdh\DomPDF\Facade\Pdf;

class BeneficiarioController extends Controller
{
    protected $beneficiarioService;
    protected $integracionService;
    protected $sincronizarService;

    public function __construct(
        BeneficiarioService $beneficiarioService,
        IntegracionBeneficiarioService $integracionService,
        SincronizarTipologiaService $sincronizarService
    ) {
        $this->beneficiarioService = $beneficiarioService;
        $this->integracionService  = $integracionService;
        $this->sincronizarService  = $sincronizarService;
        
        // Asumiendo que hay un middleware de permisos
        // $this->middleware('permission:beneficiarios.ver')->only(['index', 'show', 'estadisticasProyecto', 'mapaProyecto']);
        // $this->middleware('permission:beneficiarios.crear')->only('store');
        // $this->middleware('permission:beneficiarios.editar')->only('update', 'asignarTipoVivienda');
        // $this->middleware('permission:beneficiarios.cambiar_estado')->only('cambiarEstado');
        // $this->middleware('permission:beneficiarios.eliminar')->only('destroy');
    }

    public function index(Request $request)
    {
        $filtros = $request->all();
        $perPage = $request->input('per_page', 20);
        $beneficiarios = $this->beneficiarioService->listarConFiltros($filtros, $perPage);
        return response()->json($beneficiarios);
    }

    public function show(Request $request, int $id)
    {
        $actorId = $request->user()->id;
        $puedeVerDatosSensibles = $request->user()->hasPermissionTo('beneficiarios.ver_datos_sensibles');
        
        $data = $this->beneficiarioService->obtenerCompleto($id, $actorId, $puedeVerDatosSensibles);
        return response()->json($data);
    }

    public function store(CrearBeneficiarioRequest $request)
    {
        try {
            $beneficiario = $this->beneficiarioService->crear(
                $request->validated(),
                $request->user()->id
            );

            // Integración Sub-fase C: generar ítems de presupuesto si tiene tipo de vivienda con plantilla
            $integracion = $this->integracionService->generarItemsParaBeneficiario(
                $beneficiario->fresh('vivienda'),
                $request->user()->id
            );

        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
        return response()->json(array_merge(
            $beneficiario->toArray(),
            ['integracion_plantilla' => $integracion ?? null]
        ), 201);
    }

    public function update(ActualizarBeneficiarioRequest $request, int $id)
    {
        $beneficiario = $this->beneficiarioService->actualizar(
            $id,
            $request->validated(),
            $request->user()->id
        );
        return response()->json($beneficiario);
    }

    public function cambiarEstado(CambiarEstadoBeneficiarioRequest $request, int $id)
    {
        $esGerente = $request->user()->hasRole('gerente');
        
        $beneficiario = $this->beneficiarioService->cambiarEstado(
            $id,
            $request->estado_seleccion,
            $request->razon,
            $request->user()->id,
            $esGerente
        );
        return response()->json($beneficiario);
    }

    public function asignarTipoVivienda(AsignarTipoViviendaRequest $request, int $id)
    {
        try {
            $resultado = $this->beneficiarioService->asignarTipoVivienda(
                $id,
                $request->tipo_vivienda_id,
                $request->user()->id
            );
            return response()->json($resultado);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // ─── Sincronización de tipología ─────────────────────────────────────────

    public function syncPreview(Request $request, int $id): JsonResponse
    {
        $request->validate(['nuevo_tipo_id' => 'required|exists:tipos_vivienda,id']);
        $beneficiario = \App\Models\Beneficiario::with(['vivienda', 'tipoVivienda'])->findOrFail($id);

        try {
            $preview = $this->sincronizarService->generarPreview($beneficiario, $request->nuevo_tipo_id);
            return response()->json(['preview' => $preview]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function syncAplicar(Request $request, int $id): JsonResponse
    {
        $request->validate(['nuevo_tipo_id' => 'required|exists:tipos_vivienda,id']);
        $beneficiario = \App\Models\Beneficiario::with(['vivienda', 'tipoVivienda'])->findOrFail($id);

        try {
            $resultado = $this->sincronizarService->aplicar(
                $beneficiario,
                $request->nuevo_tipo_id,
                $request->user()->id,
                'manual'
            );
            // Actualizar tipo_vivienda_id si aún no está actualizado
            if ($beneficiario->tipo_vivienda_id !== $request->nuevo_tipo_id) {
                $beneficiario->tipo_vivienda_id = $request->nuevo_tipo_id;
                $beneficiario->save();
            }
            return response()->json($resultado, 200);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function syncHistorial(Request $request, int $id): JsonResponse
    {
        $beneficiario = \App\Models\Beneficiario::findOrFail($id);
        $historial    = $this->sincronizarService->obtenerHistorial($beneficiario);
        return response()->json(['historial' => $historial]);
    }

    public function syncHistorialPdf(int $id)
    {
        $beneficiario = \App\Models\Beneficiario::with(['tipoVivienda', 'vivienda'])->findOrFail($id);
        $historial    = $this->sincronizarService->obtenerHistorial($beneficiario)->toArray();

        $html = view('exports.historial_sync_tipologia', compact('beneficiario', 'historial'))->render();
        $pdf  = Pdf::loadHTML($html)->setPaper('a4', 'portrait');

        $nombre = preg_replace('/[^A-Za-z0-9_\-]/', '_', $beneficiario->codigo_beneficiario ?? "ben_{$id}");
        return $pdf->download("historial_tipologia_{$nombre}.pdf");
    }

    public function destroy(Request $request, int $id)
    {
        $this->beneficiarioService->eliminar(
            $id,
            $request->user()->id,
            $request->input('razon')
        );
        return response()->json(['message' => 'Beneficiario eliminado correctamente.']);
    }

    public function restaurar(Request $request, int $id)
    {
        // En este diseño solo el gerente puede restaurar, el service puede no tener el metodo restaurar
        // Por lo general se usa el cambiarEstado('aceptado') pero si se usa SoftDeletes:
        $esGerente = $request->user()->hasRole('gerente');
        if (!$esGerente) {
            return response()->json(['message' => 'Solo un gerente puede restaurar un beneficiario eliminado.'], 403);
        }
        
        $beneficiario = \App\Models\Beneficiario::onlyTrashed()->findOrFail($id);
        $beneficiario->restore();
        $beneficiario->estado_seleccion = 'aceptado';
        $beneficiario->save();

        return response()->json($beneficiario);
    }

    public function estadisticasProyecto(Request $request, int $proyectoId)
    {
        $puedeVerDatosSensibles = $request->user()->hasPermissionTo('beneficiarios.ver_datos_sensibles');
        $stats = $this->beneficiarioService->obtenerEstadisticasProyecto($proyectoId, $puedeVerDatosSensibles);
        return response()->json($stats);
    }

    public function mapaProyecto(int $proyectoId)
    {
        $mapa = $this->beneficiarioService->obtenerMapaProyecto($proyectoId);
        return response()->json($mapa);
    }

    public function transicionesPermitidas(int $id)
    {
        $beneficiario = \App\Models\Beneficiario::findOrFail($id);
        return response()->json($beneficiario->getTransicionesPermitidas());
    }

    public function exportar(Request $request, int $proyectoId)
    {
        $tipo     = $request->input('tipo', 'pdf');
        $proyecto = Proyecto::findOrFail($proyectoId);
        $puedeVerDatosSensibles = $request->user()->hasPermissionTo('beneficiarios.ver_datos_sensibles');
        $stats    = $this->beneficiarioService->obtenerEstadisticasProyecto($proyectoId, $puedeVerDatosSensibles);

        $beneficiarios = \App\Models\Beneficiario::with(['tipoVivienda', 'vivienda'])
            ->where('proyecto_id', $proyectoId)
            ->orderBy('codigo_beneficiario')
            ->get();

        $nombre = preg_replace('/[^A-Za-z0-9_\-]/', '_', $proyecto->codigo ?? 'proyecto');

        if ($tipo === 'excel') {
            $csv  = "Código;Nombre;Apellido Paterno;Apellido Materno;CI;Comunidad;Tipología;Vivienda;Estado\r\n";
            foreach ($beneficiarios as $b) {
                $csv .= "{$b->codigo_beneficiario};{$b->nombre};{$b->apellido_paterno};{$b->apellido_materno};" .
                        "{$b->ci};{$b->comunidad};{$b->tipoVivienda?->nombre};{$b->vivienda?->codigo};{$b->estado_seleccion}\r\n";
            }
            return response($csv, 200, [
                'Content-Type'        => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"beneficiarios_{$nombre}.csv\"",
            ]);
        }

        $html = view('exports.lista_beneficiarios', compact('proyecto', 'beneficiarios', 'stats'))->render();
        $pdf  = Pdf::loadHTML($html)->setPaper('a4', 'landscape');
        return $pdf->download("beneficiarios_{$nombre}.pdf");
    }

    public function cupoProyecto(int $proyectoId): JsonResponse
    {
        $proyecto    = Proyecto::findOrFail($proyectoId);
        $cupoTotal   = (int) ($proyecto->cantidad_beneficiarios ?? 0);
        $registrados = \App\Models\Beneficiario::where('proyecto_id', $proyectoId)->count();
        $ocupadas    = \App\Models\Vivienda::where('proyecto_id', $proyectoId)->whereNotNull('beneficiario_id')->count();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'cupo_total'                => $cupoTotal,
                'viviendas_asignadas'       => $ocupadas,
                'beneficiarios_registrados' => $registrados,
                'cupos_disponibles'         => max(0, $cupoTotal - $registrados),
            ],
        ]);
    }
}
