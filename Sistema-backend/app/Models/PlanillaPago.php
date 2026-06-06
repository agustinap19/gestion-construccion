<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanillaPago extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'planillas_pago';

    protected $fillable = [
        'codigo',
        'proyecto_id',
        'generado_por_id',
        'periodo_mes',
        'fecha_inicio_periodo',
        'fecha_fin_periodo',
        'frecuencia',
        'total_bruto',
        'total_descuentos',
        'total_neto',
        'estado',
        'fecha_aprobacion',
        'fecha_pago',
        'observaciones',
    ];

    protected $casts = [
        'fecha_inicio_periodo' => 'date',
        'fecha_fin_periodo'    => 'date',
        'fecha_aprobacion'     => 'date',
        'fecha_pago'           => 'date',
        'total_bruto'          => 'decimal:2',
        'total_descuentos'     => 'decimal:2',
        'total_neto'           => 'decimal:2',
    ];

    public function detalles(): HasMany
    {
        return $this->hasMany(DetallePlanilla::class, 'planilla_id');
    }

    public function generadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generado_por_id');
    }
}
