<?php

namespace App\Services\Proyectos;

use App\Models\AvanceChecklistReporte;
use App\Models\FotoReporte;
use App\Models\IncidenciaReporte;
use App\Models\ItemChecklist;
use App\Models\Proyecto;
use App\Models\ReporteTecnico;
use App\Models\Vivienda;
use App\Services\NotificacionService;
use Illuminate\Support\Facades\DB;

class ReporteTecnicoService
{
    private const DISTANCIA_ALERTA_METROS = 100;

    public function __construct(
        private CalculadoraAvanceService $calculadora,
        private NotificacionService $notificacion,
    ) {}

    /* ── Listar ──────────────────────────────────────────────────────────── */

    public function listarPorUnidad(string $tipo, int $unidadId, int $perPage = 20): \Illuminate\Pagination\LengthAwarePaginator
    {
        return ReporteTecnico::with(['usuario:id,nombre,apellido_paterno', 'fotos', 'incidencias', 'avancesChecklist.itemChecklist'])
            ->when($tipo === 'vivienda', fn ($q) => $q->where('vivienda_id', $unidadId))
            ->when($tipo === 'fase',     fn ($q) => $q->where('fase_id',     $unidadId))
            ->orderByDesc('fecha_reporte')
            ->paginate($perPage);
    }

    public function listarFotosPorProyecto(int $proyectoId, array $filtros = []): \Illuminate\Support\Collection
    {
        $query = FotoReporte::with(['reporte' => fn ($q) =>
            $q->select('id', 'proyecto_id', 'vivienda_id', 'fase_id', 'usuario_id', 'fecha_reporte')
              ->with('usuario:id,nombre,apellido_paterno')
        ])
        ->whereHas('reporte', fn ($q) => $q->where('proyecto_id', $proyectoId));

        if (!empty($filtros['vivienda_id'])) {
            $query->whereHas('reporte', fn ($q) => $q->where('vivienda_id', $filtros['vivienda_id']));
        }
        if (!empty($filtros['fase_id'])) {
            $query->whereHas('reporte', fn ($q) => $q->where('fase_id', $filtros['fase_id']));
        }
        if (!empty($filtros['desde'])) {
            $query->whereHas('reporte', fn ($q) => $q->where('fecha_reporte', '>=', $filtros['desde']));
        }
        if (!empty($filtros['hasta'])) {
            $query->whereHas('reporte', fn ($q) => $q->where('fecha_reporte', '<=', $filtros['hasta'] . ' 23:59:59'));
        }

        return $query->orderByDesc('id')->get();
    }

    public function obtenerCompleto(int $id): ReporteTecnico
    {
        return ReporteTecnico::with([
            'usuario:id,nombre,apellido_paterno',
            'fotos',
            'incidencias',
            'avancesChecklist.itemChecklist',
            'vivienda:id,codigo,estado,porcentaje_avance',
            'fase:id,nombre,avance_porcentaje',
        ])->findOrFail($id);
    }

    /* ── Crear ───────────────────────────────────────────────────────────── */

