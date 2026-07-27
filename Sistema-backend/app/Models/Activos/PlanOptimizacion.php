<?php

namespace App\Models\Activos;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Activo;
use App\Models\User;

class PlanOptimizacion extends Model
{
    use HasFactory;

    protected $table = 'planes_optimizacion';

    protected $fillable = [
        'activo_id',
        'tipo_plan',
        'parametros_entrada',
        'resultados',
        'resultados_editados',
        'score_total',
        'distancia_total_km',
        'dias_estimados',
        'estado',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'parametros_entrada' => 'array',
        'resultados' => 'array',
        'resultados_editados' => 'array',
        'score_total' => 'float',
        'distancia_total_km' => 'float',
        'dias_estimados' => 'integer',
        'approved_at' => 'datetime',
    ];

    public function activo()
    {
        return $this->belongsTo(Activo::class);
    }

    public function creador()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function aprobador()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
