<?php

namespace App\Services\Activos;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Exception;
use Illuminate\Support\Facades\Log;
use App\Models\Activos\PlanOptimizacion;
use App\Models\ActaEntregaActivo;
use App\Models\Activo;
use App\Models\AsignacionActivo;
use App\Models\Proyecto;
use App\Models\Vivienda;
use Barryvdh\DomPDF\Facade\Pdf;

class OptimizacionService
{
    private $pythonApiUrl = 'http://127.0.0.1:8002';

    public function optimizarProyectos(array $payload)
    {
        Log::info('Payload enviado a Python (proyectos):', $payload);

        try {
            $response = Http::timeout(15)->post("{$this->pythonApiUrl}/optimize/proyectos", $payload);

            if ($response->successful()) {
                $resultado = $response->json();

                return PlanOptimizacion::create([
                    'activo_id' => $payload['activo_id'],
                    'tipo_plan' => 'proyectos_privados',
                    'parametros_entrada' => $payload,
                    'resultados' => $resultado,
                    'score_total' => $resultado['score_total'] ?? 0,
                    'distancia_total_km' => $resultado['distancia_total_km'] ?? 0,
                    'dias_estimados' => count($resultado['asignaciones'] ?? []),
                    'estado' => 'generado',
                    'created_by' => auth()->id() ?? 1,
                ]);
            }

            Log::error('Error del motor IA (Proyectos): ' . $response->body());
            throw new Exception('El motor de optimización devolvió un error al calcular proyectos.');

        } catch (Exception $e) {
            Log::error('Fallo de conexión con API Python (Proyectos): ' . $e->getMessage());
            throw new Exception('No se pudo conectar con el motor de optimización. Verifica el puerto 8002.');
        }
    }

    public function optimizarViviendas(array $payload)
    {
        Log::info('Payload enviado a Python (viviendas):', $payload);

        try {
            $response = Http::timeout(20)->post("{$this->pythonApiUrl}/optimize/viviendas", $payload);

            if ($response->successful()) {
                $resultado = $response->json();

                return PlanOptimizacion::create([
                    'activo_id' => $payload['activo_id'],
                    'tipo_plan' => 'viviendas_sociales',
                    'parametros_entrada' => $payload,
                    'resultados' => $resultado,
                    'score_total' => $resultado['score_total'] ?? 0,
                    'distancia_total_km' => collect($resultado['rutas'] ?? [])->sum('distancia_total_km'),
                    'dias_estimados' => collect($resultado['rutas'] ?? [])->max('dias_estimados'),
                    'estado' => 'generado',
                    'created_by' => auth()->id() ?? 1,
                ]);
            }

            Log::error('Error del motor IA (Viviendas): ' . $response->body());
            throw new Exception('El motor de optimización devolvió un error al trazar rutas de viviendas.');

        } catch (Exception $e) {
            Log::error('Fallo de conexión con API Python (Viviendas): ' . $e->getMessage());
            throw new Exception('No se pudo conectar con el motor de optimización. Verifica el puerto 8002.');
        }
    }

