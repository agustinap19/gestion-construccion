<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CategoriaMaterial extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'categorias_material';

    protected $fillable = [
        'nombre',
        'descripcion',
        'color',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function materiales()
    {
        return $this->hasMany(Material::class, 'categoria_id');
    }
}
