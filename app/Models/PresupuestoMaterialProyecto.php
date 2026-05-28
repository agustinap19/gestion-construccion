<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PresupuestoMaterialProyecto extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'presupuesto_material_proyecto';

    protected $fillable = [
        'proyecto_id',
        'material_id',
        'cantidad_total_planificada',
        'precio_unitario_presupuestado',
        'notas',
        'registrado_por_id',
    ];

    protected $casts = [
        'cantidad_total_planificada'    => 'decimal:4',
        'precio_unitario_presupuestado' => 'decimal:4',
        'monto_total'                   => 'decimal:4',
    ];

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function material()
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    public function distribuciones()
    {
        return $this->hasMany(PresupuestoMaterialDistribucion::class, 'presupuesto_material_id');
    }

    public function registradoPor()
    {
        return $this->belongsTo(User::class, 'registrado_por_id');
    }
}
