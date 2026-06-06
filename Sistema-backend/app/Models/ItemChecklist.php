<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ItemChecklist extends Model
{
    use HasFactory;

    protected $table = 'items_checklist';

    protected $fillable = [
        'fase_id',
        'vivienda_id',
        'item_plantilla_id',
        'nombre',
        'orden',
        'ponderacion',
        'porcentaje_avance',
        'estado',
        'notas',
        'fecha_completado',
    ];

    protected $casts = [
        'ponderacion'       => 'decimal:2',
        'porcentaje_avance' => 'decimal:2',
        'fecha_completado'  => 'date',
    ];

    public function fase()
    {
        return $this->belongsTo(FaseProyecto::class, 'fase_id');
    }

    public function vivienda()
    {
        return $this->belongsTo(Vivienda::class, 'vivienda_id');
    }

    public function itemPlantilla()
    {
        return $this->belongsTo(ItemPlantilla::class, 'item_plantilla_id');
    }

    public function scopePendientes($query)
    {
        return $query->where('estado', 'pendiente');
    }

    public function scopeCompletados($query)
    {
        return $query->where('estado', 'completado');
    }
}
