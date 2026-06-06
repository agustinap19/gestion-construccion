<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

trait ConFiltros
{
    /**
     * Aplica filtros básicos de la vista (búsqueda, rango de fechas, etc) a una query.
     */
    protected function aplicarFiltrosComunes(Builder $query, array $filtros): Builder
    {
        if (!empty($filtros['search'])) {
            $search = $filtros['search'];
            // Esto asume que el desarrollador define un scope o lo maneja manual.
            // Para ser genéricos, delegamos a un método en el modelo si existe.
            if (method_exists($query->getModel(), 'scopeSearch')) {
                $query->search($search);
            }
        }

        if (!empty($filtros['fecha_inicio']) && !empty($filtros['fecha_fin'])) {
            // Asume columna created_at por defecto si no se especifica campo_fecha
            $campoFecha = $filtros['campo_fecha'] ?? 'created_at';
            $query->whereBetween($campoFecha, [
                Carbon::parse($filtros['fecha_inicio'])->startOfDay(),
                Carbon::parse($filtros['fecha_fin'])->endOfDay()
            ]);
        }

        // Otros filtros específicos que vengan como key-value
        if (!empty($filtros['columnas'])) {
            foreach ($filtros['columnas'] as $columna => $valor) {
                if ($valor !== null && $valor !== '') {
                    $query->where($columna, $valor);
                }
            }
        }

        return $query;
    }

    /**
     * Genera un texto amigable para el encabezado del PDF resumiendo los filtros.
     * Ejemplo: "Movimientos de mayo 2026 — Tipo: SALIDA_OBRA"
     */
    protected function generarTextoFiltros(array $filtros): string
    {
        $textos = [];

        if (!empty($filtros['fecha_inicio']) && !empty($filtros['fecha_fin'])) {
            $inicio = Carbon::parse($filtros['fecha_inicio'])->format('d/m/Y');
            $fin = Carbon::parse($filtros['fecha_fin'])->format('d/m/Y');
            $textos[] = "Periodo: $inicio al $fin";
        } elseif (!empty($filtros['mes'])) {
            $textos[] = "Mes: " . $filtros['mes'];
        }

        if (!empty($filtros['search'])) {
            $textos[] = "Búsqueda: '{$filtros['search']}'";
        }

        if (!empty($filtros['columnas'])) {
            foreach ($filtros['columnas'] as $columna => $valor) {
                if ($valor !== null && $valor !== '') {
                    $nombreLimpiado = ucfirst(str_replace('_', ' ', $columna));
                    $textos[] = "$nombreLimpiado: $valor";
                }
            }
        }

        if (empty($textos)) {
            return "Todos los registros (sin filtros aplicados)";
        }

        return implode(' — ', $textos);
    }
}
