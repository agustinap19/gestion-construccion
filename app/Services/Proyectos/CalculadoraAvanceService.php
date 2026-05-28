<?php

namespace App\Services\Proyectos;

use App\Models\FaseProyecto;
use App\Models\ItemChecklist;
use App\Models\Proyecto;
use App\Models\Vivienda;
use Carbon\Carbon;

class CalculadoraAvanceService
{
    /**
     * Construye todos los datos del dashboard de un proyecto sin N+1.
     * Carga todo en una sola consulta eager-loaded.
     */
    public function calcularDashboard(Proyecto $proyecto): array
    {
        $hoy   = Carbon::today();
        $inicio = $proyecto->fecha_inicio_planificada;
        $fin    = $proyecto->fecha_fin_planificada;

        // ── Tiempo ──────────────────────────────────────────────────────────
        $diasTotales       = ($inicio && $fin) ? (int) $inicio->diffInDays($fin) : null;
        $diasTranscurridos = $inicio
            ? max(0, min((int) $inicio->diffInDays($hoy), $diasTotales ?? PHP_INT_MAX))
            : 0;
        $porcentajePlazo   = ($diasTotales > 0)
            ? round(min(100.0, ($diasTranscurridos / $diasTotales) * 100), 1)
            : null;

        $esSocial = $proyecto->categoria === 'social';

        // ── Avance y unidades ────────────────────────────────────────────────
        if ($esSocial) {
            $viviendas = $proyecto->viviendas()
                ->whereNotNull('beneficiario_id')
                ->with(['itemsChecklist', 'tipoVivienda:id,nombre', 'beneficiario:id,nombre,apellido_paterno'])
                ->orderBy('codigo')
                ->get();

            $avancePorUnidad   = $this->avancePorViviendas($viviendas);
            $avanceGlobal      = $viviendas->isNotEmpty()
                ? round((float) $viviendas->avg('porcentaje_avance'), 2)
                : 0.0;
            $unidadesCompletadas = $viviendas->where('estado', 'entregada')->count();
            $totalUnidades       = $viviendas->count();
        } else {
            $fases = $proyecto->fasesProyecto()
                ->with('itemsChecklist')
                ->orderBy('orden')
                ->get();

            $avancePorUnidad   = $this->avancePorFases($fases);
            $avanceGlobal      = $fases->isNotEmpty()
                ? round((float) $fases->avg('avance_porcentaje'), 2)
                : 0.0;
            $unidadesCompletadas = $fases->where('estado', 'completada')->count();
            $totalUnidades       = $fases->count();
        }

        $hayRetraso = $fin && $hoy->greaterThan($fin) && $avanceGlobal < 100;

        // ── Gantt ────────────────────────────────────────────────────────────
        $gantt = $this->construirGantt($proyecto, $esSocial, $inicio, $fin, $hoy);

        // ── Almacén ──────────────────────────────────────────────────────────
        $almacen        = $proyecto->almacen;
        $almacenResumen = $almacen ? [
            'id'                => $almacen->id,
            'codigo'            => $almacen->codigo,
            'nombre'            => $almacen->nombre,
            'ubicacion'         => $almacen->ubicacion,
            'estado'            => $almacen->estado,
            'existe'            => true,
            'movimientos_mes'   => 0,
            'ultimos_movimientos' => [],
        ] : ['existe' => false];

        // ── Beneficiarios resumen (solo social) ──────────────────────────────
        $beneficiariosResumen = null;
        if ($esSocial) {
            $benefs = $proyecto->beneficiarios()
                ->select('id', 'nombre', 'apellido_paterno', 'estado_seleccion', 'proyecto_id')
                ->orderByDesc('created_at')
                ->get();

            $beneficiariosResumen = [
                'total_registrados' => $benefs->count(),
                'cupo_total'        => (int) ($proyecto->cantidad_beneficiarios ?? 0),
                'cupos_restantes'   => max(0, (int) ($proyecto->cantidad_beneficiarios ?? 0) - $benefs->count()),
                'ultimos'           => $benefs->take(5)->map(fn($b) => [
                    'id'              => $b->id,
                    'nombre'          => $b->nombre,
                    'apellido_paterno' => $b->apellido_paterno,
                    'estado_seleccion' => $b->estado_seleccion,
                ])->values(),
            ];
        }

        // ── Hitos próximos ───────────────────────────────────────────────────
        $hitosProximos = $proyecto->hitos()
            ->whereNull('fecha_cumplimiento')
            ->whereNotNull('fecha_planificada')
            ->orderBy('fecha_planificada')
            ->limit(5)
            ->get(['id', 'nombre', 'fecha_planificada', 'tipo', 'es_critico', 'estado'])
            ->map(fn($h) => [
                'id'                => $h->id,
                'nombre'            => $h->nombre,
                'fecha_planificada' => $h->fecha_planificada?->format('Y-m-d'),
                'tipo'              => $h->tipo,
                'es_critico'        => $h->es_critico,
                'estado'            => $h->estado,
                'vencido'           => $h->fecha_planificada && $hoy->greaterThan($h->fecha_planificada),
            ]);

        return [
            'avance' => [
                'global'              => $avanceGlobal,
                'dias_transcurridos'  => $diasTranscurridos,
                'dias_totales'        => $diasTotales,
                'porcentaje_plazo'    => $porcentajePlazo,
                'hay_retraso'         => $hayRetraso,
                'unidades_completadas' => $unidadesCompletadas,
                'total_unidades'      => $totalUnidades,
                'avance_por_unidad'   => $avancePorUnidad,
            ],
            'gantt'                => $gantt,
            'almacen'              => $almacenResumen,
            'beneficiarios_resumen' => $beneficiariosResumen,
            'hitos_proximos'       => $hitosProximos,
        ];
    }

