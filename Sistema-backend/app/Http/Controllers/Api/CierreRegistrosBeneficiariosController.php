<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Proyecto;
use App\Services\CierreRegistrosService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CierreRegistrosBeneficiariosController extends Controller
{
    public function __construct(private CierreRegistrosService $service) {}

    // GET /proyectos/{id}/cierre-registros/estado
    public function estado(int $proyectoId): JsonResponse
    {
        $proyecto = Proyecto::select(
            'id', 'nombre',
            'registros_beneficiarios_cerrados',
            'fecha_cierre_registros',
            'cerrado_registros_por_id',
            'cantidad_beneficiarios'
        )->with('cerradoRegistrosPor:id,name')->findOrFail($proyectoId);

        $totalInscritos = $proyecto->beneficiarios()->count();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'cerrado'           => $proyecto->registros_beneficiarios_cerrados,
                'fecha_cierre'      => $proyecto->fecha_cierre_registros,
                'cerrado_por'       => $proyecto->cerradoRegistrosPor,
                'cupo_total'        => $proyecto->cantidad_beneficiarios,
                'total_inscritos'   => $totalInscritos,
                'cupo_disponible'   => max(0, $proyecto->cantidad_beneficiarios - $totalInscritos),
            ],
        ]);
    }

    // POST /proyectos/{id}/cierre-registros/cerrar
    public function cerrar(Request $request, int $proyectoId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('beneficiarios.cierre_registros')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso para cerrar registros.'], 403);
        }

        $proyecto = Proyecto::findOrFail($proyectoId);

        try {
            $this->service->cerrar($proyecto, $request->user());
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Registros de beneficiarios cerrados correctamente.',
            'data'    => ['cerrado' => true, 'fecha_cierre' => $proyecto->fresh()->fecha_cierre_registros],
        ]);
    }

    // POST /proyectos/{id}/cierre-registros/solicitar-reapertura
    public function solicitarReapertura(Request $request, int $proyectoId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('beneficiarios.reapertura_registros')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso para solicitar reapertura.'], 403);
        }

        $proyecto = Proyecto::findOrFail($proyectoId);

        try {
            $this->service->solicitarReapertura($proyecto, $request->user());
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Código de reapertura enviado a su correo electrónico. Expira en 15 minutos.',
        ]);
    }

    // POST /proyectos/{id}/cierre-registros/verificar-reapertura
    public function verificarReapertura(Request $request, int $proyectoId): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('beneficiarios.reapertura_registros')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate(['codigo' => 'required|string|size:8']);

        $proyecto = Proyecto::findOrFail($proyectoId);

        try {
            $this->service->verificarYReabrir($proyecto, $request->input('codigo'), $request->user());
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Registros reabiertos correctamente.',
            'data'    => ['cerrado' => false],
        ]);
    }
}
