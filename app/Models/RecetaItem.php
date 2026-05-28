<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RecetaItem extends Model
{
    use HasFactory;

    protected $table = 'recetas_item';

    protected $fillable = [
        'item_constructivo_id', 'material_id',
        'cantidad_por_unidad_base', 'unidad_material', 'notas',
    ];

    protected $casts = [
        'cantidad_por_unidad_base' => 'decimal:4',
    ];

    public function item()
    {
        return $this->belongsTo(ItemConstructivo::class, 'item_constructivo_id');
    }

    public function material()
    {
        return $this->belongsTo(Material::class, 'material_id');
    }
}