    // ── Recálculo en cascada (invocado por ReporteTecnicoService) ─────────────

    public function recalcularAvanceVivienda(int $viviendaId): void
    {
        $vivienda = Vivienda::with('itemsChecklist')->findOrFail($viviendaId);
        $items    = $vivienda->itemsChecklist;

        if ($items->isEmpty()) return;

        $totalPond = (float) $items->sum('ponderacion');
        if ($totalPond > 0) {
            $avance = $items->sum(fn ($i) => (float) $i->porcentaje_avance * (float) $i->ponderacion) / $totalPond;
        } else {
            $avance = $items->avg('porcentaje_avance') ?? 0.0;
        }

        $vivienda->porcentaje_avance = round((float) $avance, 2);
        $vivienda->save();
    }

    public function recalcularAvanceFase(int $faseId): void
    {
        $fase  = FaseProyecto::with('itemsChecklist')->findOrFail($faseId);
        $items = $fase->itemsChecklist;

        if ($items->isEmpty()) return;

        $totalPond = (float) $items->sum('ponderacion');
        if ($totalPond > 0) {
            $avance = $items->sum(fn ($i) => (float) $i->porcentaje_avance * (float) $i->ponderacion) / $totalPond;
        } else {
            $avance = $items->avg('porcentaje_avance') ?? 0.0;
        }

        $avance = round((float) $avance, 2);
        $fase->avance_porcentaje = $avance;

        if ($avance >= 100 && $fase->estado !== 'completada') {
            $fase->estado = 'completada';
        } elseif ($avance > 0 && $fase->estado === 'pendiente') {
            $fase->estado = 'en_progreso';
        }

        $fase->save();
    }

    public function recalcularAvanceProyecto(int $proyectoId): void
    {
        $proyecto = Proyecto::findOrFail($proyectoId);

        if ($proyecto->categoria === 'social') {
            $avance = (float) (Vivienda::where('proyecto_id', $proyectoId)->avg('porcentaje_avance') ?? 0.0);
        } else {
            $avance = (float) (FaseProyecto::where('proyecto_id', $proyectoId)->avg('avance_porcentaje') ?? 0.0);
        }

        $proyecto->avance_fisico = round($avance, 2);
        $proyecto->save();
    }

