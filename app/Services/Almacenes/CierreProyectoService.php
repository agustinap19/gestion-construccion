<?php

namespace App\Services\Almacenes;

use App\Models\Almacen;
use App\Models\MovimientoAlmacen;
use App\Models\Proyecto;
use App\Models\StockMaterial;
use App\Services\Almacenes\EntregaService;
use Illuminate\Support\Facades\DB;

class CierreProyectoService
{
    public function __construct(private EntregaService $entregaService) {}

    /**
     * Al finalizar un proyecto: transfiere todo el stock de sus almacenes al almacén central.
     * Marca los almacenes de la obra como 'cerrado'.
     */
    public function cerrarProyecto(Proyecto $proyecto, int $userId): array
    {
        return DB::transaction(function () use ($proyecto, $userId) {
            $almacenCentral = Almacen::where('tipo', 'central')
                ->where('estado', 'activo')
                ->first();

            if (!$almacenCentral) {
                throw new \RuntimeException('No existe un almacén central activo para recibir el stock.');
            }

            $almacenesObra = Almacen::where('proyecto_id', $proyecto->id)
                ->whereIn('estado', ['activo', 'inactivo'])
                ->get();

            $transferenciasRealizadas = [];

            foreach ($almacenesObra as $almacen) {
                if ($almacen->id === $almacenCentral->id) continue;

                $stocks = StockMaterial::where('almacen_id', $almacen->id)
                    ->where('cantidad', '>', 0)
                    ->get();

                if ($stocks->isNotEmpty()) {
                    $materiales = $stocks->map(fn($s) => [
                        'material_id' => $s->material_id,
                        'cantidad'    => (float) $s->cantidad,
                    ])->toArray();

                    $movimiento = $this->entregaService->registrarTransferencia([
                        'almacen_origen_id'  => $almacen->id,
                        'almacen_destino_id' => $almacenCentral->id,
                        'proyecto_id'        => $proyecto->id,
                        'materiales'         => $materiales,
                        'notas'              => "Cierre automático del proyecto {$proyecto->nombre}",
                    ], $userId);

                    // Marcar como completado (no en_transito)
                    $movimiento->update(['estado' => 'completado']);

                    $transferenciasRealizadas[] = [
                        'almacen_id'       => $almacen->id,
                        'almacen_nombre'   => $almacen->nombre,
                        'movimiento_codigo'=> $movimiento->codigo,
                        'materiales'       => count($materiales),
                    ];
                }

                $almacen->update([
                    'estado'       => 'cerrado',
                    'fecha_cierre' => now(),
                ]);
            }

            return [
                'proyecto_id'       => $proyecto->id,
                'transferencias'    => $transferenciasRealizadas,
                'almacenes_cerrados'=> $almacenesObra->pluck('nombre')->toArray(),
            ];
        });
    }
}
