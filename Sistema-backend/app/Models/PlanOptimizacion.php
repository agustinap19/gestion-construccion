<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanOptimizacion extends Model
{
    use HasFactory;

    protected $table = 'planes_optimizacion';

    protected $fillable = [
        'activo_id', 'tipo', 'algoritmo_usado', 'parametros_entrada',
        'resultado', 'score_optimizacion', 'modo_aplicacion', 'estado',
        'aprobado_por', 'created_by',
    ];

    protected $casts = [
        'parametros_entrada' => 'array',
        'resultado'          => 'array',
        'score_optimizacion' => 'array',
    ];

    public function activo(): BelongsTo
    {
        return $this->belongsTo(Activo::class, 'activo_id');
    }

    public function aprobadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprobado_por');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
