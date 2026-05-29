<?php

namespace App\Http\Controllers\Api\Reportes;

use App\Http\Controllers\Controller;
use App\Models\Proyecto;
use Illuminate\Http\Request;
use App\Reports\BalanceConsolidadoProyectoReporte;

class BalanceConsolidadoController extends Controller
{
    public function generar(Request $request, $proyectoId)
    {
        $request->validate([
            'formato' => 'required|in:pdf,excel',
            'filtros' => 'nullable|array'
        ]);

        $proyecto = Proyecto::findOrFail($proyectoId);
        $filtros = $request->input('filtros', []);
        $formato = $request->input('formato');
        
        $reporte = new BalanceConsolidadoProyectoReporte($request->user(), $filtros, $proyecto);

        if ($formato === 'pdf') {
            return $reporte->generarPdf();
        } else {
            return $reporte->generarExcel();
        }
    }
}
