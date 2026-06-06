<?php

namespace App\Jobs;

use App\Models\NotificacionSistema;
use App\Models\Proyecto;
use App\Models\Vivienda;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class GenerarZipActasJob implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

    public int $timeout = 300;

    public function __construct(
        private int    $proyectoId,
        private int    $usuarioId,
        private string $jobId,
    ) {}

    public function handle(): void
    {
        $proyecto  = Proyecto::with(['responsable', 'entidadEstatal', 'cliente'])->findOrFail($this->proyectoId);
        $viviendas = Vivienda::with(['beneficiario.tipoVivienda', 'itemsChecklist'])
            ->where('proyecto_id', $this->proyectoId)
            ->where('estado', 'entregada')
            ->whereNotNull('beneficiario_id')
            ->get();

        if ($viviendas->isEmpty()) {
            $this->notificar(
                'warning',
                'Sin actas disponibles',
                "El proyecto {$proyecto->codigo} no tiene viviendas entregadas con beneficiario asignado.",
                null
            );
            return;
        }

        $dir = "exports/actas/{$this->jobId}";
        Storage::makeDirectory($dir);

        foreach ($viviendas as $vivienda) {
            $pdf = Pdf::loadView('exports.acta_entrega_vivienda', [
                'vivienda'     => $vivienda,
                'beneficiario' => $vivienda->beneficiario,
                'proyecto'     => $proyecto,
                'items'        => $vivienda->itemsChecklist,
                'acta_numero'  => $vivienda->id,
                'usuario'      => 'Sistema',
            ])->setPaper('A4', 'portrait');

            $nombrePdf = "acta_{$vivienda->codigo}.pdf";
            Storage::put("{$dir}/{$nombrePdf}", $pdf->output());
        }

        $zipNombre = "actas_{$proyecto->codigo}_" . now()->format('Ymd_His') . '.zip';
        $zipPath   = storage_path("app/exports/actas/{$this->jobId}/{$zipNombre}");

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
            $archivos = Storage::files($dir);
            foreach ($archivos as $archivo) {
                $zip->addFile(storage_path("app/{$archivo}"), basename($archivo));
            }
            $zip->close();
        }

        // Eliminar PDFs temporales
        foreach (Storage::files($dir) as $f) {
            if (str_ends_with($f, '.pdf')) {
                Storage::delete($f);
            }
        }

        $urlDescarga = "/storage/exports/actas/{$this->jobId}/{$zipNombre}";

        $this->notificar(
            'success',
            'Actas generadas',
            "{$viviendas->count()} actas del proyecto {$proyecto->codigo} están listas para descargar.",
            $urlDescarga
        );
    }

    public function failed(\Throwable $e): void
    {
        $this->notificar(
            'error',
            'Error al generar actas',
            'Ocurrió un error al generar el ZIP de actas. Por favor, inténtalo nuevamente.',
            null
        );
    }

    private function notificar(string $tipo, string $titulo, string $mensaje, ?string $url): void
    {
        NotificacionSistema::create([
            'usuario_id' => $this->usuarioId,
            'tipo'       => $tipo,
            'titulo'     => $titulo,
            'mensaje'    => $mensaje,
            'icono'      => $tipo === 'success' ? 'file-zip' : ($tipo === 'error' ? 'alert-circle' : 'alert-triangle'),
            'url_accion' => $url,
            'leida'      => false,
        ]);
    }
}
