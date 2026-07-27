<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Activos\AsignacionActivoRequest;
use App\Models\Activo;
use App\Models\AsignacionActivo;
use App\Services\Activos\AsignacionActivoService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Exception;

class AsignacionActivoController extends Controller
{
    public function __construct(
        protected AsignacionActivoService $service,
    ) {}

    public function index(Request $request)
    {
        if (!$request->user()->hasPermissionTo('activos.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $filtros = $request->only(['activo_id', 'proyecto_id', 'estado', 'tipo']);
        $data = $this->service->listarConFiltros($filtros, (int) $request->input('per_page', 20));

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(AsignacionActivoRequest $request, Activo $activo)
    {
        if (!$request->user()->hasPermissionTo('activos.asignar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        try {
            $resultado = $this->service->crear($activo->id, $request->validated(), $request->user()->id);

            return response()->json([
                'status'   => 'success',
                'message'  => 'Asignación creada.',
                'data'     => $resultado['asignacion'],
                'warnings' => $resultado['warnings'],
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => collect($e->errors())->flatten()->first(),
                'errors'  => $e->errors(),
            ], 422);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function update(Request $request, AsignacionActivo $asignacion)
    {
        if (!$request->user()->hasPermissionTo('activos.asignar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'fecha_inicio'             => 'sometimes|date',
            'fecha_fin_estimada'       => 'sometimes|date|after_or_equal:fecha_inicio',
            'horas_dia_estimadas'      => 'nullable|numeric|min:0.5|max:24',
            'horas_reales_acumuladas'  => 'nullable|numeric|min:0',
            'notas'                    => 'nullable|string',
        ]);

        try {
            $actualizada = $this->service->actualizar($asignacion->id, $request->all());
            return response()->json(['status' => 'success', 'message' => 'Asignación actualizada.', 'data' => $actualizada]);
        } catch (ValidationException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => collect($e->errors())->flatten()->first(),
                'errors'  => $e->errors(),
            ], 422);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function cambiarEstado(Request $request, AsignacionActivo $asignacion)
    {
        if (!$request->user()->hasPermissionTo('activos.asignar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'estado' => 'required|in:planificada,activa,completada,cancelada',
        ]);

        try {
            $actualizada = $this->service->cambiarEstado(
                $asignacion->id,
                $request->input('estado'),
                $request->only(['horas_reales_acumuladas', 'condicion_devolucion', 'notas'])
            );
            return response()->json(['status' => 'success', 'message' => 'Estado actualizado.', 'data' => $actualizada]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function destroy(Request $request, AsignacionActivo $asignacion)
    {
        if (!$request->user()->hasPermissionTo('activos.asignar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        try {
            $this->service->eliminar($asignacion->id);
            return response()->json(['status' => 'success', 'message' => 'Asignación eliminada.']);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function verificarDisponibilidad(Request $request, Activo $activo)
    {
        if (!$request->user()->hasPermissionTo('activos.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'desde' => 'required|date',
            'hasta' => 'required|date|after_or_equal:desde',
        ]);

        $data = $this->service->verificarDisponibilidad($activo->id, $request->input('desde'), $request->input('hasta'));

        return response()->json(['status' => 'success', 'data' => $data]);
    }
}
