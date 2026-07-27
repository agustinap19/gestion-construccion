<?php

namespace App\Services\Activos;

use App\Models\ActaEntregaActivo;
use App\Models\AsignacionActivo;
use App\Models\MantenimientoActivo;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Exception;

class ActaEntregaService
{
    /**
     * Query base de actas devueltas (historial + exportación PDF), con búsqueda
     * libre por activo/proyecto/beneficiario y filtro por categoría de proyecto.
     */
    public function queryDevueltas(array $filtros = []): \Illuminate\Database\Eloquent\Builder
    {
        $query = ActaEntregaActivo::where('estado', 'devuelta')
            ->with([
                'activo:id,nombre,codigo',
                'vivienda:id,codigo,proyecto_id',
                'beneficiario:id,nombre,apellido_paterno,apellido_materno',
                'asignacion.proyecto:id,nombre,codigo,categoria',
                'aprobadoPor:id,nombre,apellido_paterno,apellido_materno',
                'entregaRegistradaPor:id,nombre,apellido_paterno,apellido_materno',
                'devolucionRegistradaPor:id,nombre,apellido_paterno,apellido_materno',
            ]);

        if (!empty($filtros['categoria']) && $filtros['categoria'] !== 'todos') {
            $categoria = $filtros['categoria'];
            $query->whereHas('asignacion.proyecto', fn ($q) => $q->where('categoria', $categoria));
        }

        if (!empty($filtros['buscar'])) {
            $b = $filtros['buscar'];
            $query->where(function ($w) use ($b) {
                $w->whereHas('activo', fn ($q) => $q->where('nombre', 'like', "%{$b}%"))
                  ->orWhereHas('asignacion.proyecto', fn ($q) => $q->where('nombre', 'like', "%{$b}%"))
                  ->orWhereHas('beneficiario', fn ($q) => $q->where('nombre', 'like', "%{$b}%")
                        ->orWhere('apellido_paterno', 'like', "%{$b}%")
                        ->orWhere('apellido_materno', 'like', "%{$b}%"));
            });
        }

        // Rango de fechas sobre fecha_devolucion_real (cuándo se finalizó la entrega).
        // Se acota siempre contra hoy: no tiene sentido (ni se debe permitir) filtrar a futuro.
        $hoy = now()->toDateString();

        $desde = $filtros['fecha_desde'] ?? null;
        if ($desde && $desde <= $hoy) {
            $query->whereDate('fecha_devolucion_real', '>=', $desde);
        }

        $hasta = $filtros['fecha_hasta'] ?? null;
        $hasta = $hasta && $hasta <= $hoy ? $hasta : $hoy;
        $query->whereDate('fecha_devolucion_real', '<=', $hasta);

        return $query;
    }

    /**
     * Rango de fechas disponible para el filtro: desde la primera devolución
     * registrada en el sistema hasta hoy (límite superior, no se permite futuro).
     */
    public function rangoFechasDevueltas(): array
    {
        $minima = ActaEntregaActivo::where('estado', 'devuelta')->min('fecha_devolucion_real');

        return [
            'min' => $minima ? \Illuminate\Support\Carbon::parse($minima)->toDateString() : now()->toDateString(),
            'max' => now()->toDateString(),
        ];
    }

