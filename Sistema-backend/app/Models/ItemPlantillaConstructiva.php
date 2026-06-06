<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ItemPlantillaConstructiva extends Model
{
    use HasFactory;

    protected $table = 'items_plantilla_constructiva';

    protected $fillable = [
        'plantilla_id', 'item_constructivo_id',
        'orden', 'ponderacion_avance', 'cantidad_sugerida',
    ];

    protected $casts = [
        'ponderacion_avance' => 'decimal:4',
        'cantidad_sugerida'  => 'decimal:4',
        'orden'              => 'integer',
    ];

    public function plantilla()
    {
        return $this->belongsTo(PlantillaConstructiva::class, 'plantilla_id');
    }

    public function itemConstructivo()
    {
        return $this->belongsTo(ItemConstructivo::class, 'item_constructivo_id');
    }
}
