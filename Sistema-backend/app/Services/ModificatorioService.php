<?php

namespace App\Services;

use App\Models\ItemModificatorio;
use App\Models\Modificatorio;
use App\Models\Proyecto;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;

class ModificatorioService
{
    // ── Creación ──────────────────────────────────────────────────────────────

    public function crearModificatorioMonto(Proyecto $proyecto, array $datos, User $creador): Modificatorio
    {
        return DB::transaction(function () use ($proyecto, $datos, $creador) {
            $modificatorio = Modificatorio::create([
                'proyecto_id'        => $proyecto->id,
                'tipo'               => 'monto',
                'subtipo'            => $datos['subtipo'] ?? null,
                'estado'             => 'borrador',
                'motivo'             => $datos['motivo'],
                'justificacion'      => $datos['justificacion'],
                'justificativo_legal'=> $datos['justificativo_legal'] ?? null,
                'monto_original'     => $proyecto->monto_contrato,
                'monto_nuevo'        => $proyecto->monto_contrato, // suma cero: igual
                'delta_monto'        => 0,
                'numero'             => $this->generarNumero($proyecto),
                'creado_por_id'      => $creador->id,
            ]);

            foreach (($datos['items'] ?? []) as $itemData) {
                $item = new ItemModificatorio(array_merge($itemData, [
                    'modificatorio_id' => $modificatorio->id,
                ]));
                $item->recalcular();
                $item->save();
            }

            $this->validarSumaZero($modificatorio);

            return $modificatorio->load('items');
        });
    }

    public function crearAmpliacionPlazo(Proyecto $proyecto, array $datos, User $creador): Modificatorio
    {
        $diasAmpliacion  = (int) $datos['dias_ampliacion'];
        $plazoOriginal   = (int) $proyecto->plazo_dias;
        $plazoNuevo      = $plazoOriginal + $diasAmpliacion;
        $fechaFinOriginal = $proyecto->fecha_fin_planificada;
        $fechaFinNueva    = $fechaFinOriginal?->copy()->addDays($diasAmpliacion);

        return Modificatorio::create([
            'proyecto_id'          => $proyecto->id,
            'tipo'                 => 'plazo',
            'estado'               => 'borrador',
            'motivo'               => $datos['motivo'],
            'justificacion'        => $datos['justificacion'],
            'justificativo_legal'  => $datos['justificativo_legal'] ?? null,
            'plazo_original_dias'  => $plazoOriginal,
            'dias_ampliacion'      => $diasAmpliacion,
            'plazo_nuevo_dias'     => $plazoNuevo,
            'fecha_fin_original'   => $fechaFinOriginal,
            'fecha_fin_nueva'      => $fechaFinNueva,
            'numero'               => $this->generarNumero($proyecto),
            'creado_por_id'        => $creador->id,
        ]);
    }

    // ── Flujo de aprobación ────────────────────────────────────────────────────

    public function enviarAAprobacion(Modificatorio $modificatorio, User $usuario): void
    {
        if (!$modificatorio->esBorrador()) {
            throw new Exception('Solo borradores pueden enviarse a aprobación.');
        }

        if ($modificatorio->tipo === 'monto') {
            $this->validarSumaZero($modificatorio);
        }

        $modificatorio->update(['estado' => 'pendiente_aprobacion']);
    }

    public function aprobar(Modificatorio $modificatorio, User $aprobador): void
    {
        if (!$modificatorio->esPendiente()) {
            throw new Exception('El modificatorio no está pendiente de aprobación.');
        }

        $modificatorio->update([
            'estado'           => 'aprobado',
            'aprobado_por_id'  => $aprobador->id,
            'fecha_aprobacion' => now(),
        ]);
    }

