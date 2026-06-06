<?php

namespace App\Services\Almacenes;

use App\Models\FaseProyecto;
use App\Models\Material;
use App\Models\PresupuestoMaterialDistribucion;
use App\Models\PresupuestoMaterialProyecto;
use App\Models\ProductoContractual;
use Illuminate\Support\Facades\DB;
use Exception;

class PresupuestoMaterialService
{
    /**
     * Lista el presupuesto de materiales de un proyecto con totales.
     */
    public function listarPorProyecto(int $proyectoId): array
    {
        $items = PresupuestoMaterialProyecto::with([
            'material:id,nombre,codigo,imagen_url,marca',
            'material.categoria:id,nombre,color',
            'material.unidadMedida:id,nombre,simbolo',
            'distribuciones',
            'registradoPor:id,nombre,apellido_paterno',
        ])
        ->where('proyecto_id', $proyectoId)
        ->get()
        ->map(fn($p) => $this->formatearItem($p));

        $totales = [
            'total_materiales'         => $items->count(),
            'monto_total'              => $items->sum('monto_total'),
            'monto_comprado'           => $items->sum('monto_comprado'),
            'monto_en_almacen'         => $items->sum('monto_en_almacen'),
            'monto_entregado'          => $items->sum('monto_entregado'),
            'materiales_con_desfase'   => $items->where('identidad_contable_ok', false)->count(),
        ];

        return compact('items', 'totales');
    }

    /**
     * Agrega o actualiza un material en el presupuesto del proyecto.
     * Si ya existe (mismo proyecto+material), actualiza cantidad y precio.
     */
    public function guardar(int $proyectoId, array $datos, int $actorId): PresupuestoMaterialProyecto
    {
        return DB::transaction(function () use ($proyectoId, $datos, $actorId) {
            $presupuesto = PresupuestoMaterialProyecto::updateOrCreate(
                ['proyecto_id' => $proyectoId, 'material_id' => $datos['material_id']],
                [
                    'cantidad_total_planificada'    => $datos['cantidad_total_planificada'],
                    'precio_unitario_presupuestado' => $datos['precio_unitario_presupuestado'],
                    'notas'                         => $datos['notas'] ?? null,
                    'registrado_por_id'             => $actorId,
                ]
            );

            if (!empty($datos['distribuciones'])) {
                $this->sincronizarDistribuciones($presupuesto->id, $datos['distribuciones']);
            }

            return $presupuesto->fresh(['material.categoria', 'material.unidadMedida', 'distribuciones']);
        });
    }

    /**
     * Elimina (soft delete) un ítem del presupuesto.
     */
    public function eliminar(int $id): void
    {
        $item = PresupuestoMaterialProyecto::findOrFail($id);
        $item->distribuciones()->delete();
        $item->delete();
    }

    /**
     * Genera una distribución proporcional sugerida entre fases/productos
     * basada en las duraciones de las fases o pesos definidos.
     */
    public function sugerirDistribucion(int $presupuestoId, string $porTipo): array
    {
        $presupuesto = PresupuestoMaterialProyecto::findOrFail($presupuestoId);
        $proyectoId  = $presupuesto->proyecto_id;
        $cantidad    = (float) $presupuesto->cantidad_total_planificada;

        if ($porTipo === 'fase') {
            $entidades = FaseProyecto::where('proyecto_id', $proyectoId)
                ->orderBy('orden')
                ->get(['id', 'nombre', 'duracion_dias']);

            if ($entidades->isEmpty()) return [];

            $totalDias = $entidades->sum('duracion_dias') ?: $entidades->count();

            return $entidades->map(function ($fase) use ($cantidad, $totalDias) {
                $peso       = $totalDias > 0 ? (($fase->duracion_dias ?? 1) / $totalDias) : (1 / max($totalDias, 1));
                $asignada   = round($cantidad * $peso, 4);
                return [
                    'entidad_tipo'       => 'fase',
                    'entidad_id'         => $fase->id,
                    'nombre'             => $fase->nombre,
                    'cantidad_asignada'  => $asignada,
                    'porcentaje_asignado'=> round($peso * 100, 2),
                ];
            })->toArray();
        }

        if ($porTipo === 'producto') {
            $entidades = ProductoContractual::where('proyecto_id', $proyectoId)
                ->get(['id', 'nombre', 'monto_contractual']);

            if ($entidades->isEmpty()) return [];

            $totalMonto = $entidades->sum('monto_contractual') ?: $entidades->count();

            return $entidades->map(function ($prod) use ($cantidad, $totalMonto) {
                $peso       = $totalMonto > 0 ? ((float) $prod->monto_contractual / $totalMonto) : (1 / max($totalMonto, 1));
                $asignada   = round($cantidad * $peso, 4);
                return [
                    'entidad_tipo'        => 'producto',
                    'entidad_id'          => $prod->id,
                    'nombre'              => $prod->nombre,
                    'cantidad_asignada'   => $asignada,
                    'porcentaje_asignado' => round($peso * 100, 2),
                ];
            })->toArray();
        }

        throw new Exception("Tipo de distribución inválido: {$porTipo}");
    }

