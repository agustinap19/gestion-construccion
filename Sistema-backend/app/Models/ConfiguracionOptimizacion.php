<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConfiguracionOptimizacion extends Model
{
    use HasFactory;

    protected $table = 'configuracion_optimizacion';

    public $timestamps = false;

    protected $fillable = [
        'peso_atraso', 'peso_plazo', 'peso_penalidad', 'peso_distancia',
        'peso_gerente_override', 'modo_asignacion_default', 'radio_cluster_km',
        'tiempo_traslado_por_km_min', 'updated_by', 'updated_at',
    ];

    protected $casts = [
        'peso_atraso'                => 'decimal:2',
        'peso_plazo'                 => 'decimal:2',
        'peso_penalidad'             => 'decimal:2',
        'peso_distancia'             => 'decimal:2',
        'peso_gerente_override'      => 'decimal:2',
        'radio_cluster_km'           => 'decimal:2',
        'tiempo_traslado_por_km_min' => 'decimal:2',
        'updated_at'                 => 'datetime',
    ];

    public function actualizadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public static function actual(): self
    {
        return static::query()->firstOrCreate([]);
    }
}
