<?php

namespace App\Http\Controllers\Api\Reportes;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Reports\BibliotecaItemsReporte;

class BibliotecaReporteController extends Controller
{
    public function generar(Request $request)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate([
            'formato' => 'required|in:pdf,excel',
            'filtros' => 'nullable|array'
        ]);

        $filtros = $request->input('filtros', []);
        $formato = $request->input('formato');

        $reporte = new BibliotecaItemsReporte($request->user(), $filtros);

        if ($formato === 'pdf') {
            return $reporte->generarPdf();
        } else {
            return $reporte->generarExcel();
        }
    }
}
