<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Activos\ActivoRequest;
use App\Models\Activo;
use App\Models\ActaEntregaActivo;
use App\Models\AsignacionActivo;
use App\Services\Activos\ActivoService;
use Illuminate\Http\Request;
use Exception;

class ActivoController extends Controller
{
    public function __construct(
        protected ActivoService $service,
    ) {}

    public function index(Request $request)
    {
        if (!$request->user()->hasPermissionTo('activos.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $filtros = $request->only(['tipo', 'estado', 'almacen_id', 'buscar']);
        $data = $this->service->listarConFiltros($filtros, (int) $request->input('per_page', 20));

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(ActivoRequest $request)
    {
        if (!$request->user()->hasPermissionTo('activos.crear')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        try {
            $activo = $this->service->crear($request->validated(), $request->user()->id);
            return response()->json(['status' => 'success', 'message' => 'Activo creado.', 'data' => $activo], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function show(Request $request, Activo $activo)
    {
        if (!$request->user()->hasPermissionTo('activos.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $detalle = $this->service->obtenerDetalle($activo->id);
        $detalle->necesita_mantenimiento = $detalle->necesitaMantenimiento();

        return response()->json(['status' => 'success', 'data' => $detalle]);
    }

    public function update(Request $request, Activo $activo)
    {
        if (!$request->user()->hasPermissionTo('activos.editar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        if ($activo->estado === 'asignado' && !$request->user()->hasPermissionTo('activos.asignar')) {
            return response()->json(['status' => 'error', 'message' => 'El activo está asignado; se requiere permiso de asignación para editarlo.'], 403);
        }

        $request->validate([
            'codigo'                   => 'sometimes|string|max:20|unique:activos,codigo,' . $activo->id,
            'nombre'                   => 'sometimes|string|max:150',
            'tipo'                     => 'sometimes|in:maquinaria,equipo,herramienta,vehiculo',
            'tipo_activo_id'           => 'nullable|integer|exists:tipos_activo,id',
            'descripcion'              => 'nullable|string',
            'marca'                    => 'nullable|string|max:100',
            'modelo'                   => 'nullable|string|max:100',
            'serie'                    => 'nullable|string|max:255',
            'anio_fabricacion'         => 'nullable|integer|min:1900|max:' . (date('Y') + 1),
            'costo_dia_uso'            => 'nullable|numeric|min:0',
            'horas_uso_acumuladas'     => 'nullable|numeric|min:0',
            'horas_mantenimiento_cada' => 'nullable|numeric|min:0',
            'estado'                   => 'nullable|in:disponible,asignado,mantenimiento,baja',
            'propiedad'                => 'nullable|in:propio,arrendado,en_comodato',
            'fecha_adquisicion'        => 'nullable|date',
            'valor_adquisicion'        => 'nullable|numeric|min:0',
            'valor_actual'             => 'nullable|numeric|min:0',
            'vida_util_anios'          => 'nullable|integer|min:0',
            'metodo_depreciacion'      => 'nullable|in:lineal,saldo_decreciente,unidades_produccion',
            'tasa_depreciacion'        => 'nullable|numeric|min:0|max:100',
            'almacen_id'               => 'nullable|integer|exists:almacenes,id',
            'responsable_id'           => 'nullable|integer|exists:personal,id',
            'foto_url'                 => 'nullable|string|max:500',
            'notas'                    => 'nullable|string',
        ]);

        try {
            $actualizado = $this->service->actualizar($activo->id, $request->all());
            return response()->json(['status' => 'success', 'message' => 'Activo actualizado.', 'data' => $actualizado]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function destroy(Request $request, Activo $activo)
    {
        if (!$request->user()->hasPermissionTo('activos.eliminar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        try {
            $this->service->eliminar($activo->id);
            return response()->json(['status' => 'success', 'message' => 'Activo eliminado.']);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function asignaciones(Request $request, Activo $activo)
    {
        if (!$request->user()->hasPermissionTo('activos.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $asignaciones = $activo->asignaciones()
            ->with(['proyecto:id,nombre,codigo,categoria', 'vivienda:id,codigo', 'personal:id,nombre,apellido_paterno'])
            ->latest('fecha_inicio')
            ->get();

        return response()->json(['status' => 'success', 'data' => $asignaciones]);
    }

    public function mantenimientos(Request $request, Activo $activo)
    {
        if (!$request->user()->hasPermissionTo('activos.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $mantenimientos = $activo->mantenimientos()
            ->with(['realizadoPor:id,nombre,apellido_paterno'])
            ->latest('fecha_programada')
            ->get();

        return response()->json(['status' => 'success', 'data' => $mantenimientos]);
    }

    public function disponibles(Request $request)
    {
        if (!$request->user()->hasPermissionTo('activos.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        return response()->json(['status' => 'success', 'data' => $this->service->disponibles()]);
    }

    public function estadisticas(Request $request)
    {
        if (!$request->user()->hasPermissionTo('activos.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        return response()->json(['status' => 'success', 'data' => $this->service->estadisticas()]);
    }

    public function alertas(Request $request)
    {
        if (!$request->user()->hasPermissionTo('activos.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $alertas = [];

        // CRÍTICA: entrega programada para hoy o antes sin registrar
        ActaEntregaActivo::where('estado', 'aprobada')
            ->where('fecha_entrega_estimada', '<=', today())
            ->with(['activo', 'vivienda.beneficiario'])
            ->get()
            ->each(function ($a) use (&$alertas) {
                $alertas[] = [
                    'tipo'    => 'critica',
                    'mensaje' => "Entrega pendiente hoy: {$a->activo->nombre} → " .
                                 ($a->vivienda?->beneficiario?->nombre ?? 'vivienda'),
                    'fecha'   => $a->fecha_entrega_estimada,
                    'url'     => "/activos/{$a->activo_id}/prestamos-sociales",
                ];
            });

        // CRÍTICA: devolución vencida
        ActaEntregaActivo::where('estado', 'entregada')
            ->where('fecha_devolucion_estimada', '<', today())
            ->with(['activo', 'vivienda.beneficiario'])
            ->get()
            ->each(function ($a) use (&$alertas) {
                $alertas[] = [
                    'tipo'    => 'critica',
                    'mensaje' => "Devolución vencida: {$a->activo->nombre} — " .
                                 ($a->vivienda?->beneficiario?->nombre ?? 'vivienda') .
                                 " (venció {$a->fecha_devolucion_estimada->toDateString()})",
                    'fecha'   => $a->fecha_devolucion_estimada,
                    'url'     => "/activos/{$a->activo_id}/prestamos-sociales",
                ];
            });

        // ALTA: asignación que debería haber iniciado y sigue planificada
        AsignacionActivo::where('estado', 'planificada')
            ->where('fecha_inicio', '<=', today())
            ->with('activo', 'proyecto')
            ->get()
            ->each(function ($a) use (&$alertas) {
                $alertas[] = [
                    'tipo'    => 'alta',
                    'mensaje' => "Asignación no iniciada: {$a->activo->nombre} → " .
                                 ($a->proyecto?->nombre ?? 'proyecto'),
                    'fecha'   => $a->fecha_inicio,
                    'url'     => "/activos/{$a->activo_id}/asignaciones",
                ];
            });

        // ALTA: asignación activa que ya pasó su fecha fin
        AsignacionActivo::where('estado', 'activa')
            ->where('fecha_fin_estimada', '<', today())
            ->with('activo', 'proyecto')
            ->get()
            ->each(function ($a) use (&$alertas) {
                $alertas[] = [
                    'tipo'    => 'alta',
                    'mensaje' => "Asignación vencida sin cerrar: {$a->activo->nombre} → " .
                                 ($a->proyecto?->nombre ?? 'proyecto'),
                    'fecha'   => $a->fecha_fin_estimada,
                    'url'     => "/activos/{$a->activo_id}/asignaciones",
                ];
            });

        // MEDIA: devolución programada para mañana (aviso anticipado)
        $manana = today()->addDay()->toDateString();
        ActaEntregaActivo::where('estado', 'entregada')
            ->where('fecha_devolucion_estimada', $manana)
            ->with(['activo', 'vivienda.beneficiario'])
            ->get()
            ->each(function ($a) use (&$alertas) {
                $alertas[] = [
                    'tipo'    => 'media',
                    'mensaje' => "Devolución mañana: {$a->activo->nombre} — " .
                                 ($a->vivienda?->beneficiario?->nombre ?? 'vivienda'),
                    'fecha'   => $a->fecha_devolucion_estimada,
                    'url'     => "/activos/{$a->activo_id}/prestamos-sociales",
                ];
            });

        return response()->json(['status' => 'success', 'data' => $alertas]);
    }

    public function uploadFoto(Request $request)
    {
        if (!$request->user()->hasPermissionTo('activos.crear') && !$request->user()->hasPermissionTo('activos.editar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'foto' => 'required|image|max:5120',
        ]);

        try {
            $url = $this->service->guardarImagen($request->file('foto'));
            return response()->json(['status' => 'success', 'url' => $url]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
