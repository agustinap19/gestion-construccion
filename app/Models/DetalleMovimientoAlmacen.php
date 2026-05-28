<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetalleMovimientoAlmacen extends Model
{
    protected $table = 'detalle_movimientos_almacen';

    protected $fillable = [
        'movimiento_almacen_id',
        'material_id',
        'cantidad',
        'precio_unitario',
        'pmp_anterior',
        'pmp_posterior',
        'saldo_anterior',
        'saldo_posterior',
        'movimiento_material_id',
        'porcentaje_presupuesto',
        'observacion',
    ];

    protected $casts = [
        'cantidad'               => 'decimal:4',
        'precio_unitario'        => 'decimal:4',
        'subtotal'               => 'decimal:4',
        'pmp_anterior'           => 'decimal:4',
        'pmp_posterior'          => 'decimal:4',
        'saldo_anterior'         => 'decimal:4',
        'saldo_posterior'        => 'decimal:4',
        'porcentaje_presupuesto' => 'decimal:4',
    ];

    public function movimiento(): BelongsTo
    {
        return $this->belongsTo(MovimientoAlmacen::class, 'movimiento_almacen_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }

    public function movimientoKardex(): BelongsTo
    {
        return $this->belongsTo(MovimientoMaterial::class, 'movimiento_material_id');
    }
}
