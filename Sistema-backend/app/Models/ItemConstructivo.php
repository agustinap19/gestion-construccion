<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ItemConstructivo extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'items_constructivos';

    protected $fillable = [
        'codigo', 'nombre', 'descripcion',
        'categoria_constructiva_id', 'unidad_base',
        'rendimiento_horas_hombre', 'precio_unitario_referencial',
        'estado', 'usuario_creador_id', 'usuario_actualizador_id',
    ];

    protected $casts = [
        'rendimiento_horas_hombre'    => 'decimal:4',
        'precio_unitario_referencial' => 'decimal:4',
        'estado'                      => 'boolean',
    ];

    public function categoria()
    {
        return $this->belongsTo(CategoriaConstructiva::class, 'categoria_constructiva_id');
    }

    public function recetas()
    {
        return $this->hasMany(RecetaItem::class, 'item_constructivo_id');
    }

    public function itemsPlantilla()
    {
        return $this->hasMany(ItemPlantilla::class, 'item_constructivo_id');
    }

    public function presupuestoItems()
    {
        return $this->hasMany(PresupuestoItemProyecto::class, 'item_constructivo_id');
    }

    public function creador()
    {
        return $this->belongsTo(User::class, 'usuario_creador_id');
    }

    public function actualizador()
    {
        return $this->belongsTo(User::class, 'usuario_actualizador_id');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', true);
    }

    public function scopePorCategoria($query, int $categoriaId)
    {
        return $query->where('categoria_constructiva_id', $categoriaId);
    }

    public static function generarCodigo(): string
    {
        $ultimo = static::withTrashed()
            ->where('codigo', 'like', 'ITM-%')
            ->orderByRaw('LENGTH(codigo) DESC, codigo DESC')
            ->value('codigo');

        if ($ultimo) {
            $numero = (int) substr($ultimo, 4);
            return 'ITM-' . str_pad($numero + 1, 3, '0', STR_PAD_LEFT);
        }

        return 'ITM-001';
    }
}
