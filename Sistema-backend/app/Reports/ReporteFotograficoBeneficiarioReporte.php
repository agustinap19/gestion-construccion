<?php

namespace App\Reports;

use App\Models\Beneficiario;
use App\Models\Proyecto;
use App\Models\User;
use App\Traits\ConFiltros;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class ReporteFotograficoBeneficiarioReporte extends ReporteBase
{
    use ConFiltros;

    protected Beneficiario $beneficiario;

    public function __construct(User $usuarioGenerador, array $filtros, ?Proyecto $proyecto, Beneficiario $beneficiario)
    {
        parent::__construct($usuarioGenerador, $filtros, $proyecto);
        $this->beneficiario = $beneficiario;
    }

    public function generarPdf(): Response
    {
        $datos = $this->obtenerDatos();
        
        $this->registrarAuditoria('pdf', 'fotografico_beneficiario', $this->beneficiario->id);

        $pdf = Pdf::loadView('reportes.beneficiarios.fotografico', [
            'beneficiario'    => $this->beneficiario,
            'proyecto'        => $this->proyecto,
            'usuario_emisor'  => $this->usuarioGenerador,
            'fotos'           => $datos,
            'texto_filtros'   => $this->generarTextoFiltros($this->filtros),
            'qr_image'        => $this->generarQrCode(),
            'hash_validacion' => $this->hash,
        ]);

        $pdf->setPaper('a4', 'portrait');

        return new Response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="Reporte_Fotografico_'.$this->beneficiario->id.'.pdf"'
        ]);
    }

    public function generarExcel(): Response
    {
        throw new \Exception('El reporte fotográfico solo está disponible en PDF');
    }

    protected function obtenerDatos(): array
    {
        // Buscar todas las evidencias (fotos) vinculadas a los movimientos del beneficiario
        $movimientos = \App\Models\MovimientoAlmacen::with(['detalles.material', 'evidencias'])
            ->where('beneficiario_id', $this->beneficiario->id)
            ->whereIn('tipo', ['salida_social', 'salida_privado'])
            ->orderBy('fecha_movimiento', 'asc')
            ->get();

        $fotos = [];

        foreach ($movimientos as $mov) {
            $nombresMateriales = $mov->detalles->map(function($d) { 
                return $d->material->nombre; 
            })->implode(', ');

            foreach ($mov->evidencias as $evidencia) {
                // Asumiendo que las evidencias son imágenes
                $fotos[] = [
                    'url' => $evidencia->archivo_url,
                    'fecha' => $mov->fecha_movimiento,
                    'descripcion' => "Entrega de: " . $nombresMateriales
                ];
            }
        }

        return $fotos;
    }
}
