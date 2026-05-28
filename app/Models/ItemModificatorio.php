<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemModificatorio extends Model
{
    protected $table = 'items_modificatorio';

    protected $fillable = [
        'modificatorio_id',
        'item_presupuesto_id',
        'nombre',
        'unidad',
        'cantidad_original',
        'precio_unitario',
        'cantidad_nueva',
        'monto_original',
        'monto_nuevo',
        'delta_monto',
    ];

    protected function casts(): array
    {
        return [
            'cantidad_original' => 'decimal:4',
            'precio_unitario'   => 'decimal:2',
            'cantidad_nueva'    => 'decimal:4',
            'monto_original'    => 'decimal:2',
            'monto_nuevo'       => 'decimal:2',
            'delta_monto'       => 'decimal:2',
        ];
    }

    public function modificatorio(): BelongsTo
    {
        return $this->belongsTo(Modificatorio::class, 'modificatorio_id');
    }

    public function itemPresupuesto(): BelongsTo
    {
        return $this->belongsTo(ItemPresupuesto::class, 'item_presupuesto_id');
    }

    /** Recalcula y guarda montos a partir de cantidades + precio_unitario */
    public function recalcular(): void
    {
        $this->monto_original = round((float) $this->cantidad_original * (float) $this->precio_unitario, 2);
        $this->monto_nuevo    = round((float) $this->cantidad_nueva    * (float) $this->precio_unitario, 2);
        $this->delta_monto    = round($this->monto_nuevo - $this->monto_original, 2);
    }
}
