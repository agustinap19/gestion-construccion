<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReporteService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Exception;

class ReporteController extends Controller
{
    protected ReporteService $reporteService;

    public function __construct(ReporteService $reporteService)
    {
        $this->reporteService = $reporteService;
    }

    // Reporte 1: Personal con su Rol
    public function reporte1(): JsonResponse
    {
        try {
            return response()->json([
                'status' => 'success',
                'data' => $this->reporteService->obtenerPersonalConRol()
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function reporte1Pdf()
    {
        $data = $this->reporteService->obtenerPersonalConRol();
        $pdf = Pdf::loadView('reportes.reporte1', compact('data'))->setPaper('a4', 'landscape');
        return $pdf->download('reporte-personal-rol.pdf');
    }

    // Reporte 2: Planillas de Pago
    public function reporte2(): JsonResponse
    {
        try {
            return response()->json([
                'status' => 'success',
                'data' => $this->reporteService->obtenerPlanillasConDetalles()
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function reporte2Pdf()
    {
        $data = $this->reporteService->obtenerPlanillasConDetalles();
        $pdf = Pdf::loadView('reportes.reporte2', compact('data'))->setPaper('a4', 'landscape');
        return $pdf->download('reporte-planillas.pdf');
    }

    // Reporte 3: Competencias con Personal
    public function reporte3(): JsonResponse
    {
        try {
            return response()->json([
                'status' => 'success',
                'data' => $this->reporteService->obtenerCompetenciasConPersonal()
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function reporte3Pdf()
    {
        $data = $this->reporteService->obtenerCompetenciasConPersonal();
        $pdf = Pdf::loadView('reportes.reporte3', compact('data'))->setPaper('a4', 'portrait');
        return $pdf->download('reporte-competencias-personal.pdf');
    }

    // Reporte 4: Personal con Competencias
    public function reporte4(): JsonResponse
    {
        try {
            return response()->json([
                'status' => 'success',
                'data' => $this->reporteService->obtenerPersonalConCompetencias()
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function reporte4Pdf()
    {
        $data = $this->reporteService->obtenerPersonalConCompetencias();
        $pdf = Pdf::loadView('reportes.reporte4', compact('data'))->setPaper('a4', 'portrait');
        return $pdf->download('reporte-personal-competencias.pdf');
    }

    // Reporte 5: Usuarios con Roles y Permisos
    public function reporte5(): JsonResponse
    {
        try {
            return response()->json([
                'status' => 'success',
                'data' => $this->reporteService->obtenerUsuariosConPermisos()
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function reporte5Pdf()
    {
        $data = $this->reporteService->obtenerUsuariosConPermisos();
        $pdf = Pdf::loadView('reportes.reporte5', compact('data'))->setPaper('a4', 'portrait');
        return $pdf->download('reporte-usuarios-permisos.pdf');
    }
}