    public function crear(int $asignacionId, array $datos, int $userId): ActaEntregaActivo
    {
        $asignacion = AsignacionActivo::with(['activo', 'proyecto'])->findOrFail($asignacionId);

        if ($asignacion->proyecto?->categoria !== 'social') {
            throw new Exception('Solo se pueden generar actas para asignaciones de proyectos sociales.');
        }

        $viviendaId = $datos['vivienda_id'] ?? $asignacion->vivienda_id;
        if (!$viviendaId) {
            throw new Exception('Debe indicar la vivienda para generar el acta.');
        }

        $vivienda = \App\Models\Vivienda::findOrFail($viviendaId);
        if ($vivienda->proyecto_id !== $asignacion->proyecto_id) {
            throw new Exception('La vivienda no pertenece al proyecto de la asignación.');
        }

        $beneficiarioId = $datos['beneficiario_id'] ?? $vivienda->beneficiario_id;
        if (!$beneficiarioId) {
            throw new Exception('La vivienda no tiene un beneficiario asignado.');
        }

        $activo = $asignacion->activo;

        $tieneActaActiva = ActaEntregaActivo::where('activo_id', $activo->id)
            ->whereIn('estado', ['aprobada', 'entregada'])
            ->exists();

        if ($tieneActaActiva) {
            throw new Exception("El activo {$activo->nombre} ya tiene un acta de entrega en curso.");
        }

        return DB::transaction(function () use ($asignacion, $vivienda, $beneficiarioId, $activo, $datos, $userId) {
            // El correlativo es por activo a nivel global (no por proyecto): numero_acta
            // es único en toda la tabla, y un mismo activo puede prestarse en varios proyectos.
            $ultimoNumero = ActaEntregaActivo::where('activo_id', $activo->id)
                ->where('numero_acta', 'like', "ACTA-{$activo->codigo}-%")
                ->orderByDesc('id')
                ->value('numero_acta');

            $correlativo = 1;
            if ($ultimoNumero && preg_match('/-(\d+)$/', $ultimoNumero, $m)) {
                $correlativo = (int) $m[1] + 1;
            }

            $numeroActa = 'ACTA-' . $activo->codigo . '-' . str_pad((string) $correlativo, 3, '0', STR_PAD_LEFT);

            $acta = ActaEntregaActivo::create([
                'asignacion_activo_id'      => $asignacion->id,
                'vivienda_id'               => $vivienda->id,
                'beneficiario_id'           => $beneficiarioId,
                'activo_id'                 => $activo->id,
                'numero_acta'               => $numeroActa,
                'fecha_entrega_estimada'    => $datos['fecha_entrega_estimada'] ?? $asignacion->fecha_inicio,
                'fecha_devolucion_estimada' => $datos['fecha_devolucion_estimada'] ?? $asignacion->fecha_fin_estimada,
                'estado'                    => 'generada',
                'created_by'                => $userId,
            ]);

            $acta->load(['vivienda', 'beneficiario', 'activo', 'asignacion.proyecto']);

            $pdf = Pdf::loadView('pdfs.acta-entrega', [
                'acta'         => $acta,
                'activo'       => $acta->activo,
                'vivienda'     => $acta->vivienda,
                'beneficiario' => $acta->beneficiario,
                'proyecto'     => $acta->asignacion->proyecto,
            ])->setPaper('letter', 'portrait');

            $filename = "actas/{$asignacion->proyecto_id}/{$activo->codigo}_{$vivienda->id}_generada.pdf";
            Storage::put($filename, $pdf->output());

            $acta->pdf_generado_url = $filename;
            $acta->save();

            return $acta;
        });
    }

    public function cambiarEstado(int $actaId, string $nuevoEstado, array $payload, User $usuario): ActaEntregaActivo
    {
        $acta = ActaEntregaActivo::with(['activo', 'vivienda', 'asignacion'])->findOrFail($actaId);

        if (!$acta->puedeTransicionarA($nuevoEstado)) {
            throw new Exception("No se puede pasar de '{$acta->estado}' a '{$nuevoEstado}'.");
        }

        return match (true) {
            $acta->estado === 'impresa' && $nuevoEstado === 'firmada_subida' => $this->subirFirmada($acta, $payload),
            $acta->estado === 'firmada_subida' && $nuevoEstado === 'aprobada' => $this->aprobar($acta, $usuario),
            $acta->estado === 'firmada_subida' && $nuevoEstado === 'impresa' => $this->rechazar($acta, $payload),
            $acta->estado === 'aprobada' && $nuevoEstado === 'entregada' => $this->registrarEntrega($acta, $payload, $usuario),
            $acta->estado === 'entregada' && $nuevoEstado === 'devuelta' => $this->registrarDevolucion($acta, $payload, $usuario),
            default => $this->transicionSimple($acta, $nuevoEstado),
        };
    }

    private function transicionSimple(ActaEntregaActivo $acta, string $nuevoEstado): ActaEntregaActivo
    {
        $acta->estado = $nuevoEstado;
        $acta->save();
        return $acta->fresh(['activo', 'vivienda', 'beneficiario']);
    }

    private function subirFirmada(ActaEntregaActivo $acta, array $payload): ActaEntregaActivo
    {
        $file = $payload['pdf_firmado'] ?? null;
        if (!$file) {
            throw new Exception('Debe adjuntar el PDF firmado.');
        }

        $path = "actas/{$acta->asignacion->proyecto_id}/{$acta->activo->codigo}_{$acta->vivienda_id}_firmada.pdf";
        Storage::put($path, file_get_contents($file->getRealPath()));

        $acta->pdf_firmado_url = $path;
        $acta->estado = 'firmada_subida';
        $acta->save();

        return $acta->fresh(['activo', 'vivienda', 'beneficiario']);
    }

    private function aprobar(ActaEntregaActivo $acta, User $usuario): ActaEntregaActivo
    {
        return DB::transaction(function () use ($acta, $usuario) {
            $acta->aprobado_por = $usuario->id;
            $acta->estado = 'aprobada';
            $acta->save();

            $asignacion = $acta->asignacion;
            $asignacion->estado = 'activa';
            $asignacion->save();

            return $acta->fresh(['activo', 'vivienda', 'beneficiario']);
        });
    }

