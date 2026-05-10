<?php

namespace App\Services\Clientes;

use App\Models\ZonaGeografica;
use Illuminate\Database\Eloquent\Collection;

class ZonaGeograficaService
{
    /**
     * Lista todas las zonas geográficas
     */
    public function listarTodas(bool $soloActivas = true): Collection
    {
        $query = ZonaGeografica::query();
        
        if ($soloActivas) {
            $query->activas();
        }

        return $query->orderBy('departamento')->orderBy('nombre')->get();
    }

    /**
     * Obtiene las zonas de un departamento específico
     */
    public function obtenerPorDepartamento(string $departamento): Collection
    {
        return ZonaGeografica::enDepartamento($departamento)->activas()->orderBy('nombre')->get();
    }

    /**
     * Obtiene zonas cercanas a una coordenada
     */
    public function obtenerCercanas(float $lat, float $lng, float $radioKm = 50): Collection
    {
        // Fórmula de Haversine para encontrar zonas en el radio
        $haversine = "(6371 * acos(cos(radians($lat)) 
                     * cos(radians(latitud_centro)) 
                     * cos(radians(longitud_centro) - radians($lng)) 
                     + sin(radians($lat)) 
                     * sin(radians(latitud_centro))))";

        return ZonaGeografica::activas()
            ->select('*')
            ->selectRaw("{$haversine} AS distancia")
            ->whereNotNull('latitud_centro')
            ->whereNotNull('longitud_centro')
            ->having('distancia', '<=', $radioKm)
            ->orderBy('distancia')
            ->get();
    }
}
