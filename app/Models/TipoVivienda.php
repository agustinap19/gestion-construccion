<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TipoVivienda extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'tipos_vivienda';

    protected $fillable = [
        'nombre',
        'descripcion',
        'metros_cuadrados',
        'cantidad_dormitorios',
        'cantidad_banos',
        'tiene_cocina',
        'tiene_sala_comedor',
        'tiene_patio',
        'tiene_lavanderia',
        'especificaciones_tecnicas',
        'plano_url',
        'costo_estimado'
    ];

    protected $casts = [
        'metros_cuadrados' => 'decimal:2',
        'costo_estimado' => 'decimal:2',
        'cantidad_dormitorios' => 'integer',
        'cantidad_banos' => 'integer',
        'tiene_cocina' => 'boolean',
        'tiene_sala_comedor' => 'boolean',
        'tiene_patio' => 'boolean',
        'tiene_lavanderia' => 'boolean',
        'especificaciones_tecnicas' => 'array',
    ];

    public function beneficiarios()
    {
        return $this->hasMany(Beneficiario::class, 'tipo_vivienda_id');
    }

    public function viviendas()
    {
        return $this->hasMany(Vivienda::class, 'tipo_vivienda_id');
    }
}
