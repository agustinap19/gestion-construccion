<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PresupuestoMaterialDistribucion extends Model
{
    use HasFactory;

    protected $table = 'presupuesto_material_distribucion';

    protected $fillable = [
        'presupuesto_material_id',
        'entidad_tipo',
        'entidad_id',
        'cantidad_asignada',
        'porcentaje_asignado',
    ];

    protected $casts = [
        'cantidad_asignada'   => 'decimal:4',
        'porcentaje_asignado' => 'decimal:4',
    ];

    public function presupuestoMaterial()
    {
        return $this->belongsTo(PresupuestoMaterialProyecto::class, 'presupuesto_material_id');
    }

    public function entidad()
    {
        return $this->entidad_tipo === 'producto'
            ? $this->belongsTo(ProductoContractual::class, 'entidad_id')
            : $this->belongsTo(FaseProyecto::class, 'entidad_id');
    }
}
