<?php

namespace App\Notifications;

use App\Models\Beneficiario;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SyncTipologiaNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Beneficiario $beneficiario,
        private readonly array        $preview,
        private readonly int          $historialId,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $agregados  = count($this->preview['agregar'] ?? []);
        $actualizados = count($this->preview['actualizar'] ?? []);
        $eliminados = count(array_filter($this->preview['eliminar'] ?? [], fn($e) => $e['puede_eliminar'] ?? false));
        $conflictos = count($this->preview['conflictos'] ?? []);

        $resumen = [];
        if ($agregados)   $resumen[] = "{$agregados} ítem(s) agregado(s)";
        if ($actualizados) $resumen[] = "{$actualizados} ítem(s) actualizado(s)";
        if ($eliminados)  $resumen[] = "{$eliminados} ítem(s) eliminado(s)";
        if ($conflictos)  $resumen[] = "{$conflictos} conflicto(s) sin reducir";

        return [
            'tipo'                 => 'sync_tipologia',
            'historial_id'         => $this->historialId,
            'beneficiario_id'      => $this->beneficiario->id,
            'beneficiario_nombre'  => "{$this->beneficiario->nombre} {$this->beneficiario->apellido_paterno}",
            'tipo_anterior_nombre' => $this->preview['tipo_anterior_nombre'] ?? '—',
            'tipo_nuevo_nombre'    => $this->preview['tipo_nuevo_nombre'] ?? '—',
            'resumen_texto'        => implode(', ', $resumen) ?: 'Sin cambios',
        ];
    }
}
