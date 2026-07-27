<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeguroActivo extends Model
{
    use HasFactory;

    protected $table = 'seguros_activo';

    protected $fillable = [
        'activo_id', 'aseguradora', 'numero_poliza', 'tipo_seguro',
        'valor_asegurado', 'prima_anual', 'fecha_inicio', 'fecha_vencimiento',
        'estado', 'documento_url', 'observaciones',
    ];

    protected $casts = [
        'valor_asegurado'   => 'decimal:2',
        'prima_anual'       => 'decimal:2',
        'fecha_inicio'      => 'date',
        'fecha_vencimiento' => 'date',
    ];

    public function activo(): BelongsTo
    {
        return $this->belongsTo(Activo::class, 'activo_id');
    }
}
