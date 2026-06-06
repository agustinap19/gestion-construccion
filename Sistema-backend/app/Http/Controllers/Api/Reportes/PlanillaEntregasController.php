<?php

namespace App\Http\Controllers\Api\Reportes;

use App\Http\Controllers\Controller;
use App\Models\Beneficiario;
use Illuminate\Http\Request;
use App\Reports\PlanillaEntregasBeneficiarioReporte;

class PlanillaEntregasController extends Controller
{
    public function generar(Request $request, $beneficiarioId)
    {
        $request->validate([
            'formato' => 'required|in:pdf,excel',
            'filtros' => 'nullable|array'
        ]);

        $beneficiario = Beneficiario::with('proyecto')->findOrFail($beneficiarioId);
        $filtros = $request->input('filtros', []);
        $formato = $request->input('formato');
        
        $reporte = new PlanillaEntregasBeneficiarioReporte($request->user(), $filtros, $beneficiario->proyecto, $beneficiario);

        if ($formato === 'pdf') {
            return $reporte->generarPdf();
        } else {
            return $reporte->generarExcel();
        }
    }
}
