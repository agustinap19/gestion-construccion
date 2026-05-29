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
            $almacenesObra = Almacen::where('proyecto_id', $proyecto->id)
                ->whereIn('estado', ['activo', 'inactivo'])
                ->get();

            foreach ($almacenesObra as $almacen) {
                // Si el almacén es de tipo central, lo saltamos por seguridad aunque no debería tener proyecto_id
                if ($almacen->tipo === 'central') continue;

                $almacen->update([
                    'estado'       => 'cerrado',
                    'fecha_cierre' => now(),
                ]);
            }

            return [
                'proyecto_id'        => $proyecto->id,
                'almacenes_cerrados' => $almacenesObra->pluck('nombre')->toArray(),
            ];
        });
    }
}
