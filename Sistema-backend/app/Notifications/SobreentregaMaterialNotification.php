<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SobreentregaMaterialNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly int    $proyectoId,
        public readonly string $proyectoNombre,
        public readonly string $materialNombre,
        public readonly int    $beneficiarioId,
        public readonly string $beneficiarioNombre,
        public readonly float  $costoSobreentrega,
        public readonly float  $porcentajeExceso,
        public readonly string $justificacion,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'tipo'                => 'sobreentrega_material',
            'proyecto_id'         => $this->proyectoId,
            'proyecto_nombre'     => $this->proyectoNombre,
            'material_nombre'     => $this->materialNombre,
            'beneficiario_id'     => $this->beneficiarioId,
            'beneficiario_nombre' => $this->beneficiarioNombre,
            'costo_sobreentrega'  => $this->costoSobreentrega,
            'porcentaje_exceso'   => $this->porcentajeExceso,
            'justificacion'       => $this->justificacion,
        ];
    }
}
