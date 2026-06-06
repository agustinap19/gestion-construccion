<?php

namespace App\Services\Almacenes;

use App\Models\Beneficiario;
use App\Models\PresupuestoItemProyecto;
use App\Models\TipoVivienda;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class IntegracionBeneficiarioService
{
    public function __construct(private PresupuestoAutomaticoService $presupuestoSvc) {}

    /**
     * Genera PresupuestoItemProyecto para un beneficiario recién registrado
     * y recalcula el consolidado de materiales del proyecto.
     */
    public function generarItemsParaBeneficiario(Beneficiario $beneficiario, int $actorId = 0): array
    {
        if (!$beneficiario->tipo_vivienda_id || !$beneficiario->proyecto_id) {
            return ['generado' => false, 'razon' => 'sin_tipo_vivienda_o_proyecto'];
        }

        $tipoVivienda = TipoVivienda::with([
            'plantillaConstructiva.items.itemConstructivo',
        ])->find($beneficiario->tipo_vivienda_id);

        if (!$tipoVivienda?->plantilla_constructiva_id) {
            return ['generado' => false, 'razon' => 'tipo_vivienda_sin_plantilla'];
        }

        $vivienda   = $beneficiario->vivienda;
        $viviendaId = $vivienda?->id;

        $yaExisten = PresupuestoItemProyecto::where('proyecto_id', $beneficiario->proyecto_id)
            ->when($viviendaId, fn($q) => $q->where('vivienda_id', $viviendaId))
            ->exists();

        if ($yaExisten) {
            return ['generado' => false, 'razon' => 'ya_existe'];
        }

        $plantilla = $tipoVivienda->plantillaConstructiva;
        $items     = $plantilla->items ?? collect();

        if ($items->isEmpty()) {
            return ['generado' => false, 'razon' => 'plantilla_sin_items'];
        }

        $creados = [];
        foreach ($items as $itemPlantilla) {
            $creados[] = PresupuestoItemProyecto::create([
                'proyecto_id'          => $beneficiario->proyecto_id,
                'vivienda_id'          => $viviendaId,
                'item_constructivo_id' => $itemPlantilla->item_constructivo_id,
                'cantidad_planificada' => $itemPlantilla->cantidad_sugerida ?? 1,
                'orden'                => $itemPlantilla->orden ?? 0,
                'ponderacion_avance'   => $itemPlantilla->ponderacion_avance ?? 0,
                'estado_ejecucion'     => 'pendiente',
                'porcentaje_avance'    => 0,
            ]);
        }

        // Recalcular consolidado de materiales; no bloquea si falla
        try {
            $this->presupuestoSvc->recalcularConsolidado($beneficiario->proyecto_id, $actorId ?: 1);
        } catch (\Throwable $e) {
            Log::warning("IntegracionBeneficiario: consolidado falló para proyecto {$beneficiario->proyecto_id} — {$e->getMessage()}");
        }

        return [
            'generado'         => true,
            'plantilla_id'     => $plantilla->id,
            'plantilla_nombre' => $plantilla->nombre,
            'items_generados'  => count($creados),
            'vivienda_id'      => $viviendaId,
        ];
    }

    /**
     * Elimina los ítems existentes de la vivienda y los regenera con la nueva tipología.
     * Útil cuando se cambia el tipo_vivienda_id de un beneficiario.
     */
    public function regenerarItemsPorCambioTipologia(Beneficiario $beneficiario, int $actorId): array
    {
        $viviendaId = $beneficiario->vivienda?->id;

        if ($viviendaId) {
            PresupuestoItemProyecto::where('proyecto_id', $beneficiario->proyecto_id)
                ->where('vivienda_id', $viviendaId)
                ->delete();
        }

        return $this->generarItemsParaBeneficiario($beneficiario, $actorId);
    }

    /**
     * Resumen del avance de entregas para un beneficiario (via su vivienda).
     */
    public function getAvanceBeneficiario(int $beneficiarioId, int $proyectoId): array
    {
        $beneficiario = Beneficiario::with('vivienda')->find($beneficiarioId);
        $viviendaId   = $beneficiario?->vivienda?->id;

        $query = PresupuestoItemProyecto::with([
            'itemConstructivo',
            'itemConstructivo.categoria',
        ])->where('proyecto_id', $proyectoId);

        if ($viviendaId) {
            $query->where('vivienda_id', $viviendaId);
        } else {
            $query->whereNull('vivienda_id');
        }

        $items = $query->get();

        $totalItems  = $items->count();
        $completados = $items->where('estado_ejecucion', 'terminado')->count();
        $enProceso   = $items->where('estado_ejecucion', 'en_proceso')->count();
        $pendientes  = $items->where('estado_ejecucion', 'pendiente')->count();

        return [
            'total_items'       => $totalItems,
            'completados'       => $completados,
            'en_proceso'        => $enProceso,
            'pendientes'        => $pendientes,
            'porcentaje_global' => $totalItems > 0
                ? round($items->avg('porcentaje_avance'), 2)
                : 0,
            'items' => $items->map(fn($i) => [
                'id'                   => $i->id,
                'codigo_item'          => $i->itemConstructivo?->codigo,
                'nombre_item'          => $i->itemConstructivo?->nombre,
                'unidad'               => $i->itemConstructivo?->unidad_base,
                'categoria'            => $i->itemConstructivo?->categoria?->nombre,
                'categoria_color'      => $i->itemConstructivo?->categoria?->color,
                'cantidad_planificada' => $i->cantidad_planificada,
                'ponderacion_avance'   => $i->ponderacion_avance,
                'porcentaje_avance'    => $i->porcentaje_avance,
                'estado_ejecucion'     => $i->estado_ejecucion,
            ])->values(),
        ];
    }
}
