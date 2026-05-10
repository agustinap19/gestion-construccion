<?php

namespace App\Services\Personal;

use App\Models\Competencia;
use App\Models\Personal;
use App\Services\AuditoriaService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Exception;

class PersonalCompetenciaService
{
    public function __construct(
        protected AuditoriaService $auditoriaService
    ) {}

    /**
     * Lista las competencias de un personal con datos completos.
     */
    public function listarPorPersonal(int $personalId): Collection
    {
        $personal = Personal::findOrFail($personalId);
        return $personal->competencias()->orderBy('personal_competencia.created_at', 'desc')->get();
    }

    /**
     * Asigna una competencia a un personal.
     */
    public function asignar(int $personalId, int $competenciaId, array $datos, int $actorId): array
    {
        $personal = Personal::findOrFail($personalId);
        $competencia = Competencia::findOrFail($competenciaId);

        // Validar fecha_vencimiento si requiere renovación
        if ($competencia->requiere_renovacion && empty($datos['fecha_vencimiento'])) {
            throw new Exception('La competencia requiere fecha de vencimiento porque necesita renovación.');
        }

        // Verificar duplicado con misma fecha_emision
        $existe = DB::table('personal_competencia')
            ->where('personal_id', $personalId)
            ->where('competencia_id', $competenciaId)
            ->where('fecha_emision', $datos['fecha_emision'])
            ->exists();

        if ($existe) {
            throw new Exception('Esta competencia ya está asignada al personal con la misma fecha de emisión.');
        }

        // Calcular estado
        $estado = 'vigente';
        if (!empty($datos['fecha_vencimiento']) && $datos['fecha_vencimiento'] < now()->toDateString()) {
            $estado = 'vencida';
        }

        $pivotData = [
            'fecha_emision' => $datos['fecha_emision'],
            'fecha_vencimiento' => $datos['fecha_vencimiento'] ?? null,
            'entidad_emisora' => $datos['entidad_emisora'] ?? null,
            'numero_certificado' => $datos['numero_certificado'] ?? null,
            'archivo_url' => $datos['archivo_url'] ?? null,
            'estado' => $estado,
        ];

        $personal->competencias()->attach($competenciaId, $pivotData);

        $this->auditoriaService->registrar('personal.competencia_asignada', 'personal', $personalId, [
            'datos_nuevos' => [
                'competencia' => $competencia->nombre,
                'fecha_emision' => $datos['fecha_emision'],
                'fecha_vencimiento' => $datos['fecha_vencimiento'] ?? 'N/A',
                'estado' => $estado,
            ],
        ]);

        // Retornar el registro recién creado
        $registro = DB::table('personal_competencia')
            ->where('personal_id', $personalId)
            ->where('competencia_id', $competenciaId)
            ->where('fecha_emision', $datos['fecha_emision'])
            ->first();

        return (array) $registro;
    }

    /**
     * Actualiza una asignación de competencia existente.
     */
    public function actualizar(int $pivotId, array $datos, int $actorId): array
    {
        $registro = DB::table('personal_competencia')->where('id', $pivotId)->first();
        if (!$registro) {
            throw new Exception('Registro de competencia no encontrado.');
        }

        $datosUpdate = [];
        $camposPermitidos = ['fecha_emision', 'fecha_vencimiento', 'entidad_emisora', 'numero_certificado', 'archivo_url', 'estado'];

        foreach ($camposPermitidos as $campo) {
            if (array_key_exists($campo, $datos)) {
                $datosUpdate[$campo] = $datos[$campo];
            }
        }

        // Recalcular estado si cambia fecha_vencimiento
        if (isset($datosUpdate['fecha_vencimiento'])) {
            if ($datosUpdate['fecha_vencimiento'] && $datosUpdate['fecha_vencimiento'] < now()->toDateString()) {
                $datosUpdate['estado'] = 'vencida';
            } elseif ($datosUpdate['fecha_vencimiento']) {
                $datosUpdate['estado'] = 'vigente';
            }
        }

        if (!empty($datosUpdate)) {
            $datosUpdate['updated_at'] = now();
            DB::table('personal_competencia')->where('id', $pivotId)->update($datosUpdate);

            $this->auditoriaService->registrar('personal.competencia_actualizada', 'personal', $registro->personal_id, [
                'datos_anteriores' => (array) $registro,
                'datos_nuevos' => $datosUpdate,
            ]);
        }

        return (array) DB::table('personal_competencia')->where('id', $pivotId)->first();
    }

    /**
     * Desasigna una competencia de un personal.
     */
    public function desasignar(int $pivotId, int $actorId): bool
    {
        $registro = DB::table('personal_competencia')->where('id', $pivotId)->first();
        if (!$registro) {
            throw new Exception('Registro de competencia no encontrado.');
        }

        $competencia = Competencia::find($registro->competencia_id);

        $this->auditoriaService->registrar('personal.competencia_desasignada', 'personal', $registro->personal_id, [
            'datos_anteriores' => [
                'competencia' => $competencia->nombre ?? 'Desconocida',
                'fecha_emision' => $registro->fecha_emision,
            ],
        ]);

        return DB::table('personal_competencia')->where('id', $pivotId)->delete() > 0;
    }

    /**
     * Obtiene competencias próximas a vencer en los próximos N días.
     */
    public function obtenerProximasAVencer(int $diasAdvertencia = 30): Collection
    {
        return collect(
            DB::table('personal_competencia')
                ->join('personal', 'personal.id', '=', 'personal_competencia.personal_id')
                ->join('competencias', 'competencias.id', '=', 'personal_competencia.competencia_id')
                ->where('personal_competencia.estado', 'vigente')
                ->whereBetween('personal_competencia.fecha_vencimiento', [now(), now()->addDays($diasAdvertencia)])
                ->whereNull('personal.deleted_at')
                ->select(
                    'personal_competencia.*',
                    'personal.nombre as personal_nombre',
                    'personal.apellido_paterno as personal_apellido',
                    'personal.codigo_empleado',
                    'competencias.nombre as competencia_nombre',
                    'competencias.tipo as competencia_tipo'
                )
                ->orderBy('personal_competencia.fecha_vencimiento')
                ->get()
        );
    }

    /**
     * Actualiza estados de competencias vencidas (para cron diario).
     */
    public function actualizarEstadosVencimientos(): int
    {
        return DB::table('personal_competencia')
            ->where('estado', 'vigente')
            ->whereNotNull('fecha_vencimiento')
            ->where('fecha_vencimiento', '<', now()->toDateString())
            ->update(['estado' => 'vencida', 'updated_at' => now()]);
    }
}
