<?php

namespace App\Reports;

use App\Models\Proyecto;
use App\Models\User;
use App\Models\PresupuestoMaterialProyecto;
use App\Traits\ConFiltros;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class BalanceConsolidadoProyectoReporte extends ReporteBase
{
    use ConFiltros;

    public function __construct(User $usuarioGenerador, array $filtros, Proyecto $proyecto)
    {
        parent::__construct($usuarioGenerador, $filtros, $proyecto);
    }

    public function generarPdf(): Response
    {
        $datos = $this->obtenerDatos();
        
        $this->registrarAuditoria('pdf', 'balance_consolidado');

        $pdf = Pdf::loadView('reportes.proyectos.balance-consolidado', [
            'proyecto'        => $this->proyecto,
            'usuario_emisor'  => $this->usuarioGenerador,
            'materiales'      => $datos['materiales'],
            'stats'           => $datos['stats'],
            'texto_filtros'   => $this->generarTextoFiltros($this->filtros),
            'qr_image'        => $this->generarQrCode(),
            'hash_validacion' => $this->hash,
        ]);

        $pdf->setPaper('a4', 'landscape'); // Mejor en horizontal para las 6 columnas

        return new Response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="Balance_Consolidado_'.$this->proyecto->id.'.pdf"'
        ]);
    }

    public function generarExcel(): Response
    {
        $this->registrarAuditoria('excel', 'balance_consolidado');
        return new Response(json_encode(['message' => 'Excel en construcción']), 200, ['Content-Type' => 'application/json']);
    }

    protected function obtenerDatos(): array
    {
        $query = PresupuestoMaterialProyecto::with('material')->where('proyecto_id', $this->proyecto->id);

        if (!empty($this->filtros['search'])) {
            $search = $this->filtros['search'];
            $query->whereHas('material', function($q) use ($search) {
                $q->where('nombre', 'like', "%$search%")->orWhere('codigo', 'like', "%$search%");
            });
        }

        $presupuestos = $query->get();

        $resultados = [];
        $stats = [
            'total_presupuestado' => 0,
            'total_comprado' => 0,
            'total_entregado' => 0,
            'sobre_consumos' => 0,
            'sub_consumos' => 0
        ];

        foreach ($presupuestos as $pmp) {
            $p = $pmp->cantidad_planificada;
            $c = $pmp->cantidad_comprada;
            $a = $pmp->cantidad_en_almacen;
            $d = $pmp->cantidad_devuelta_central;
            $e = $pmp->cantidad_entregada_obra;
            $s = $pmp->saldo_operativo;

            // Stats Monetarios
            $stats['total_presupuestado'] += $p * ($pmp->costo_unitario ?? 0);
            $stats['total_comprado'] += $c * ($pmp->costo_unitario ?? 0);
            $stats['total_entregado'] += $e * ($pmp->costo_unitario ?? 0);

            // Indicadores de salud
            $estado_salud = 'normal';
            if ($p > 0) {
                $porcentaje_consumo = ($c / $p) * 100;
                if ($porcentaje_consumo > 110) {
                    $estado_salud = 'sobre_consumo';
                    $stats['sobre_consumos']++;
                } elseif ($porcentaje_consumo < 50) {
                    // Esto debería cruzarse con el avance del proyecto, lo simplificaremos por ahora
                    $estado_salud = 'sub_consumo';
                    $stats['sub_consumos']++;
                }
            }

            $resultados[] = [
                'codigo' => $pmp->material->codigo,
                'nombre' => $pmp->material->nombre,
                'planificado' => $p,
                'comprado' => $c,
                'en_almacen' => $a,
                'devuelto' => $d,
                'entregado' => $e,
                'saldo' => $s,
                'identidad_ok' => $pmp->identidad_contable_ok,
                'desfase' => $pmp->desfase,
                'estado_salud' => $estado_salud
            ];
        }

        return [
            'materiales' => $resultados,
            'stats' => $stats
        ];
    }
}
