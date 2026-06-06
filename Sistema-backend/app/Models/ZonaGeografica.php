<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ZonaGeografica extends Model
{
    use HasFactory;

    protected $table = 'zonas_geograficas';

    protected $fillable = [
        'nombre',
        'departamento',
        'provincia',
        'municipio',
        'latitud_centro',
        'longitud_centro',
        'radio_km',
        'codigo_postal',
        'estado'
    ];

    protected $casts = [
        'latitud_centro' => 'decimal:7',
        'longitud_centro' => 'decimal:7',
        'radio_km' => 'decimal:2',
    ];

    // Relaciones
    public function clientes()
    {
        return $this->hasMany(Cliente::class, 'zona_id');
    }

    public function entidadesEstatales()
    {
        return $this->hasMany(EntidadEstatal::class, 'zona_id');
    }

    /*
    public function proyectos()
    {
        return $this->hasMany(Proyecto::class, 'zona_id');
    }
    */

    // Scopes
    public function scopeActivas($query)
    {
        return $query->where('estado', 'activa');
    }

    public function scopeEnDepartamento($query, $departamento)
    {
        return $query->where('departamento', $departamento);
    }
}
