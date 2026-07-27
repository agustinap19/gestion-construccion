<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepreciacionActivo extends Model
{
    use HasFactory;

    protected $table = 'depreciaciones_activo';

    protected $fillable = [
        'activo_id', 'periodo', 'valor_inicio_periodo', 'monto_depreciacion',
        'depreciacion_acumulada', 'valor_neto_contable', 'calculado_por_id',
    ];

    protected $casts = [
        'valor_inicio_periodo'   => 'decimal:2',
        'monto_depreciacion'     => 'decimal:2',
        'depreciacion_acumulada' => 'decimal:2',
        'valor_neto_contable'    => 'decimal:2',
    ];

    public function activo(): BelongsTo
    {
        return $this->belongsTo(Activo::class, 'activo_id');
    }

    public function calculadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'calculado_por_id');
    }
}
