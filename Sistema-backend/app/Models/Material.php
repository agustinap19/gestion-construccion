<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Material extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'materiales';

    protected $fillable = [
        'codigo',
        'nombre',
        'descripcion',
        'imagen_url',
        'tipo',
        'proyecto_id',
        'categoria_id',
        'unidad_medida_id',
        'precio_referencial',
        'stock_minimo',
        'marca',
        'modelo',
        'es_perecedero',
        'dias_vencimiento',
        'equivalencias',
        'activo',
    ];

    protected $casts = [
        'precio_referencial' => 'decimal:4',
        'stock_minimo' => 'decimal:4',
        'es_perecedero' => 'boolean',
        'activo' => 'boolean',
        'equivalencias' => 'array',
    ];

    public function categoria()
    {
        return $this->belongsTo(CategoriaMaterial::class, 'categoria_id');
    }

    public function unidadMedida()
    {
        return $this->belongsTo(UnidadMedida::class, 'unidad_medida_id');
    }

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function stocks()
    {
        return $this->hasMany(StockMaterial::class, 'material_id');
    }

    public function scopeMaestros($query)
    {
        return $query->where('tipo', 'maestro');
    }

    public function scopeEspeciales($query, $proyectoId = null)
    {
        $query->where('tipo', 'especial');
        if ($proyectoId) {
            $query->where('proyecto_id', $proyectoId);
        }
        return $query;
    }

    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }
}
