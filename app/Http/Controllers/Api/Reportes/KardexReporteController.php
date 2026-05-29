<?php

namespace App\Http\Controllers\Api\Reportes;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use Illuminate\Http\Request;
use App\Reports\KardexOficialReporte; // No existe aún, lo crearé después

class KardexReporteController extends Controller
{
    public function generar(Request $request, $almacenId)
    {
        $request->validate([
            'formato'  => 'required|in:pdf,excel',
            'variante' => 'nullable|in:oficial,sicooes,por_producto',
            'filtros'  => 'nullable|array'
        ]);

        $almacen = Almacen::with('proyecto')->findOrFail($almacenId);
        $filtros = $request->input('filtros', []);
        $formato = $request->input('formato');
        $variante = $request->input('variante', 'oficial');

        // Asignamos el almacen_id implícitamente
        $filtros['almacen_id'] = $almacenId;

        $reporte = new KardexOficialReporte($request->user(), $filtros, $almacen->proyecto, $almacen, $variante);

        if ($formato === 'pdf') {
            return $reporte->generarPdf();
        } else {
            return $reporte->generarExcel();
        }
    }
}