    /** Indicador de salud: al_dia | retraso_menor | retraso_critico */
    public function calcularSalud(float $avanceReal, float $porcentajePlazo): string
    {
        $diff = $porcentajePlazo - $avanceReal;
        if ($diff <= 10) return 'al_dia';
        if ($diff <= 25) return 'retraso_menor';
        return 'retraso_critico';
    }

    // ── Privados ─────────────────────────────────────────────────────────────

    private function avancePorViviendas($viviendas): array
    {
        return $viviendas->map(function ($v) {
            $items       = $v->itemsChecklist;
            $completados = $items->where('estado', 'completado')->count();
            return [
                'id'                    => $v->id,
                'codigo'                => $v->codigo,
                'nombre'                => $v->codigo,
                'estado'                => $v->estado,
                'porcentaje_avance'     => (float) $v->porcentaje_avance,
                'tipo_vivienda'         => $v->tipoVivienda?->nombre,
                'beneficiario'          => $v->beneficiario
                    ? $v->beneficiario->nombre . ' ' . $v->beneficiario->apellido_paterno
                    : null,
                'tiene_observaciones'   => (bool) $v->tiene_observaciones_activas,
                'checklist_total'       => $items->count(),
                'checklist_completados' => $completados,
                'items_checklist'       => $items->map(fn($i) => [
                    'id'               => $i->id,
                    'nombre'           => $i->nombre,
                    'orden'            => $i->orden,
                    'estado'           => $i->estado,
                    'ponderacion'      => (float) $i->ponderacion,
                    'porcentaje_avance' => (float) $i->porcentaje_avance,
                    'fecha_completado' => $i->fecha_completado?->format('Y-m-d'),
                ])->values(),
            ];
        })->values()->toArray();
    }

    private function avancePorFases($fases): array
    {
        return $fases->map(function ($f) {
            $items       = $f->itemsChecklist;
            $completados = $items->where('estado', 'completado')->count();
            return [
                'id'                       => $f->id,
                'nombre'                   => $f->nombre,
                'codigo'                   => 'F-' . str_pad($f->orden, 2, '0', STR_PAD_LEFT),
                'estado'                   => $f->estado,
                'orden'                    => $f->orden,
                'porcentaje_avance'        => (float) $f->avance_porcentaje,
                'fecha_inicio_planificada' => $f->fecha_inicio_planificada?->format('Y-m-d'),
                'fecha_fin_planificada'    => $f->fecha_fin_planificada?->format('Y-m-d'),
                'fecha_inicio_real'        => $f->fecha_inicio_real?->format('Y-m-d'),
                'fecha_fin_real'           => $f->fecha_fin_real?->format('Y-m-d'),
                'checklist_total'          => $items->count(),
                'checklist_completados'    => $completados,
                'transiciones_permitidas'  => $f->getTransicionesPermitidas(),
                'items_checklist'          => $items->map(fn($i) => [
                    'id'               => $i->id,
                    'nombre'           => $i->nombre,
                    'orden'            => $i->orden,
                    'estado'           => $i->estado,
                    'ponderacion'      => (float) $i->ponderacion,
                    'porcentaje_avance' => (float) $i->porcentaje_avance,
                    'fecha_completado' => $i->fecha_completado?->format('Y-m-d'),
                ])->values(),
            ];
        })->values()->toArray();
    }

    private function construirGantt(Proyecto $proyecto, bool $esSocial, $inicio, $fin, Carbon $hoy): array
    {
        $fechaInicio = $inicio?->format('Y-m-d');
        $fechaFin    = $fin?->format('Y-m-d');
        $diasTotales = ($inicio && $fin) ? (int) $inicio->diffInDays($fin) : null;

        $posHoy = null;
        if ($diasTotales > 0 && $inicio) {
            $posHoy = round(min(100.0, max(0.0, ($inicio->diffInDays($hoy) / $diasTotales) * 100)), 2);
        }

        if ($esSocial) {
            $items = $this->ganttSocial($proyecto, $inicio, $fin, $diasTotales);
        } else {
            $items = $this->ganttPrivado($proyecto, $inicio, $fin, $diasTotales);
        }

        return [
            'fecha_inicio_proyecto' => $fechaInicio,
            'fecha_fin_proyecto'    => $fechaFin,
            'dias_totales'          => $diasTotales,
            'hoy'                   => $hoy->format('Y-m-d'),
            'pos_hoy'               => $posHoy,
            'items'                 => $items,
        ];
    }