    public function rechazar(Modificatorio $modificatorio, User $rechazador, string $razon): void
    {
        if (!$modificatorio->esPendiente()) {
            throw new Exception('El modificatorio no está pendiente de aprobación.');
        }

        $modificatorio->update([
            'estado'           => 'rechazado',
            'rechazado_por_id' => $rechazador->id,
            'fecha_rechazo'    => now(),
            'razon_rechazo'    => $razon,
        ]);
    }

    public function aplicar(Modificatorio $modificatorio, User $aplicador): void
    {
        if (!$modificatorio->estaAprobado()) {
            throw new Exception('Solo modificatorios aprobados pueden aplicarse.');
        }

        DB::transaction(function () use ($modificatorio, $aplicador) {
            $proyecto = $modificatorio->proyecto;

            if ($modificatorio->tipo === 'plazo') {
                $proyecto->update([
                    'plazo_dias'           => $modificatorio->plazo_nuevo_dias,
                    'fecha_fin_planificada'=> $modificatorio->fecha_fin_nueva,
                ]);
            }
            // Para tipo=monto la suma es cero, no se modifica monto_contrato

            $modificatorio->update([
                'estado'           => 'aplicado',
                'aplicado_por_id'  => $aplicador->id,
                'fecha_aplicacion' => now(),
            ]);
        });
    }

    // ── Actualización de ítems ─────────────────────────────────────────────────

    public function actualizarItems(Modificatorio $modificatorio, array $items): void
    {
        if (!$modificatorio->esBorrador()) {
            throw new Exception('Solo se pueden editar ítems en borradores.');
        }

        DB::transaction(function () use ($modificatorio, $items) {
            $modificatorio->items()->delete();

            foreach ($items as $itemData) {
                $item = new ItemModificatorio(array_merge($itemData, [
                    'modificatorio_id' => $modificatorio->id,
                ]));
                $item->recalcular();
                $item->save();
            }
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function validarSumaZero(Modificatorio $modificatorio): void
    {
        $delta = $modificatorio->fresh()->calcularDeltaTotal();
        if (abs($delta) > 0.01) {
            throw new Exception(
                sprintf('Los ítems no suman cero. Delta actual: %s Bs.', number_format($delta, 2))
            );
        }
    }

    private function generarNumero(Proyecto $proyecto): string
    {
        $count = Modificatorio::where('proyecto_id', $proyecto->id)->count() + 1;
        $anio  = now()->year;
        return sprintf('MOD-%04d-%d-%s', $count, $anio, strtoupper(substr($proyecto->codigo, 0, 6)));
    }

    /** Genera el texto legal estándar para el justificativo */
    public function generarJustificativoLegal(Modificatorio $modificatorio): string
    {
        $proyecto = $modificatorio->proyecto;

        if ($modificatorio->tipo === 'plazo') {
            $dias    = $modificatorio->dias_ampliacion;
            $fechaFin = optional($modificatorio->fecha_fin_nueva)->format('d/m/Y');
            return "MODIFICATORIO DE AMPLIACIÓN DE PLAZO\n\n"
                . "En virtud de lo establecido en el contrato de obra N° [CONTRATO], "
                . "las partes acuerdan ampliar el plazo de ejecución de la obra \"{$proyecto->nombre}\" "
                . "en {$dias} días calendario, quedando la nueva fecha de conclusión establecida "
                . "para el día {$fechaFin}. Esta ampliación se justifica en razón de: "
                . $modificatorio->justificacion . "\n\n"
                . "Firmado en conformidad por ambas partes.";
        }

        return "MODIFICATORIO DE REDISTRIBUCIÓN DE MONTOS\n\n"
            . "En virtud de lo establecido en el contrato de obra N° [CONTRATO], "
            . "las partes acuerdan la redistribución de ítems presupuestarios del proyecto "
            . "\"{$proyecto->nombre}\", manteniendo invariable el monto total del contrato. "
            . "La presente redistribución se justifica en razón de: "
            . $modificatorio->justificacion . "\n\n"
            . "Firmado en conformidad por ambas partes.";
    }
}
