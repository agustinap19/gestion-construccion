<?php

namespace App\Services\Beneficiarios;

use App\Models\Beneficiario;
use App\Models\DetalleMovimientoAlmacen;
use App\Models\HistorialSyncTipologia;
use App\Models\MovimientoAlmacen;
use App\Models\OverrideItemProyecto;
use App\Models\PresupuestoItemProyecto;
use App\Models\TipoVivienda;
use App\Services\Almacenes\IntegracionBeneficiarioService;
use App\Services\Almacenes\PresupuestoAutomaticoService;
use App\Services\Proyectos\CalculadoraAvanceService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use App\Notifications\SyncTipologiaNotification;

class SincronizarTipologiaService
{
    public function __construct(
        private PresupuestoAutomaticoService $presupuestoSvc,
        private IntegracionBeneficiarioService $integracionSvc,
        private CalculadoraAvanceService $calculadora,
    ) {}

    // ─── Preview (sin aplicar cambios) ────────────────────────────────────────

    public function generarPreview(Beneficiario $beneficiario, int $nuevoTipoId): array
    {
        $viviendaId = $beneficiario->vivienda?->id;

        $pipsActuales = PresupuestoItemProyecto::with('itemConstructivo')
            ->where('proyecto_id', $beneficiario->proyecto_id)
            ->when($viviendaId, fn($q) => $q->where('vivienda_id', $viviendaId))
            ->get()
            ->keyBy('item_constructivo_id');

        $nuevoTipo = TipoVivienda::with([
            'plantillaConstructiva.items.itemConstructivo',
        ])->findOrFail($nuevoTipoId);

        if (!$nuevoTipo->plantilla_constructiva_id) {
            throw new \RuntimeException('El nuevo tipo de vivienda no tiene plantilla constructiva asignada.');
        }

        $itemsNuevoTipo = collect($nuevoTipo->plantillaConstructiva->items ?? [])
            ->keyBy('item_constructivo_id');

        $agregar   = [];
        $actualizar = [];
        $conflictos = [];
        $eliminar   = [];
        $sinCambio  = 0;

        // Items del nuevo tipo
        foreach ($itemsNuevoTipo as $itemConstrId => $itemPlantilla) {
            $pipActual = $pipsActuales[$itemConstrId] ?? null;
            $nombre    = $itemPlantilla->itemConstructivo?->nombre ?? '—';
            $codigo    = $itemPlantilla->itemConstructivo?->codigo ?? '—';
            $cantNueva = (float) ($itemPlantilla->cantidad_sugerida ?? 1);

            if (!$pipActual) {
                $agregar[] = [
                    'item_constructivo_id' => $itemConstrId,
                    'nombre'               => $nombre,
                    'codigo'               => $codigo,
                    'cantidad_nueva'       => $cantNueva,
                    'orden'                => $itemPlantilla->orden ?? 0,
                    'ponderacion_avance'   => $itemPlantilla->ponderacion_avance ?? 0,
                ];
            } else {
                $cantActual    = (float) $pipActual->cantidad_planificada;
                $tieneEntregas = $this->tieneEntregas($pipActual);

                if (abs($cantActual - $cantNueva) < 0.001) {
                    $sinCambio++;
                } else {
                    // Si tiene entregas y la cantidad nueva es menor → conflicto (no se reduce)
                    $cantidadFinal = $tieneEntregas ? max($cantNueva, $cantActual) : $cantNueva;
                    $esConflicto   = $tieneEntregas && $cantNueva < $cantActual - 0.001;

                    $entrada = [
                        'pip_id'           => $pipActual->id,
                        'nombre'           => $nombre,
                        'codigo'           => $codigo,
                        'cantidad_actual'  => $cantActual,
                        'cantidad_nueva'   => $cantNueva,
                        'cantidad_final'   => $cantidadFinal,
                        'tiene_entregas'   => $tieneEntregas,
                    ];

                    if ($esConflicto) {
                        $entrada['nota'] = "Cantidad no reducida — tiene entregas registradas";
                        $conflictos[] = $entrada;
                    } else {
                        $actualizar[] = $entrada;
                    }
                }
            }
        }

        // Items del tipo actual que NO están en el nuevo tipo
        foreach ($pipsActuales as $itemConstrId => $pip) {
            if (!$itemsNuevoTipo->has($itemConstrId)) {
                $tieneEntregas = $this->tieneEntregas($pip);
                $eliminar[] = [
                    'pip_id'          => $pip->id,
                    'nombre'          => $pip->itemConstructivo?->nombre ?? '—',
                    'codigo'          => $pip->itemConstructivo?->codigo ?? '—',
                    'cantidad_actual' => (float) $pip->cantidad_planificada,
                    'tiene_entregas'  => $tieneEntregas,
                    'puede_eliminar'  => !$tieneEntregas,
                ];
            }
        }

        return [
            'tipo_anterior_nombre' => $beneficiario->tipoVivienda?->nombre,
            'tipo_nuevo_nombre'    => $nuevoTipo->nombre,
            'agregar'              => $agregar,
            'actualizar'           => $actualizar,
            'conflictos'           => $conflictos,
            'eliminar'             => $eliminar,
            'sin_cambio'           => $sinCambio,
            'tiene_vivienda'       => (bool) $viviendaId,
        ];
    }

    // ─── Aplicar (con transacción + historial) ────────────────────────────────

