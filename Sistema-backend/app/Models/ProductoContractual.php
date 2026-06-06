<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductoContractual extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'productos_contractuales';

    protected $fillable = [
        'proyecto_id',
        'nombre',
        'porcentaje',
        'monto_calculado',
        'fecha_planificada_cobro',
        'fecha_cobro_real',
        'estado',
        'observaciones',
        'orden',
    ];

    protected $casts = [
        'porcentaje'             => 'decimal:2',
        'monto_calculado'        => 'decimal:2',
        'fecha_planificada_cobro' => 'date',
        'fecha_cobro_real'       => 'date',
    ];

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }
}
