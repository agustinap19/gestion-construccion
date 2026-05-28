<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ItemPlantilla extends Model
{
    use HasFactory;

    protected $table = 'items_plantilla';

    protected $fillable = [
        'plantilla_id',
        'nombre',
        'orden',
        'ponderacion',
        'descripcion',
    ];

    protected $casts = [
        'ponderacion' => 'decimal:2',
    ];

    public function plantilla()
    {
        return $this->belongsTo(PlantillaChecklist::class, 'plantilla_id');
    }
}
