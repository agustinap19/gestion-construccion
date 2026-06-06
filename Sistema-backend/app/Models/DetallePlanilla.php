<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetallePlanilla extends Model
{
    use HasFactory;

    protected $table = 'detalles_planilla';

    protected $fillable = [
        'planilla_id',
        'personal_id',
        'salario_base',
        'dias_trabajados',
        'horas_extra',
        'bono_productividad',
        'otros_ingresos',
        'descuento_afp',
        'descuento_cns',
        'otros_descuentos',
        'total_bruto',
        'total_neto',
        'banco',
        'numero_cuenta',
        'observaciones',
    ];

    protected $casts = [
        'salario_base'      => 'decimal:2',
        'bono_productividad' => 'decimal:2',
        'otros_ingresos'    => 'decimal:2',
        'descuento_afp'     => 'decimal:2',
        'descuento_cns'     => 'decimal:2',
        'otros_descuentos'  => 'decimal:2',
        'total_bruto'       => 'decimal:2',
        'total_neto'        => 'decimal:2',
        'dias_trabajados'   => 'integer',
        'horas_extra'       => 'integer',
    ];

    public function planilla(): BelongsTo
    {
        return $this->belongsTo(PlanillaPago::class, 'planilla_id');
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'personal_id');
    }
}
