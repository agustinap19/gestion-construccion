<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMaterial extends Model
{
    use HasFactory;

    protected $table = 'stock_material';

    protected $fillable = [
        'almacen_id',
        'material_id',
        'cantidad',
        'cantidad_reservada',
        'cantidad_en_transito',
        'costo_promedio',
        'stock_minimo_alerta',
        'ultimo_precio_entrada',
        'ultima_fecha_movimiento',
        'ultima_actualizacion',
    ];

    protected $casts = [
        'cantidad'                => 'decimal:4',
        'cantidad_reservada'      => 'decimal:4',
        'cantidad_en_transito'    => 'decimal:4',
        'costo_promedio'          => 'decimal:4',
        'stock_minimo_alerta'     => 'decimal:4',
        'ultimo_precio_entrada'   => 'decimal:4',
        'ultima_fecha_movimiento' => 'datetime',
        'ultima_actualizacion'    => 'datetime',
    ];

    // cantidad_disponible es columna virtual (generada en BD)
    // No se incluye en fillable pero sí en appends para serialización
    protected $appends = ['estado_stock'];

    public function almacen()
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function material()
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    public function getEstadoStockAttribute(): string
    {
        $disponible = (float) ($this->cantidad - $this->cantidad_reservada);
        $minimo     = (float) ($this->stock_minimo_alerta ?? $this->material?->stock_minimo ?? 0);

        if ($disponible <= 0)            return 'agotado';
        if ($minimo > 0 && $disponible <= $minimo)   return 'critico';
        if ($minimo > 0 && $disponible <= $minimo * 1.5) return 'bajo';
        return 'normal';
    }

    public function scopeCriticos($query)
    {
        return $query->whereRaw('cantidad - cantidad_reservada <= COALESCE(stock_minimo_alerta, 0)');
    }
}