    /**
     * Importa materiales desde un array (procesado desde Excel/CSV).
     * Formato: [['material_id', 'cantidad_total_planificada', 'precio_unitario_presupuestado', 'notas?']]
     */
    public function importarDesdeArray(int $proyectoId, array $filas, int $actorId): array
    {
        $creados  = 0;
        $errores  = [];

        DB::transaction(function () use ($proyectoId, $filas, $actorId, &$creados, &$errores) {
            foreach ($filas as $i => $fila) {
                try {
                    $material = Material::where('codigo', $fila['codigo'] ?? '')->first()
                        ?? Material::find($fila['material_id'] ?? null);

                    if (!$material) {
                        $errores[] = "Fila {$i}: material no encontrado.";
                        continue;
                    }

                    $cantidad = (float) ($fila['cantidad'] ?? 0);
                    $precio   = (float) ($fila['precio'] ?? 0);

                    if ($cantidad <= 0 || $precio <= 0) {
                        $errores[] = "Fila {$i}: cantidad y precio deben ser mayores a cero.";
                        continue;
                    }

                    $this->guardar($proyectoId, [
                        'material_id'                  => $material->id,
                        'cantidad_total_planificada'    => $cantidad,
                        'precio_unitario_presupuestado' => $precio,
                        'notas'                        => $fila['notas'] ?? null,
                    ], $actorId);

                    $creados++;
                } catch (\Throwable $e) {
                    $errores[] = "Fila {$i}: " . $e->getMessage();
                }
            }
        });

        return compact('creados', 'errores');
    }

    private function sincronizarDistribuciones(int $presupuestoId, array $distribuciones): void
    {
        PresupuestoMaterialDistribucion::where('presupuesto_material_id', $presupuestoId)->delete();

        foreach ($distribuciones as $d) {
            PresupuestoMaterialDistribucion::create([
                'presupuesto_material_id' => $presupuestoId,
                'entidad_tipo'            => $d['entidad_tipo'],
                'entidad_id'              => $d['entidad_id'],
                'cantidad_asignada'       => $d['cantidad_asignada'],
                'porcentaje_asignado'     => $d['porcentaje_asignado'] ?? 0,
            ]);
        }
    }

    private function formatearItem(PresupuestoMaterialProyecto $p): array
    {
        $planificada      = (float) $p->cantidad_total_planificada;
        $comprada         = (float) ($p->cantidad_comprada ?? 0);
        $enAlmacen        = (float) ($p->cantidad_en_almacen_proyecto ?? 0);
        $devueltaCentral  = (float) ($p->cantidad_devuelta_central ?? 0);
        $entregadaObra    = (float) ($p->cantidad_entregada_obra ?? 0);
        $merma            = (float) ($p->cantidad_merma ?? 0);
        $retrabajo        = (float) ($p->cantidad_retrabajo ?? 0);
        $desfase          = (float) ($p->desfase_contable ?? 0);
        $identidadOk      = (bool)  ($p->identidad_contable_ok ?? true);
        $precio           = (float) $p->precio_unitario_presupuestado;

        return [
            'id'                            => $p->id,
            'material'                      => $p->material,
            // Cantidades de trazabilidad
            'planificado'                   => $planificada,
            'comprado'                      => $comprada,
            'en_almacen'                    => $enAlmacen,
            'devuelto_central'              => $devueltaCentral,
            'entregado_obra'                => $entregadaObra,
            'merma'                         => $merma,
            'retrabajo'                     => $retrabajo,
            // Montos
            'precio_unitario_presupuestado' => $precio,
            'monto_total'                   => round($planificada * $precio, 2),
            'monto_comprado'                => round($comprada * $precio, 2),
            'monto_en_almacen'              => round($enAlmacen * $precio, 2),
            'monto_entregado'               => round($entregadaObra * $precio, 2),
            // Porcentajes de avance
            'porcentaje_comprado'           => $planificada > 0 ? round(($comprada / $planificada) * 100, 1) : 0,
            'porcentaje_entregado'          => $planificada > 0 ? round(($entregadaObra / $planificada) * 100, 1) : 0,
            // Identidad contable
            'identidad_contable_ok'         => $identidadOk,
            'desfase'                       => $desfase,
            // Control
            'bloqueado'                     => (bool) ($p->bloqueado ?? false),
            'notas'                         => $p->notas,
            'distribuciones'                => $p->distribuciones,
            'registrado_por'                => $p->registradoPor,
            'created_at'                    => $p->created_at,
        ];
    }
}

