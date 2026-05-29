<?php

namespace App\Reports;

use App\Models\User;
use App\Services\Almacenes\BibliotecaConstructivaService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class BibliotecaItemsReporte extends ReporteBase
{
    protected string $titulo = 'Catálogo de Ítems Constructivos';

    public function __construct(User $usuarioGenerador, array $filtros)
    {
        // El tercer parámetro de ReporteBase es proyecto, no tenemos aquí.
        parent::__construct($usuarioGenerador, $filtros, null);
    }

    protected function obtenerDatos(): array
    {
        $service = app(BibliotecaConstructivaService::class);
        // We get all items matching filters without pagination
        return $service->listarItems($this->filtros, 10000)->items();
    }

    public function generarPdf(): Response
    {
        $items = $this->obtenerDatos();
        
        $this->registrarAuditoria('pdf', 'catalogo_items_constructivos');

        $pdf = Pdf::loadView('reportes.biblioteca.items_pdf', [
            'empresa'      => 'CA & KANAGF S.R.L.',
            'titulo'       => $this->titulo,
            'fechaEmision' => now()->format('d/m/Y H:i'),
            'generadoPor'  => $this->usuarioGenerador->name,
            'items'        => $items,
            'filtros'      => $this->filtros,
        ]);

        return new Response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="catalogo_items_constructivos.pdf"'
        ]);
    }

    public function generarExcel(): Response
    {
        $items = $this->obtenerDatos();
        
        $this->registrarAuditoria('excel', 'catalogo_items_constructivos');

        $html = view('reportes.biblioteca.items_excel', [
            'empresa'      => 'CA & KANAGF S.R.L.',
            'titulo'       => $this->titulo,
            'fechaEmision' => now()->format('d/m/Y H:i'),
            'generadoPor'  => $this->usuarioGenerador->name,
            'items'        => $items,
        ])->render();

        return new Response($html, 200, [
            'Content-Type' => 'application/vnd.ms-excel',
            'Content-Disposition' => 'attachment; filename="catalogo_items_constructivos.xls"'
        ]);
    }
}