    private function rechazar(ActaEntregaActivo $acta, array $payload): ActaEntregaActivo
    {
        $nota = trim((string) ($payload['nota_rechazo'] ?? ''));
        if (mb_strlen($nota) < 10) {
            throw new Exception('La nota de rechazo es obligatoria y debe tener al menos 10 caracteres.');
        }

        $acta->nota_rechazo = $nota;
        $acta->estado = 'impresa';
        $acta->save();

        return $acta->fresh(['activo', 'vivienda', 'beneficiario']);
    }

    private function registrarEntrega(ActaEntregaActivo $acta, array $payload, User $usuario): ActaEntregaActivo
    {
        $file = $payload['foto'] ?? null;
        if (!$file) {
            throw new Exception('Debe adjuntar una foto de la entrega.');
        }

        // El guard de crear() solo bloquea generar una acta nueva mientras otra está
        // 'aprobada'/'entregada'; si dos actas se generaron casi en paralelo (ambas
        // en 'generada'), podrían avanzar de forma independiente y llegar aquí ambas.
        // El activo físico no puede estar entregado a dos viviendas a la vez.
        $otraEntregada = ActaEntregaActivo::where('activo_id', $acta->activo_id)
            ->where('estado', 'entregada')
            ->where('id', '!=', $acta->id)
            ->exists();

        if ($otraEntregada) {
            throw new Exception("El activo {$acta->activo->nombre} ya está entregado a otra vivienda. Registre la devolución primero.");
        }

        return DB::transaction(function () use ($acta, $file, $usuario) {
            $filename = "actas/{$acta->asignacion->proyecto_id}/{$acta->activo->codigo}_{$acta->vivienda_id}_entrega." . $file->getClientOriginalExtension();
            $file->storeAs(dirname($filename), basename($filename), 'public');

            $acta->foto_entrega_url = '/storage/' . $filename;
            $acta->fecha_entrega_real = now();
            $acta->entrega_registrada_por = $usuario->id;
            $acta->estado = 'entregada';
            $acta->save();

            return $acta->fresh(['activo', 'vivienda', 'beneficiario']);
        });
    }

    private function registrarDevolucion(ActaEntregaActivo $acta, array $payload, User $usuario): ActaEntregaActivo
    {
        $file = $payload['foto'] ?? null;
        $estadoDevolucion = $payload['estado_devolucion'] ?? null;

        if (!$file) {
            throw new Exception('Debe adjuntar una foto de la devolución.');
        }
        if (!in_array($estadoDevolucion, ['bueno', 'dañado', 'con_observaciones'], true)) {
            throw new Exception('Debe indicar el estado de devolución del activo.');
        }

        return DB::transaction(function () use ($acta, $file, $estadoDevolucion, $usuario) {
            $filename = "actas/{$acta->asignacion->proyecto_id}/{$acta->activo->codigo}_{$acta->vivienda_id}_devolucion." . $file->getClientOriginalExtension();
            $file->storeAs(dirname($filename), basename($filename), 'public');

            $acta->foto_devolucion_url = '/storage/' . $filename;
            $acta->fecha_devolucion_real = now();
            $acta->estado_devolucion = $estadoDevolucion;
            $acta->devolucion_registrada_por = $usuario->id;
            $acta->estado = 'devuelta';
            $acta->save();

            $activo = $acta->activo;
            $asignacion = $acta->asignacion;

            if ($estadoDevolucion === 'dañado') {
                MantenimientoActivo::create([
                    'activo_id'        => $activo->id,
                    'tipo'             => 'correctivo',
                    'fecha_programada' => now(),
                    'descripcion'      => "Daño reportado al devolver de vivienda #{$acta->vivienda->codigo}",
                    'horas_al_momento' => $activo->horas_uso_acumuladas,
                    'estado'           => 'programado',
                    'created_by'       => $acta->created_by,
                ]);
                $activo->estado = 'mantenimiento';
                $activo->save();
            } else {
                $diasUsados = (int) $acta->fecha_entrega_real?->diffInDays($acta->fecha_devolucion_real ?? now()) ?: 1;
                $activo->horas_uso_acumuladas += $diasUsados * (float) $asignacion->horas_dia_estimadas;

                if ($activo->necesitaMantenimiento()) {
                    $activo->estado = 'mantenimiento';
                    MantenimientoActivo::create([
                        'activo_id'        => $activo->id,
                        'tipo'             => 'preventivo',
                        'fecha_programada' => now(),
                        'descripcion'      => 'Mantenimiento preventivo programado automáticamente al alcanzar el umbral de horas de uso.',
                        'horas_al_momento' => $activo->horas_uso_acumuladas,
                        'estado'           => 'programado',
                        'created_by'       => $acta->created_by,
                    ]);
                } else {
                    $activo->estado = 'disponible';
                }
                $activo->save();
            }

            $asignacion->estado = 'completada';
            $asignacion->horas_reales_acumuladas = $activo->horas_uso_acumuladas;
            $asignacion->save();

            return $acta->fresh(['activo', 'vivienda', 'beneficiario']);
        });
    }
}
