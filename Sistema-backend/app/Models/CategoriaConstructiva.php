<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CategoriaConstructiva extends Model
{
    use HasFactory;

    protected $table = 'categorias_constructivas';

    protected $fillable = [
        'nombre', 'color', 'orden', 'descripcion', 'estado',
    ];

    protected $casts = [
        'estado' => 'boolean',
        'orden'  => 'integer',
    ];

    public function itemsConstructivos()
    {
        return $this->hasMany(ItemConstructivo::class, 'categoria_constructiva_id');
    }

    public function scopeActivas($query)
    {
        return $query->where('estado', true)->orderBy('orden');
    }
}
