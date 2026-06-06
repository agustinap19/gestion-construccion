<?php

namespace App\Services;

use App\Exports\BaseExport;
use App\Models\LogExportacion;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExportacionService
{
    public function excel(BaseExport $export, string $recurso, string $nombreArchivo, User $usuario, array $params = []): BinaryFileResponse
    {
        $nombre = $this->sanitizarNombre($nombreArchivo) . '.xlsx';

        $this->log($usuario, $recurso, 'excel', $nombre, $params, $export->count());

        return Excel::download($export, $nombre);
    }

    public function pdf(string $vista, array $datos, string $recurso, string $nombreArchivo, User $usuario, array $params = []): Response
    {
        $nombre = $this->sanitizarNombre($nombreArchivo) . '.pdf';
        $filas  = $datos['_filas'] ?? null;
        unset($datos['_filas']);

        $this->log($usuario, $recurso, 'pdf', $nombre, $params, $filas);

        $pdf = Pdf::loadView("exports.{$vista}", array_merge($datos, [
            'usuario' => "{$usuario->nombre} {$usuario->apellido_paterno}",
        ]))->setPaper('A4', 'portrait');

        if (isset($datos['_landscape']) && $datos['_landscape']) {
            $pdf->setPaper('A4', 'landscape');
        }

        return $pdf->download($nombre);
    }

    private function log(User $usuario, string $recurso, string $formato, string $nombre, array $params, ?int $filas): void
    {
        LogExportacion::create([
            'usuario_id'     => $usuario->id,
            'recurso'        => $recurso,
            'formato'        => $formato,
            'nombre_archivo' => $nombre,
            'parametros'     => $params ?: null,
            'ip'             => request()->ip(),
            'filas'          => $filas,
        ]);
    }

    private function sanitizarNombre(string $nombre): string
    {
        return preg_replace('/[^a-zA-Z0-9_\-]/', '_', $nombre);
    }
}
