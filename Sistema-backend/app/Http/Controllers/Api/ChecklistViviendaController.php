<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HistorialCambioItem;
use App\Models\PresupuestoItemProyecto;
use App\Models\Vivienda;
use App\Services\Proyectos\CalculadoraAvanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChecklistViviendaController extends Controller
{
    public function __construct(
        protected CalculadoraAvanceService $calculadora
    ) {}

    // GET /api/viviendas/{id}/checklist
    public function show(Request $request, int $viviendaId): JsonResponse
    {
        $vivienda = Vivienda::with([
            'beneficiario:id,nombre,apellido_paterno',
        ])->findOrFail($viviendaId);

        $pips = PresupuestoItemProyecto::where('vivienda_id', $viviendaId)
            ->with([
                'itemConstructivo:id,codigo,nombre,unidad_base,categoria_constructiva_id',
                'itemConstructivo.categoria:id,nombre',
                'productoContractual:id,nombre',
            ])
            ->orderBy('orden')
            ->get();

        $puedeMarcar = $this->puedeMarcarAvance($request->user());

        $materialDelivery = $pips->isNotEmpty()
            ? $this->calcularEntregaMateriales($pips)
            : [];

        $avanceTotal = $this->calcularAvancePonderado($pips);

        $items = $pips->map(fn($pip) => [
            'id'                            => $pip->id,
            'orden'                         => $pip->orden,
            'codigo'                        => $pip->itemConstructivo?->codigo,
            'nombre'                        => $pip->itemConstructivo?->nombre ?? '—',
            'categoria'                     => $pip->itemConstructivo?->categoria?->nombre,
            'unidad_base'                   => $pip->itemConstructivo?->unidad_base,
            'cantidad_planificada'          => (float) $pip->cantidad_planificada,
            'ponderacion_avance'            => (float) $pip->ponderacion_avance,
            'porcentaje_avance'             => (float) $pip->porcentaje_avance,
            'estado_ejecucion'              => $pip->estado_ejecucion,
            'producto_contractual'          => $pip->productoContractual?->nombre,
            'material_entregado_porcentaje' => $materialDelivery[$pip->id] ?? null,
            'puede_marcar_avance'           => $puedeMarcar,
        ]);

        $porProducto = $pips
            ->groupBy(fn($p) => $p->productoContractual?->nombre ?? 'Sin producto')
            ->map(fn($group, $producto) => [
                'producto'    => $producto,
                'avance'      => round($group->avg('porcentaje_avance') ?? 0, 2),
                'items_count' => $group->count(),
            ])
            ->values();

        return response()->json([
            'vivienda' => [
                'id'           => $vivienda->id,
                'codigo'       => $vivienda->codigo,
                'beneficiario' => $vivienda->beneficiario
                    ? ['nombre_completo' => trim($vivienda->beneficiario->nombre . ' ' . $vivienda->beneficiario->apellido_paterno)]
                    : null,
                'avance_total' => round($avanceTotal, 2),
                'estado'       => $vivienda->estado,
            ],
            'items'             => $items,
            'avance_por_producto' => $porProducto,
        ]);
    }

    // PATCH /api/viviendas/{viviendaId}/checklist/{itemId}/avance
    public function marcarAvance(Request $request, int $viviendaId, int $itemId): JsonResponse
    {
        if (!$this->puedeMarcarAvance($request->user())) {
            return response()->json(['message' => 'No tiene permiso para marcar avance de obra.'], 403);
        }

        $request->validate([
            'porcentaje_avance' => 'required|numeric|min:0|max:100',
            'observacion'       => 'nullable|string|max:500',
        ]);

        $pip = PresupuestoItemProyecto::where('vivienda_id', $viviendaId)
            ->findOrFail($itemId);

        $pctAnterior   = (float) $pip->porcentaje_avance;
        $estadoAnterior = $pip->estado_ejecucion;
        $pctNuevo      = (float) $request->porcentaje_avance;

        $estadoNuevo = match(true) {
            $pctNuevo >= 100 => 'terminado',
            $pctNuevo > 0    => 'en_proceso',
            default          => 'pendiente',
        };

        // Advertencia de material si se marca al 100%
        $advertencia = null;
        if ($pctNuevo >= 100) {
            $materialPct = $this->calcularEntregaMateriales(collect([$pip]))[$pip->id] ?? null;
            if ($materialPct !== null && $materialPct < 80) {
                $advertencia = "El item se marca como terminado pero solo se entregó el {$materialPct}% del material teórico. Verifica.";
            }
        }

        DB::transaction(function () use ($pip, $pctNuevo, $estadoNuevo, $request, $pctAnterior, $estadoAnterior, $viviendaId) {
            $pip->porcentaje_avance = $pctNuevo;
            $pip->estado_ejecucion  = $estadoNuevo;
            $pip->alerta_sin_reporte = false; // Cleared when user registers progress
            $pip->save();

            HistorialCambioItem::create([
                'proyecto_id'     => $pip->proyecto_id,
                'usuario_id'      => $request->user()->id,
                'tipo_cambio'     => 'avance',
                'pip_id'          => $pip->id,
                'vivienda_id'     => $viviendaId,
                'valores_antes'   => ['porcentaje_avance' => $pctAnterior,  'estado_ejecucion' => $estadoAnterior],
                'valores_despues' => ['porcentaje_avance' => $pctNuevo,     'estado_ejecucion' => $estadoNuevo],
                'descripcion'     => $request->observacion,
            ]);

            $this->recalcularVivienda($viviendaId);
            $this->calculadora->recalcularAvanceProyecto($pip->proyecto_id);
        });

        $vivienda = Vivienda::find($viviendaId);

        $response = [
            'item_actualizado' => [
                'id'                => $pip->id,
                'porcentaje_avance' => (float) $pip->porcentaje_avance,
                'estado_ejecucion'  => $pip->estado_ejecucion,
            ],
            'avance_vivienda' => (float) $vivienda->porcentaje_avance,
            'reporte' => [
                'presupuesto_item_proyecto_id' => $pip->id,
            ],
        ];

        if ($advertencia) {
            $response['advertencia'] = $advertencia;
        }

        return response()->json($response);
    }

    // ── Privados ──────────────────────────────────────────────────────────────

    private function puedeMarcarAvance($user): bool
    {
        if (!$user) return false;
        if ($user->es_admin_central) return true;
        return in_array($user->rol?->nombre, ['tecnico', 'admin_proyecto', 'gerente', 'super_admin']);
    }

    private function calcularAvancePonderado($pips): float
    {
        if ($pips->isEmpty()) return 0.0;

        $totalPond = (float) $pips->sum('ponderacion_avance');
        if ($totalPond > 0) {
            return $pips->sum(fn($p) => (float) $p->porcentaje_avance * (float) $p->ponderacion_avance) / $totalPond;
        }
        return (float) ($pips->avg('porcentaje_avance') ?? 0.0);
    }

    private function recalcularVivienda(int $viviendaId): void
    {
        $pips    = PresupuestoItemProyecto::where('vivienda_id', $viviendaId)->get();
        $avance  = round($this->calcularAvancePonderado($pips), 2);
        $vivienda = Vivienda::findOrFail($viviendaId);

        $vivienda->porcentaje_avance = $avance;

        if ($vivienda->estado !== 'con_observaciones') {
            $vivienda->estado = match(true) {
                $avance >= 100 => 'entregada',
                $avance >= 90  => 'acabados',
                $avance >= 75  => 'obra_fina',
                $avance >= 50  => 'obra_gruesa',
                $avance >= 25  => 'cimentacion',
                $avance > 0    => 'terreno_preparado',
                default        => 'planificada',
            };
        }

        $vivienda->save();
    }

    /**
     * Calcula el porcentaje de material entregado para cada PIP.
     * Por cada material en la receta del item, compara lo esperado (receta × cantidad_planificada)
     * con lo entregado (movimientos salida_social vinculados al PIP).
     * Retorna [ pip_id => porcentaje (0–100 | null si sin receta) ]
     */
    private function calcularEntregaMateriales($pips): array
    {
        if ($pips->isEmpty()) return [];

        $pipIds    = $pips->pluck('id')->all();
        $proyectoId = $pips->first()->proyecto_id;
        $itemIds    = $pips->pluck('item_constructivo_id')->unique()->values()->all();

        // Materiales entregados agrupados por (pip_id, material_id)
        $entregados = DB::table('movimientos_almacen as m')
            ->join('detalle_movimientos_almacen as d', 'd.movimiento_almacen_id', '=', 'm.id')
            ->whereIn('m.presupuesto_item_proyecto_id', $pipIds)
            ->where('m.tipo', 'salida_social')
            ->whereNull('m.anulado_en')
            ->whereNull('m.deleted_at')
            ->select('m.presupuesto_item_proyecto_id as pip_id', 'd.material_id', DB::raw('SUM(d.cantidad) as entregado'))
            ->groupBy('m.presupuesto_item_proyecto_id', 'd.material_id')
            ->get()
            ->groupBy('pip_id');

        // Recetas (overrides de tipología) para los items de este proyecto
        $overrides = DB::table('overrides_items_proyecto')
            ->where('proyecto_id', $proyectoId)
            ->whereIn('item_constructivo_id', $itemIds)
            ->select('item_constructivo_id', 'material_id', 'cantidad_por_unidad_base')
            ->get()
            ->groupBy('item_constructivo_id');

        $result = [];
        foreach ($pips as $pip) {
            $receta = $overrides->get($pip->item_constructivo_id, collect());
            if ($receta->isEmpty()) {
                $result[$pip->id] = null;
                continue;
            }

            $pipEntregas = $entregados->get($pip->id, collect());
            $tasas = [];

            foreach ($receta as $mat) {
                $esperado = (float) $mat->cantidad_por_unidad_base * (float) $pip->cantidad_planificada;
                if ($esperado <= 0) continue;

                $real = (float) ($pipEntregas->firstWhere('material_id', $mat->material_id)?->entregado ?? 0);
                $tasas[] = min(1.0, $real / $esperado);
            }

            $result[$pip->id] = count($tasas) > 0
                ? round(array_sum($tasas) / count($tasas) * 100, 1)
                : 0.0;
        }

        return $result;
    }
}
