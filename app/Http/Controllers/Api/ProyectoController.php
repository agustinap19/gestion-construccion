<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Proyectos\CrearProyectoRequest;
use App\Http\Requests\Proyectos\ActualizarProyectoRequest;
use App\Http\Requests\Proyectos\CambiarEstadoProyectoRequest;
use App\Models\Proyecto;
use App\Services\Proyectos\ProyectoService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProyectoController extends Controller
{
    protected ProyectoService $service;

    public function __construct(ProyectoService $service)
    {
        $this->service = $service;
    }

    public function index(Request $request): JsonResponse
    {
        $filtros = $request->only([
            'busqueda', 'categoria', 'estado', 'tipo_proyecto_id', 'zona_id',
            'administrador_id', 'cliente_id', 'entidad_estatal_id', 'prioridad',
            'fecha_desde', 'fecha_hasta', 'ordenar_por', 'direccion'
        ]);
        $perPage = $request->input('per_page', 20);

        $proyectos = $this->service->listarConFiltros($filtros, $perPage);
        return response()->json($proyectos);
    }

    public function estadisticas(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->service->obtenerEstadisticasGenerales(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $data = $this->service->obtenerCompleto($id);
        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(CrearProyectoRequest $request): JsonResponse
    {
        $proyecto = $this->service->crear($request->validated(), $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $proyecto, 'message' => 'Proyecto creado exitosamente.'], 201);
    }

    public function update(ActualizarProyectoRequest $request, int $id): JsonResponse
    {
        $proyecto = $this->service->actualizar($id, $request->validated(), $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $proyecto, 'message' => 'Proyecto actualizado exitosamente.']);
    }

    public function cambiarEstado(CambiarEstadoProyectoRequest $request, int $id): JsonResponse
    {
        $esGerente = $request->user()->rol && $request->user()->rol->nombre === 'gerente';
        $proyecto = $this->service->cambiarEstado($id, $request->estado, $request->razon, $request->user()->id, $esGerente);
        return response()->json(['status' => 'success', 'data' => $proyecto, 'message' => 'Estado del proyecto actualizado.']);
    }

    public function cambiarAdministrador(Request $request, int $id): JsonResponse
    {
        $request->validate(['administrador_id' => 'required|exists:usuarios,id']);
        $proyecto = $this->service->cambiarAdministrador($id, $request->administrador_id, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $proyecto, 'message' => 'Administrador cambiado.']);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $request->validate(['razon' => 'required|string|min:5|max:1000']);
        $this->service->eliminar($id, $request->user()->id, $request->razon);
        return response()->json(['status' => 'success', 'message' => 'Proyecto eliminado exitosamente.']);
    }

    public function restaurar(Request $request, int $id): JsonResponse
    {
        $proyecto = $this->service->restaurar($id, $request->user()->id);
        return response()->json(['status' => 'success', 'data' => $proyecto, 'message' => 'Proyecto restaurado.']);
    }

    // ── Endpoints ligeros (preexistentes) ────────────────────────────

    public function simples()
    {
        $proyectos = Proyecto::select('id', 'codigo', 'nombre', 'categoria', 'estado')->get();
        return response()->json($proyectos);
    }

    public function sociales()
    {
        $proyectos = Proyecto::where('categoria', 'social')
            ->whereIn('estado', ['planificacion', 'en_ejecucion'])
            ->select('id', 'codigo', 'nombre', 'entidad_estatal_id', 'cantidad_unidades')
            ->with('entidadEstatal:id,nombre')
            ->get();

        return response()->json($proyectos);
    }
}