    public function crear(array $datos, int $actorId): ReporteTecnico
    {
        return DB::transaction(function () use ($datos, $actorId) {

            // Calcular distancia a la vivienda si tiene coordenadas
            $alertaDistancia = false;
            $distanciaMetros = null;
            if (!empty($datos['vivienda_id']) && isset($datos['latitud_tecnico'], $datos['longitud_tecnico'])) {
                $vivienda = Vivienda::find($datos['vivienda_id']);
                if ($vivienda && $vivienda->latitud && $vivienda->longitud) {
                    $distanciaMetros = $this->haversineMetros(
                        (float) $datos['latitud_tecnico'],
                        (float) $datos['longitud_tecnico'],
                        (float) $vivienda->latitud,
                        (float) $vivienda->longitud
                    );
                    $alertaDistancia = $distanciaMetros > self::DISTANCIA_ALERTA_METROS;
                }
            }

            $reporte = ReporteTecnico::create([
                'proyecto_id'               => $datos['proyecto_id'],
                'vivienda_id'               => $datos['vivienda_id'] ?? null,
                'fase_id'                   => $datos['fase_id'] ?? null,
                'usuario_id'                => $actorId,
                'fecha_reporte'             => $datos['fecha_reporte'] ?? now(),
                'descripcion'               => $datos['descripcion'] ?? null,
                'observaciones'             => $datos['observaciones'] ?? null,
                'latitud_tecnico'           => $datos['latitud_tecnico'] ?? null,
                'longitud_tecnico'          => $datos['longitud_tecnico'] ?? null,
                'distancia_vivienda_metros' => $distanciaMetros,
                'alerta_distancia'          => $alertaDistancia,
                'estado'                    => 'enviado',
            ]);

            // Actualizar avances de items del checklist
            if (!empty($datos['avances_items'])) {
                foreach ($datos['avances_items'] as $itemId => $pct) {
                    $item = ItemChecklist::find((int) $itemId);
                    if (!$item) continue;

                    $anterior = (float) ($item->porcentaje_avance ?? 0);
                    $nuevo    = max(0.0, min(100.0, (float) $pct));

                    AvanceChecklistReporte::create([
                        'reporte_id'        => $reporte->id,
                        'item_checklist_id' => $item->id,
                        'porcentaje_anterior' => $anterior,
                        'porcentaje_nuevo'    => $nuevo,
                    ]);

                    $item->porcentaje_avance = $nuevo;
                    $item->estado = $nuevo >= 100 ? 'completado' : ($nuevo > 0 ? 'en_proceso' : 'pendiente');
                    if ($nuevo >= 100 && !$item->fecha_completado) {
                        $item->fecha_completado = now()->toDateString();
                    }
                    $item->save();
                }
            }

            // Fotos
            if (!empty($datos['fotos'])) {
                foreach ($datos['fotos'] as $idx => $foto) {
                    FotoReporte::create([
                        'reporte_id'    => $reporte->id,
                        'url_original'  => $foto['url_original'],
                        'url_thumbnail' => $foto['url_thumbnail'] ?? null,
                        'caption'       => $foto['caption'] ?? null,
                        'orden'         => $idx,
                        'latitud'       => $foto['latitud'] ?? null,
                        'longitud'      => $foto['longitud'] ?? null,
                    ]);
                }
            }

            // Incidencias
            if (!empty($datos['incidencias'])) {
                foreach ($datos['incidencias'] as $inc) {
                    if (empty($inc['descripcion'])) continue;
                    IncidenciaReporte::create([
                        'reporte_id'  => $reporte->id,
                        'tipo'        => $inc['tipo']     ?? 'otro',
                        'gravedad'    => $inc['gravedad'] ?? 'baja',
                        'descripcion' => $inc['descripcion'],
                    ]);
                }
            }

            // Recálculo en cascada
            if ($reporte->vivienda_id) {
                $this->calculadora->recalcularAvanceVivienda($reporte->vivienda_id);
            } elseif ($reporte->fase_id) {
                $this->calculadora->recalcularAvanceFase($reporte->fase_id);
            }
            $this->calculadora->recalcularAvanceProyecto($reporte->proyecto_id);

            // Notificar al responsable del proyecto
            $proyecto = Proyecto::find($reporte->proyecto_id);
            if ($proyecto?->responsable_id) {
                $unidadLabel = $reporte->vivienda?->codigo ?? $reporte->fase?->nombre ?? 'unidad';
                $this->notificacion->enviarA($proyecto->responsable_id, [
                    'tipo'       => 'info',
                    'titulo'     => 'Nuevo reporte técnico',
                    'mensaje'    => "Se registró un reporte en {$unidadLabel} del proyecto {$proyecto->codigo}.",
                    'url_accion' => "/dashboard/proyectos/{$proyecto->id}",
                ]);
            }

            return $reporte->load('fotos', 'incidencias', 'usuario:id,nombre,apellido_paterno');
        });
    }

    /* ── Exportar PDF ────────────────────────────────────────────────────── */

    public function datosParaExportarAvance(int $viviendaId): array
    {
        $vivienda   = Vivienda::with(['itemsChecklist', 'beneficiario', 'tipoVivienda', 'proyecto'])->findOrFail($viviendaId);
        $reportes   = ReporteTecnico::with(['usuario:id,nombre,apellido_paterno', 'fotos', 'incidencias'])
            ->where('vivienda_id', $viviendaId)
            ->orderByDesc('fecha_reporte')
            ->limit(5)
            ->get();

        return compact('vivienda', 'reportes');
    }

    public function datosParaExportarFotos(int $viviendaId): array
    {
        $vivienda = Vivienda::with(['proyecto', 'beneficiario'])->findOrFail($viviendaId);
        $fotos    = FotoReporte::with(['reporte' => fn ($q) => $q->with('usuario:id,nombre,apellido_paterno')])
            ->whereHas('reporte', fn ($q) => $q->where('vivienda_id', $viviendaId))
            ->orderByDesc('id')
            ->get();

        return compact('vivienda', 'fotos');
    }

    /* ── Helper Haversine ────────────────────────────────────────────────── */

    private function haversineMetros(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R     = 6371000; // radio terrestre en metros
        $dLat  = deg2rad($lat2 - $lat1);
        $dLon  = deg2rad($lon2 - $lon1);
        $a     = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
