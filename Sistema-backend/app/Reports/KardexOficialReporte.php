<?php

namespace App\Reports;

use App\Models\Almacen;
use App\Models\Material;
use App\Models\Proyecto;
use App\Models\User;
use App\Traits\ConFiltros;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class KardexOficialReporte extends ReporteBase
{
    use ConFiltros;

    protected Almacen $almacen;
    protected string $variante;

    public function __construct(User $usuarioGenerador, array $filtros, ?Proyecto $proyecto, Almacen $almacen, string $variante = 'oficial')
    {
        parent::__construct($usuarioGenerador, $filtros, $proyecto);
        $this->almacen = $almacen;
        $this->variante = $variante;
    }

    public function generarPdf(): Response
    {
        $datos = $this->obtenerDatos();
        
        $this->registrarAuditoria('pdf', 'kardex_' . $this->variante);

        $pdf = Pdf::loadView('reportes.almacenes.kardex', [
            'almacen'         => $this->almacen,
            'proyecto'        => $this->proyecto,
            'usuario_emisor'  => $this->usuarioGenerador,
            'variante'        => $this->variante,
            'materiales'      => $datos,
            'texto_filtros'   => $this->generarTextoFiltros($this->filtros),
            'qr_image'        => $this->generarQrCode(),
            'hash_validacion' => $this->hash,
        ]);

        $pdf->setPaper('a4', 'landscape'); // Mejor para kardex ancho

        return new Response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="Kardex_Almacen_'.$this->almacen->id.'.pdf"'
        ]);
    }

    public function generarExcel(): Response
    {
        $this->registrarAuditoria('excel', 'kardex_' . $this->variante);
        // Implementación de Excel con Maatwebsite (pendientes clases de exportación)
        // Por ahora retornaremos un JSON si no está el export para evitar fallos
        return new Response(json_encode(['message' => 'Excel en construcción']), 200, ['Content-Type' => 'application/json']);
    }

    protected function obtenerDatos(): array
    {
        // Traer materiales del almacén con sus detalles de movimiento filtrados
        $materialesQuery = Material::whereHas('stocks', function($q) {
            $q->where('almacen_id', $this->almacen->id);
        });

        // Si hay filtro por material
        if (!empty($this->filtros['material_id'])) {
            $materialesQuery->where('id', $this->filtros['material_id']);
        }

        $materiales = $materialesQuery->get();

        foreach ($materiales as $material) {
            // Obtener los detalles de movimientos
            $query = \App\Models\DetalleMovimientoAlmacen::with(['movimiento.registradoPor'])
                ->where('material_id', $material->id)
                ->whereHas('movimiento', function($q) {
                    $q->where(function($q2) {
                        $q2->where('almacen_origen_id', $this->almacen->id)
                           ->orWhere('almacen_destino_id', $this->almacen->id);
                    });
                    
                    // Variante SICOOES: Excluir SALIDA_RETRABAJO
                    if ($this->variante === 'sicooes') {
                        $q->where('tipo', '!=', 'salida_retrabajo');
                    }
                });

            // Aplicar filtros de fecha y generales
            $query = clone $this->aplicarFiltrosComunes($query, array_merge($this->filtros, ['campo_fecha' => 'created_at']));

            // Ordenar por fecha cronológicamente para calcular el saldo móvil
            $movimientos = $query->join('movimientos_almacen', 'detalle_movimientos_almacen.movimiento_almacen_id', '=', 'movimientos_almacen.id')
                                 ->orderBy('movimientos_almacen.fecha_movimiento', 'asc')
                                 ->orderBy('detalle_movimientos_almacen.id', 'asc')
                                 ->select('detalle_movimientos_almacen.*') // Para no ensuciar el modelo con join
                                 ->get();
            
            $material->movimientos_filtrados = $movimientos;
        }

        return $materiales->toArray(); // En la vida real, se pasa un DTO o el mismo modelo
    }
}
