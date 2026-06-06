<?php

namespace App\Reports;

use App\Models\DocumentoEmitido;
use App\Models\Proyecto;
use App\Models\User;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

abstract class ReporteBase
{
    protected ?Proyecto $proyecto;
    protected array $filtros;
    protected User $usuarioGenerador;
    protected ?string $hash;

    public function __construct(User $usuarioGenerador, array $filtros = [], ?Proyecto $proyecto = null)
    {
        $this->usuarioGenerador = $usuarioGenerador;
        $this->filtros = $filtros;
        $this->proyecto = $proyecto;
        $this->hash = null;
    }

    /**
     * Genera el PDF del reporte
     */
    abstract public function generarPdf();

    /**
     * Genera el Excel del reporte
     */
    abstract public function generarExcel();

    /**
     * Obtiene los datos estructurados para el reporte
     */
    abstract protected function obtenerDatos(): array;

    /**
     * Genera un hash SHA256 único para el documento
     */
    protected function generarHashValidacion(): string
    {
        $this->hash = hash('sha256', Str::uuid() . time() . $this->usuarioGenerador->id);
        return $this->hash;
    }

    /**
     * Registra la auditoría del reporte en la BD
     */
    protected function registrarAuditoria(string $formato, string $tipoReporte, ?int $beneficiarioId = null): void
    {
        if (!$this->hash) {
            $this->generarHashValidacion();
        }

        DocumentoEmitido::create([
            'hash'               => $this->hash,
            'tipo_reporte'       => $tipoReporte,
            'proyecto_id'        => $this->proyecto?->id,
            'beneficiario_id'    => $beneficiarioId,
            'usuario_emisor_id'  => $this->usuarioGenerador->id,
            'fecha_emision'      => now(),
            'parametros_filtros' => array_merge($this->filtros, ['formato' => $formato]),
        ]);
    }

    /**
     * Genera la imagen en base64 del código QR que apunta a la URL de validación
     */
    protected function generarQrCode(): string
    {
        if (!$this->hash) {
            $this->generarHashValidacion();
        }

        $url = config('app.url') . '/verificar-documento/' . $this->hash;
        // Retorna SVG en base64 para embeber en dompdf
        return base64_encode(QrCode::format('svg')->size(100)->margin(1)->generate($url));
    }
}
