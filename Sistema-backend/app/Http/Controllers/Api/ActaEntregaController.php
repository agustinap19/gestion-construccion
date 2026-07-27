<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActaEntregaActivo;
use App\Models\AsignacionActivo;
use App\Services\Activos\ActaEntregaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Exception;

class ActaEntregaController extends Controller
{
    public function __construct(
        protected ActaEntregaService $service,
    ) {}

    public function index(Request $request, AsignacionActivo $asignacion)
    {
        if (!$request->user()->hasPermissionTo('activos.ver_actas')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $actas = $asignacion->actasEntrega()
            ->with(['vivienda:id,codigo', 'beneficiario:id,nombre,apellido_paterno,apellido_materno', 'activo:id,nombre,codigo'])
            ->orderBy('fecha_entrega_estimada')
            ->get();

        return response()->json(['status' => 'success', 'data' => $actas]);
    }

    public function historialDevueltas(Request $request)
    {
        if (!$request->user()->hasPermissionTo('activos.ver_actas')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $filtros = $request->only(['buscar', 'categoria', 'fecha_desde', 'fecha_hasta']);

        $actas = $this->service->queryDevueltas($filtros)
            ->orderByDesc('fecha_devolucion_real')
            ->paginate((int) $request->input('per_page', 20));

        return response()->json([
            'status'       => 'success',
            'data'         => $actas,
            'rango_fechas' => $this->service->rangoFechasDevueltas(),
        ]);
    }

    public function store(Request $request, AsignacionActivo $asignacion)
    {
        if (!$request->user()->hasPermissionTo('activos.asignar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'vivienda_id'               => 'nullable|integer|exists:viviendas,id',
            'beneficiario_id'           => 'nullable|integer|exists:beneficiarios,id',
            'fecha_entrega_estimada'    => 'nullable|date',
            'fecha_devolucion_estimada' => 'nullable|date',
        ]);

        try {
            $acta = $this->service->crear($asignacion->id, $request->all(), $request->user()->id);
            return response()->json(['status' => 'success', 'message' => 'Acta generada.', 'data' => $acta], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function descargarPdf(Request $request, ActaEntregaActivo $acta)
    {
        if (!$request->user()->hasPermissionTo('activos.ver_actas')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $version = $request->query('version');
        $path = match ($version) {
            'generado' => $acta->pdf_generado_url,
            'firmado'  => $acta->pdf_firmado_url,
            default    => $acta->pdf_firmado_url ?? $acta->pdf_generado_url,
        };

        if (!$path || !Storage::exists($path)) {
            return response()->json(['status' => 'error', 'message' => 'El PDF solicitado no está disponible.'], 404);
        }

        $sufijo = $version === 'generado' ? '_original' : ($acta->pdf_firmado_url ? '_firmada' : '');

        return response(Storage::get($path), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $acta->numero_acta . $sufijo . '.pdf"',
        ]);
    }

    public function cambiarEstado(Request $request, ActaEntregaActivo $acta)
    {
        $request->validate([
            'estado' => 'required|in:impresa,firmada_subida,aprobada,entregada,devuelta',
        ]);

        $nuevoEstado = $request->input('estado');
        $permiso = $this->permisoRequerido($acta->estado, $nuevoEstado);

        if (!$request->user()->hasPermissionTo($permiso)) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $payload = $request->only(['nota_rechazo', 'estado_devolucion']);
        if ($request->hasFile('pdf_firmado')) {
            $request->validate(['pdf_firmado' => 'file|mimes:pdf|max:10240']);
            $payload['pdf_firmado'] = $request->file('pdf_firmado');
        }
        if ($request->hasFile('foto')) {
            $request->validate(['foto' => 'image|max:5120']);
            $payload['foto'] = $request->file('foto');
        }

        return $this->ejecutar($acta, $nuevoEstado, $payload, $request);
    }

    public function subirPdfFirmado(Request $request, ActaEntregaActivo $acta)
    {
        if (!$request->user()->hasPermissionTo('activos.asignar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate(['pdf_firmado' => 'required|file|mimes:pdf|max:10240']);

        return $this->ejecutar($acta, 'firmada_subida', ['pdf_firmado' => $request->file('pdf_firmado')], $request);
    }

    public function subirFotoEntrega(Request $request, ActaEntregaActivo $acta)
    {
        if (!$request->user()->hasPermissionTo('activos.registrar_entrega')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate(['foto' => 'required|image|max:5120']);

        return $this->ejecutar($acta, 'entregada', ['foto' => $request->file('foto')], $request);
    }

    public function subirFotoDevolucion(Request $request, ActaEntregaActivo $acta)
    {
        if (!$request->user()->hasPermissionTo('activos.registrar_entrega')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'foto'              => 'required|image|max:5120',
            'estado_devolucion' => 'required|in:bueno,dañado,con_observaciones',
        ]);

        return $this->ejecutar($acta, 'devuelta', [
            'foto'              => $request->file('foto'),
            'estado_devolucion' => $request->input('estado_devolucion'),
        ], $request);
    }

    private function ejecutar(ActaEntregaActivo $acta, string $nuevoEstado, array $payload, Request $request)
    {
        try {
            $actualizada = $this->service->cambiarEstado($acta->id, $nuevoEstado, $payload, $request->user());
            return response()->json(['status' => 'success', 'message' => 'Estado del acta actualizado.', 'data' => $actualizada]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    private function permisoRequerido(string $desde, string $hasta): string
    {
        return match (true) {
            $desde === 'firmada_subida' && $hasta === 'aprobada' => 'activos.aprobar_acta',
            $desde === 'firmada_subida' && $hasta === 'impresa'  => 'activos.rechazar_acta',
            $hasta === 'entregada', $hasta === 'devuelta'        => 'activos.registrar_entrega',
            default                                              => 'activos.asignar',
        };
    }
}
