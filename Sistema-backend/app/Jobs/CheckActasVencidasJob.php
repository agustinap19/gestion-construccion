<?php

namespace App\Jobs;

use App\Models\ActaEntregaActivo;
use App\Models\NotificacionSistema;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class CheckActasVencidasJob implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

    public function handle(): void
    {
        $actasVencidas = ActaEntregaActivo::with(['activo:id,nombre,codigo', 'vivienda:id,codigo,proyecto_id', 'vivienda.proyecto:id,nombre,responsable_id'])
            ->where('estado', 'entregada')
            ->where('fecha_devolucion_estimada', '<', today())
            ->get();

        foreach ($actasVencidas as $acta) {
            $proyecto = $acta->vivienda->proyecto;
            $mensaje = "ALERTA: {$acta->activo->nombre} ({$acta->activo->codigo}) no fue devuelto por vivienda #{$acta->vivienda->codigo} del proyecto {$proyecto->nombre}. Vencía el {$acta->fecha_devolucion_estimada->format('d/m/Y')}.";

            $data = [
                'tipo'       => 'warning',
                'titulo'     => 'Acta de entrega vencida',
                'mensaje'    => $mensaje,
                'icono'      => 'alert-triangle',
                'url_accion' => "/dashboard/activos/{$acta->activo_id}/prestamos-sociales",
                'leida'      => false,
            ];

            $destinatarios = collect();
            if ($proyecto->responsable_id) {
                $destinatarios->push($proyecto->responsable_id);
            }
            $destinatarios = $destinatarios
                ->merge(\App\Models\User::whereHas('rol', fn ($q) => $q->whereIn('nombre', ['gerente', 'super_admin']))->pluck('id'))
                ->unique();

            foreach ($destinatarios as $usuarioId) {
                $yaNotificado = NotificacionSistema::where('usuario_id', $usuarioId)
                    ->where('mensaje', $mensaje)
                    ->whereDate('created_at', today())
                    ->exists();

                if (!$yaNotificado) {
                    NotificacionSistema::create(array_merge($data, ['usuario_id' => $usuarioId]));
                }
            }
        }
    }
}