    public function aplicar(Beneficiario $beneficiario, int $nuevoTipoId, int $actorId, string $modo = 'manual'): array
    {
        return DB::transaction(function () use ($beneficiario, $nuevoTipoId, $actorId, $modo) {

            // Capturar antes de actualizar para el historial
            $tipoAnteriorId = $beneficiario->tipo_vivienda_id;

            // Actualizar tipo dentro de la transacción — si algo falla, hace rollback completo
            $beneficiario->tipo_vivienda_id = $nuevoTipoId;
            $beneficiario->save();

            $preview    = $this->generarPreview($beneficiario, $nuevoTipoId);
            $viviendaId = $beneficiario->vivienda?->id;

            $nuevoTipo = TipoVivienda::with([
                'plantillaConstructiva.items.itemConstructivo',
            ])->findOrFail($nuevoTipoId);

            $itemsNuevoTipo = collect($nuevoTipo->plantillaConstructiva->items ?? [])
                ->keyBy('item_constructivo_id');

            // 1. Agregar ítems nuevos
            foreach ($preview['agregar'] as $item) {
                $pip = PresupuestoItemProyecto::create([
                    'proyecto_id'          => $beneficiario->proyecto_id,
                    'vivienda_id'          => $viviendaId,
                    'item_constructivo_id' => $item['item_constructivo_id'],
                    'cantidad_planificada' => $item['cantidad_nueva'],
                    'orden'                => $item['orden'] ?? 0,
                    'ponderacion_avance'   => $item['ponderacion_avance'] ?? 0,
                    'estado_ejecucion'     => 'pendiente',
                    'porcentaje_avance'    => 0,
                ]);
                // El modelo PIP auto-snapshot recetas vía booted()
            }

            // 2. Actualizar cantidades (sin conflictos — los conflictos ya tienen cantidad_final = actual)
            $todosParaActualizar = array_merge($preview['actualizar'], $preview['conflictos']);
            foreach ($todosParaActualizar as $item) {
                PresupuestoItemProyecto::where('id', $item['pip_id'])
                    ->update(['cantidad_planificada' => $item['cantidad_final']]);
            }

            // 3. Eliminar ítems que ya no pertenecen al nuevo tipo y no tienen entregas
            foreach ($preview['eliminar'] as $item) {
                if ($item['puede_eliminar']) {
                    PresupuestoItemProyecto::where('id', $item['pip_id'])->delete();
                }
            }

            // 4. Recalcular ponderaciones por costo real (reemplaza los valores heredados de la plantilla)
            if ($viviendaId) {
                $this->calculadora->recalcularPonderacionesPorCosto($viviendaId);
            }

            // 5. Recalcular consolidado de materiales
            try {
                $this->presupuestoSvc->recalcularConsolidado($beneficiario->proyecto_id, $actorId);
            } catch (\Throwable) {
                // No bloquear el sync si falla el consolidado
            }

            // 6. Guardar historial
            $estado  = count($preview['conflictos']) > 0 ? 'parcial' : 'completado';
            $historial = HistorialSyncTipologia::create([
                'beneficiario_id'  => $beneficiario->id,
                'proyecto_id'      => $beneficiario->proyecto_id,
                'vivienda_id'      => $viviendaId,
                'tipo_anterior_id' => $tipoAnteriorId,
                'tipo_nuevo_id'    => $nuevoTipoId,
                'actor_id'         => $actorId,
                'modo'             => $modo,
                'estado'           => $estado,
                'resumen'          => [
                    'agregados'   => $preview['agregar'],
                    'actualizados'=> $preview['actualizar'],
                    'conflictos'  => $preview['conflictos'],
                    'eliminados'  => array_values(array_filter($preview['eliminar'], fn($e) => $e['puede_eliminar'])),
                    'retenidos'   => array_values(array_filter($preview['eliminar'], fn($e) => !$e['puede_eliminar'])),
                    'sin_cambio'  => $preview['sin_cambio'],
                ],
            ]);

            // 6. Notificación al gerente/admin
            $this->enviarNotificacion($beneficiario, $preview, $historial->id);

            return [
                'historial_id' => $historial->id,
                'estado'       => $estado,
                'preview'      => $preview,
                'modo'         => $modo,
            ];
        });
    }

    // ─── Historial ────────────────────────────────────────────────────────────

    public function obtenerHistorial(Beneficiario $beneficiario): \Illuminate\Support\Collection
    {
        return HistorialSyncTipologia::with(['tipoAnterior', 'tipoNuevo', 'actor:id,name'])
            ->where('beneficiario_id', $beneficiario->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($h) => [
                'id'                   => $h->id,
                'fecha'                => $h->created_at->toISOString(),
                'modo'                 => $h->modo,
                'estado'               => $h->estado,
                'tipo_anterior_nombre' => $h->tipoAnterior?->nombre ?? '(sin tipo)',
                'tipo_nuevo_nombre'    => $h->tipoNuevo?->nombre ?? '—',
                'actor_nombre'         => $h->actor?->name ?? '—',
                'resumen'              => $h->resumen,
            ]);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function tieneEntregas(PresupuestoItemProyecto $pip): bool
    {
        return MovimientoAlmacen::where('presupuesto_item_proyecto_id', $pip->id)
            ->whereNotIn('estado', ['anulado', 'borrador'])
            ->exists();
    }

    private function enviarNotificacion(Beneficiario $beneficiario, array $preview, int $historialId): void
    {
        try {
            $admins = \App\Models\User::role(['admin', 'gerente'])->get();
            if ($admins->isNotEmpty()) {
                Notification::send($admins, new SyncTipologiaNotification($beneficiario, $preview, $historialId));
            }
        } catch (\Throwable) {
            // No bloquear si falla la notificación
        }
    }
}
