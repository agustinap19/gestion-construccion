<?php

namespace App\Services;

use App\Mail\CodigoReaperturaMail;
use App\Models\CodigoReapertura;
use App\Models\Proyecto;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Mail;

class CierreRegistrosService
{
    /**
     * Cierra los registros de beneficiarios del proyecto.
     * Solo puede ejecutarse si el cupo no está ya cerrado.
     */
    public function cerrar(Proyecto $proyecto, User $usuario): void
    {
        if ($proyecto->registros_beneficiarios_cerrados) {
            throw new Exception('Los registros ya están cerrados.');
        }

        $proyecto->update([
            'registros_beneficiarios_cerrados' => true,
            'fecha_cierre_registros'           => now(),
            'cerrado_registros_por_id'         => $usuario->id,
        ]);
    }

    /**
     * Genera un código OTP de 8 caracteres y lo envía por email
     * al usuario con el rol apropiado (admin → admin email, gerente → gerente email).
     *
     * @return string token de sesión para identificar este flujo
     */
    public function solicitarReapertura(Proyecto $proyecto, User $solicitante): string
    {
        if (!$proyecto->registros_beneficiarios_cerrados) {
            throw new Exception('Los registros no están cerrados.');
        }

        // Invalidar códigos previos vigentes para este proyecto
        CodigoReapertura::where('proyecto_id', $proyecto->id)
            ->where('usado', false)
            ->update(['usado' => true, 'usado_en' => now()]);

        $codigoPlano = strtoupper(substr(str_shuffle('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'), 0, 8));

        CodigoReapertura::create([
            'proyecto_id' => $proyecto->id,
            'usuario_id'  => $solicitante->id,
            'codigo'      => $codigoPlano,
            'tipo'        => 'reapertura_beneficiarios',
            'usado'       => false,
            'expira_en'   => now()->addMinutes(15),
        ]);

        $nombreSolicitante = trim(
            ($solicitante->nombre ?? '') . ' ' . ($solicitante->apellido_paterno ?? '')
        );
        if ($nombreSolicitante === '') {
            $nombreSolicitante = $solicitante->email;
        }

        Mail::to($solicitante->email)->send(new CodigoReaperturaMail(
            $codigoPlano,
            $proyecto->nombre,
            $nombreSolicitante,
        ));

        return $proyecto->id . '-' . now()->timestamp;
    }

    /**
     * Verifica el código OTP y reabre los registros.
     */
    public function verificarYReabrir(Proyecto $proyecto, string $codigo, User $usuario): void
    {
        if (!$proyecto->registros_beneficiarios_cerrados) {
            throw new Exception('Los registros no están cerrados.');
        }

        $registro = CodigoReapertura::where('proyecto_id', $proyecto->id)
            ->where('tipo', 'reapertura_beneficiarios')
            ->where('usado', false)
            ->where('expira_en', '>', now())
            ->latest()
            ->first();

        if (!$registro) {
            throw new Exception('No hay un código de reapertura vigente. Solicite uno nuevo.');
        }

        if (strtoupper(trim($codigo)) !== $registro->codigo) {
            throw new Exception('Código incorrecto.');
        }

        $registro->update(['usado' => true, 'usado_en' => now()]);

        $proyecto->update([
            'registros_beneficiarios_cerrados' => false,
            'fecha_cierre_registros'           => null,
            'cerrado_registros_por_id'         => null,
        ]);
    }
}