    public function aprobarPlan(PlanOptimizacion $plan, ?array $planEditado = null, ?array $planEditadoVRP = null): void
    {
        if ($plan->estado !== 'generado') {
            throw new Exception('Este plan ya fue procesado anteriormente.');
        }

        // Solo el plan de proyectos (Simplex) admite edición de orden/días.
        // El plan de viviendas (VRP) ya viene optimizado por OR-Tools; reordenar
        // manualmente invalidaría las distancias calculadas.
        $asignacionesEditadas = null;
        if ($planEditado !== null && $plan->tipo_plan === 'proyectos_privados') {
            $asignacionesEditadas = $this->recalcularFechas(
                collect($planEditado)
                    ->sortBy('orden')
                    ->values()
                    ->map(fn ($a) => [
                        'proyecto_id'     => (int) $a['proyecto_id'],
                        'dias_asignados'  => max(1, (int) $a['dias_asignados']),
                        'orden'           => (int) $a['orden'],
                        'score_prioridad' => $a['score_prioridad'] ?? 0,
                    ])
                    ->all()
            );

            // Guardar el plan editado para auditoría, sin perder el resultado original.
            $plan->update([
                'resultados_editados' => array_merge($plan->resultados, ['asignaciones' => $asignacionesEditadas]),
            ]);
        }

        if ($planEditadoVRP !== null && $plan->tipo_plan === 'viviendas_sociales') {
            // Guardamos el plan editado para auditoría. A diferencia del modo proyectos,
            // NO recalculamos fecha_estimada aquí: si el usuario reordenó o cambió horas,
            // las fechas por vivienda quedan tal como las dejó el frontend.
            $plan->update(['resultados_editados' => $planEditadoVRP]);
        }

        DB::beginTransaction();
        try {
            if ($plan->tipo_plan === 'proyectos_privados') {
                $this->crearAsignacionesProyectos($plan, $asignacionesEditadas);
            } elseif ($plan->tipo_plan === 'viviendas_sociales') {
                $this->crearAsignacionesViviendas($plan, $planEditadoVRP);
            }

            $plan->update([
                'estado'      => 'aprobado',
                'approved_by' => auth()->id() ?? 1,
                'approved_at' => now(),
            ]);

            DB::commit();
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error al aprobar plan #' . $plan->id . ': ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Recalcula fecha_inicio/fecha_fin en secuencia según el nuevo orden y días,
     * igual que _construir_respuesta en el motor Python (+1 día de traslado entre proyectos).
     */
    private function recalcularFechas(array $asignaciones): array
    {
        $fechaCursor = now()->toDateString();

        foreach ($asignaciones as &$asig) {
            $dias = $asig['dias_asignados'];
            $asig['fecha_inicio'] = $fechaCursor;
            $fechaFin = date('Y-m-d', strtotime($fechaCursor . ' +' . ($dias - 1) . ' days'));
            $asig['fecha_fin'] = $fechaFin;
            $fechaCursor = date('Y-m-d', strtotime($fechaFin . ' +2 days'));
        }

        return $asignaciones;
    }

    private function crearAsignacionesProyectos(PlanOptimizacion $plan, ?array $asignacionesOverride = null): void
    {
        $asignaciones = $asignacionesOverride ?? ($plan->resultados['asignaciones'] ?? []);

        foreach ($asignaciones as $asig) {
            $proyecto = Proyecto::find($asig['proyecto_id']);
            if (!$proyecto) {
                Log::warning("Plan #{$plan->id}: proyecto_id {$asig['proyecto_id']} no encontrado, saltando.");
                continue;
            }

            // Verificar que no haya superposición de fechas con otras asignaciones activas del activo
            $existe = AsignacionActivo::where('activo_id', $plan->activo_id)
                ->whereNotIn('estado', ['cancelada', 'completada'])
                ->where(function ($q) use ($asig) {
                    $q->whereBetween('fecha_inicio', [$asig['fecha_inicio'], $asig['fecha_fin']])
                      ->orWhereBetween('fecha_fin_estimada', [$asig['fecha_inicio'], $asig['fecha_fin']]);
                })->exists();

            if ($existe) {
                throw new Exception(
                    "Conflicto de fechas: el activo ya tiene una asignación que se superpone " .
                    "con el proyecto '{$proyecto->nombre}' ({$asig['fecha_inicio']} - {$asig['fecha_fin']})"
                );
            }

            AsignacionActivo::create([
                'activo_id'           => $plan->activo_id,
                'proyecto_id'         => (int) $asig['proyecto_id'],
                'vivienda_id'         => null,
                'fecha_inicio'        => $asig['fecha_inicio'],
                'fecha_fin_estimada'  => $asig['fecha_fin'],
                'estado'              => 'planificada',
                'horas_dia_estimadas' => 8.0,
                'created_by'          => auth()->id() ?? 1,
            ]);
        }
    }

    private function crearAsignacionesViviendas(PlanOptimizacion $plan, ?array $planEditadoVRP = null): void
    {
        $rutas = $planEditadoVRP['rutas'] ?? $plan->resultados['rutas'] ?? [];
        $proyectoId = $plan->parametros_entrada['proyecto_id'] ?? null;

        foreach ($rutas as $ruta) {
            foreach ($ruta['viviendas_ordenadas'] as $parada) {
                $viviendaId = (int) $parada['vivienda_id'];
                $fechaEstimada = explode('T', $parada['fecha_estimada'])[0];
                $fechaDevolucion = isset($parada['fecha_devolucion'])
                    ? explode('T', $parada['fecha_devolucion'])[0]
                    : date('Y-m-d', strtotime($fechaEstimada . ' +1 day'));

                $vivienda = Vivienda::with('beneficiario')->find($viviendaId);
                if (!$vivienda) {
                    Log::warning("Plan #{$plan->id}: vivienda_id {$viviendaId} no encontrada.");
                    continue;
                }

                $asignacion = AsignacionActivo::create([
                    'activo_id'           => $plan->activo_id,
                    'proyecto_id'         => $proyectoId ? (int) $proyectoId : null,
                    'vivienda_id'         => $viviendaId,
                    'fecha_inicio'        => $fechaEstimada,
                    'fecha_fin_estimada'  => $fechaDevolucion,
                    'estado'              => 'planificada',
                    'horas_dia_estimadas' => (float) ($parada['horas_estimadas'] ?? 4.0),
                    'created_by'          => auth()->id() ?? 1,
                ]);

                // Generar acta de entrega automáticamente si la vivienda tiene beneficiario (flujo social)
                if ($vivienda->beneficiario) {
                    $this->generarActaEntrega($plan, $asignacion, $vivienda, $fechaEstimada, $fechaDevolucion);
                }
            }
        }
    }

    private function generarActaEntrega(
        PlanOptimizacion $plan,
        AsignacionActivo $asignacion,
        Vivienda $vivienda,
        string $fechaEstimada,
        string $fechaDevolucion
    ): void {
        $activo = Activo::find($plan->activo_id);
        $prefijo = 'ACTA-' . ($activo?->codigo ?? 'ACT') . '-';

        // numero_acta es único a nivel global (no por proyecto), así que el correlativo
        // debe basarse en el último número usado bajo este prefijo, no en un conteo
        // filtrado por proyecto (eso causaba colisiones con actas de otros proyectos
        // del mismo activo).
        $ultimoCorrelativo = ActaEntregaActivo::where('numero_acta', 'like', $prefijo . '%')
            ->get(['numero_acta'])
            ->map(fn ($a) => (int) substr($a->numero_acta, strlen($prefijo)))
            ->max() ?? 0;

        $numeroActa = $prefijo . str_pad((string) ($ultimoCorrelativo + 1), 3, '0', STR_PAD_LEFT);

        $acta = ActaEntregaActivo::create([
            'asignacion_activo_id'      => $asignacion->id,
            'vivienda_id'               => $vivienda->id,
            'beneficiario_id'           => $vivienda->beneficiario->id,
            'activo_id'                 => $plan->activo_id,
            'numero_acta'               => $numeroActa,
            'fecha_entrega_estimada'    => $fechaEstimada,
            'fecha_devolucion_estimada' => $fechaDevolucion,
            'estado'                    => 'generada',
            'created_by'                => auth()->id() ?? 1,
        ]);

        // Mismo PDF que genera el flujo manual (ActaEntregaService::crear) — sin esto
        // el acta queda sin documento para imprimir y el usuario no puede avanzar
        // del paso "Generada" a "Impresa".
        $acta->load(['vivienda', 'beneficiario', 'activo']);

        $pdf = Pdf::loadView('pdfs.acta-entrega', [
            'acta'         => $acta,
            'activo'       => $acta->activo,
            'vivienda'     => $acta->vivienda,
            'beneficiario' => $acta->beneficiario,
            'proyecto'     => Proyecto::find($asignacion->proyecto_id),
        ])->setPaper('letter', 'portrait');

        $filename = "actas/{$asignacion->proyecto_id}/{$activo->codigo}_{$vivienda->id}_generada.pdf";
        Storage::put($filename, $pdf->output());

        $acta->pdf_generado_url = $filename;
        $acta->save();
    }
}
