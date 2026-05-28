<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PresupuestoItemProyecto extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'presupuesto_items_proyecto';

    protected $fillable = [
        'proyecto_id', 'vivienda_id', 'item_constructivo_id',
        'cantidad_planificada', 'producto_contractual_id', 'fase_id',
        'orden', 'ponderacion_avance', 'estado_ejecucion',
        'porcentaje_avance', 'tiene_override_receta', 'metadata',
    ];

    protected $casts = [
        'cantidad_planificada'  => 'decimal:4',
        'ponderacion_avance'    => 'decimal:4',
        'porcentaje_avance'     => 'decimal:2',
        'tiene_override_receta' => 'boolean',
        'metadata'              => 'array',
    ];

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function vivienda()
    {
        return $this->belongsTo(Vivienda::class, 'vivienda_id');
    }

    public function itemConstructivo()
    {
        return $this->belongsTo(ItemConstructivo::class, 'item_constructivo_id');
    }

    public function productoContractual()
    {
        return $this->belongsTo(ProductoContractual::class, 'producto_contractual_id');
    }

    public function fase()
    {
        return $this->belongsTo(FaseProyecto::class, 'fase_id');
    }

    public function overrides()
    {
        return $this->hasMany(OverrideRecetaProyecto::class, 'presupuesto_item_proyecto_id');
    }

    public function scopePorProyecto($query, int $proyectoId)
    {
        return $query->where('proyecto_id', $proyectoId);
    }

    public function scopePorVivienda($query, int $viviendaId)
    {
        return $query->where('vivienda_id', $viviendaId);
    }

    public function scopeObrasComunes($query)
    {
        return $query->whereNull('vivienda_id');
    }
}
