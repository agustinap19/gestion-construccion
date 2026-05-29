<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OverrideItemProyecto extends Model
{
    protected $table = 'overrides_items_proyecto';

    protected $fillable = [
        'proyecto_id',
        'item_constructivo_id',
        'material_id',
        'cantidad_por_unidad_base',
        'nivel',
        'vivienda_id',
        'justificacion',
        'usuario_autorizador_id',
    ];

    protected $casts = [
        'cantidad_por_unidad_base' => 'decimal:4',
    ];

    public function proyecto(): BelongsTo
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function itemConstructivo(): BelongsTo
    {
        return $this->belongsTo(ItemConstructivo::class, 'item_constructivo_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    public function vivienda(): BelongsTo
    {
        return $this->belongsTo(Vivienda::class, 'vivienda_id');
    }

    public function autorizador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_autorizador_id');
    }
}