    private function ganttPrivado(Proyecto $proyecto, $inicio, $fin, ?int $diasTotales): array
    {
        $fases = $proyecto->fasesProyecto()->orderBy('orden')->get();
        $hoy   = Carbon::today();

        return $fases->map(function ($f, $idx) use ($inicio, $fin, $diasTotales, $fases, $hoy) {
            // Si la fase tiene fechas propias, usarlas; si no, distribuir proporcionalmente
            $fInicio = $f->fecha_inicio_planificada;
            $fFin    = $f->fecha_fin_planificada;

            if (!$fInicio || !$fFin || !$inicio || !$diasTotales) {
                // Distribución proporcional uniforme
                $n     = $fases->count();
                $left  = $n > 0 ? ($idx / $n) * 100 : 0;
                $width = $n > 0 ? (1 / $n) * 100 : 100;
            } else {
                $left  = round(max(0.0, min(100.0, ($inicio->diffInDays($fInicio) / $diasTotales) * 100)), 2);
                $durFase = max(1, (int) $fInicio->diffInDays($fFin));
                $width  = round(max(1.0, min(100.0 - $left, ($durFase / $diasTotales) * 100)), 2);
            }

            $vencida = $fFin && $hoy->greaterThan($fFin) && $f->estado !== 'completada';

            return [
                'id'                       => $f->id,
                'tipo'                     => 'fase',
                'nombre'                   => $f->nombre,
                'estado'                   => $f->estado,
                'porcentaje_avance'        => (float) $f->avance_porcentaje,
                'fecha_inicio_planificada' => $fInicio?->format('Y-m-d'),
                'fecha_fin_planificada'    => $fFin?->format('Y-m-d'),
                'fecha_inicio_real'        => $f->fecha_inicio_real?->format('Y-m-d'),
                'fecha_fin_real'           => $f->fecha_fin_real?->format('Y-m-d'),
                'left'                     => $left,
                'width'                    => $width,
                'vencida'                  => $vencida,
                'editable'                 => true,
                'transiciones_permitidas'  => $f->getTransicionesPermitidas(),
            ];
        })->values()->toArray();
    }

    private function ganttSocial(Proyecto $proyecto, $inicio, $fin, ?int $diasTotales): array
    {
        $productos = $proyecto->productosContractuales()->get();
        $hoy       = Carbon::today();

        $acumLeft = 0.0;

        return $productos->map(function ($p) use (&$acumLeft, $inicio, $diasTotales, $hoy) {
            $porcentaje = (float) $p->porcentaje;
            $width      = max(1.0, $porcentaje);
            $left       = $acumLeft;
            $acumLeft  += $width;

            $fechaCobro   = $p->fecha_planificada_cobro;
            $posMarker    = null;
            if ($fechaCobro && $inicio && $diasTotales > 0) {
                $posMarker = round(max(0.0, min(100.0, ($inicio->diffInDays($fechaCobro) / $diasTotales) * 100)), 2);
            }

            $vencida = $fechaCobro && $hoy->greaterThan($fechaCobro) && $p->estado !== 'cobrado';

            return [
                'id'                      => $p->id,
                'tipo'                    => 'producto',
                'nombre'                  => $p->nombre,
                'estado'                  => $p->estado,
                'porcentaje'              => $porcentaje,
                'monto_calculado'         => (float) $p->monto_calculado,
                'fecha_planificada_cobro' => $fechaCobro?->format('Y-m-d'),
                'fecha_cobro_real'        => $p->fecha_cobro_real?->format('Y-m-d'),
                'left'                    => round($left, 2),
                'width'                   => round($width, 2),
                'pos_marker'              => $posMarker,
                'vencida'                 => $vencida,
                'editable'                => false,
            ];
        })->values()->toArray();
    }
}
