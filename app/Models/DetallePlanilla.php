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
        'planilla_id', 'personal_id', 'dias_trabajados', 'horas_extras', 'bonos', 'descuentos', 'monto_bruto', 'monto_neto', 'observaciones'
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
