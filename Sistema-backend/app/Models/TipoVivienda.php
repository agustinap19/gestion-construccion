<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TipoVivienda extends Model
{
    use HasFactory;

    protected $table = 'tipos_vivienda';

    protected $fillable = [
        'nombre',
        'descripcion',
        'plano_url',
        'metros_cuadrados',
        'cantidad_dormitorios',
        'cantidad_banos',
        'costo_referencial',
        'estado',
        'plantilla_constructiva_id',
    ];

    protected $casts = [
        'metros_cuadrados'    => 'decimal:2',
        'costo_referencial'   => 'decimal:2',
        'cantidad_dormitorios' => 'integer',
        'cantidad_banos'       => 'integer',
    ];

    public function plantillaConstructiva()
    {
        return $this->belongsTo(PlantillaConstructiva::class, 'plantilla_constructiva_id');
    }

    public function beneficiarios()
    {
        return $this->hasMany(Beneficiario::class, 'tipo_vivienda_id');
    }

    public function unidadesFuncionales()
    {
        return $this->hasMany(UnidadFuncional::class, 'tipo_vivienda_id');
    }
}
