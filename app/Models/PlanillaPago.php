<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlanillaPago extends Model
{
    use HasFactory;

    protected $table = 'planillas_pago';

    protected $fillable = [
        'proyecto_id', 'periodo_inicio', 'periodo_fin', 'tipo', 'monto_total', 'estado', 'fecha_pago', 'observaciones'
    ];

    public function detalles(): HasMany
    {
        return $this->hasMany(DetallePlanilla::class, 'planilla_id');
    }
}
