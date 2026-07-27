<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Almacen extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'almacenes';

    protected $fillable = [
        'codigo', 'nombre', 'descripcion', 'proyecto_id',
        'ubicacion', 'latitud', 'longitud', 'capacidad_estimada',
        'tipo', 'estado', 'responsable_id',
        'fecha_apertura', 'fecha_cierre', 'observaciones',
    ];

    protected $casts = [
        'latitud'            => 'decimal:7',
        'longitud'           => 'decimal:7',
        'capacidad_estimada' => 'decimal:4',
        'fecha_apertura'     => 'date',
        'fecha_cierre'       => 'date',
    ];

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function responsable()
    {
        return $this->belongsTo(Personal::class, 'responsable_id');
    }

    public function stocks()
    {
        return $this->hasMany(StockMaterial::class, 'almacen_id');
    }

    public function movimientos()
    {
        return $this->hasMany(MovimientoMaterial::class, 'almacen_id');
    }

    public function activos()
    {
        return $this->hasMany(Activo::class, 'almacen_id');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', 'activo');
    }

    public function scopeDelProyecto($query, int $proyectoId)
    {
        return $query->where('proyecto_id', $proyectoId);
    }

    public function scopeCentral($query)
    {
        return $query->where('tipo', 'central');
    }
}
