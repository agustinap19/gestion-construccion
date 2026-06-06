<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemPresupuesto extends Model
{
    protected $table = 'items_presupuesto';

    protected $fillable = [
        'presupuesto_id',
        'partida_id',
        'item_padre_id',
        'codigo_item',
        'descripcion',
        'nivel',
        'es_hoja',
        'unidad_medida_id',
        'metrado',
        'precio_unitario',
        'subtotal',
        'orden',
    ];

    protected function casts(): array
    {
        return [
            'es_hoja'        => 'boolean',
            'metrado'        => 'decimal:4',
            'precio_unitario'=> 'decimal:4',
            'subtotal'       => 'decimal:2',
        ];
    }

    public function presupuesto(): BelongsTo
    {
        return $this->belongsTo(Presupuesto::class, 'presupuesto_id');
    }
}
