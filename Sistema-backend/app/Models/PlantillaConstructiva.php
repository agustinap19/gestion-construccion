<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PlantillaConstructiva extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'plantillas_constructivas';

    protected $fillable = [
        'nombre', 'descripcion', 'tipo_obra', 'tipologia',
        'version', 'estado', 'es_sistema',
        'usuario_creador_id', 'usuario_actualizador_id',
    ];

    protected $casts = [
        'estado'     => 'boolean',
        'es_sistema' => 'boolean',
        'version'    => 'integer',
    ];

    public function items()
    {
        return $this->hasMany(ItemPlantillaConstructiva::class, 'plantilla_id')->orderBy('orden');
    }

    public function creador()
    {
        return $this->belongsTo(User::class, 'usuario_creador_id');
    }

    public function actualizador()
    {
        return $this->belongsTo(User::class, 'usuario_actualizador_id');
    }

    public function scopeActivas($query)
    {
        return $query->where('estado', true);
    }

    public function scopePorTipo($query, string $tipo)
    {
        return $query->where('tipo_obra', $tipo);
    }

    public function getPonderacionTotalAttribute(): float
    {
        return (float) $this->items()->sum('ponderacion_avance');
    }
}
