<?php

namespace App\Http\Controllers\Api\Reportes;

use App\Http\Controllers\Controller;
use App\Models\Beneficiario;
use Illuminate\Http\Request;
use App\Reports\ReporteFotograficoBeneficiarioReporte;

class ReporteFotograficoController extends Controller
{
    public function generar(Request $request, $beneficiarioId)
    {
        $request->validate([
            'formato' => 'required|in:pdf',
            'filtros' => 'nullable|array'
        ]);

        $beneficiario = Beneficiario::with('proyecto')->findOrFail($beneficiarioId);
        $filtros = $request->input('filtros', []);
        
        $reporte = new ReporteFotograficoBeneficiarioReporte($request->user(), $filtros, $beneficiario->proyecto, $beneficiario);

        return $reporte->generarPdf();
    }
}
