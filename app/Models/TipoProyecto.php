<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TipoProyecto extends Model
{
    use HasFactory;

    protected $table = 'tipos_proyecto';

    protected $fillable = [
        'nombre',
        'descripcion',
        'categoria',
        'requiere_beneficiarios',
        'requiere_entidad_estatal'
    ];

    protected $casts = [
        'requiere_beneficiarios' => 'boolean',
        'requiere_entidad_estatal' => 'boolean',
    ];

    public function proyectos()
    {
        return $this->hasMany(Proyecto::class, 'tipo_proyecto_id');
    }

    public function scopeSociales($query)
    {
        return $query->where('categoria', 'social');
    }

    public function scopePrivados($query)
    {
        return $query->where('categoria', 'privado');
    }
}
