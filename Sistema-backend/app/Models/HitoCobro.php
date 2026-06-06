<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class HitoCobro extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'hitos_cobro_proyecto';

    protected $fillable = [
        'proyecto_id',
        'orden',
        'nombre',
        'porcentaje_contrato',
        'monto_calculado',
        'fecha_planificada',
        'fecha_cobrado',
        'tipo',
        'estado',
        'vinculacion_fase_id',
        'observaciones',
    ];

    protected $casts = [
        'porcentaje_contrato' => 'decimal:2',
        'monto_calculado'     => 'decimal:2',
        'fecha_planificada'   => 'date',
        'fecha_cobrado'       => 'date',
    ];

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function faseVinculada()
    {
        return $this->belongsTo(FaseProyecto::class, 'vinculacion_fase_id');
    }

    public function recalcularMonto(): void
    {
        $contractual = (float) ($this->proyecto->monto_contractual ?? 0);
        $this->monto_calculado = $contractual * ($this->porcentaje_contrato / 100);
        $this->save();
    }
}
