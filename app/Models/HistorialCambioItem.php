<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistorialCambioItem extends Model
{
    protected $table = 'historial_cambios_items_proyecto';

    protected $fillable = [
        'proyecto_id',
        'usuario_id',
        'tipo_cambio',
        'pip_id',
        'vivienda_id',
        'valores_antes',
        'valores_despues',
        'descripcion',
    ];

    protected $casts = [
        'valores_antes'   => 'array',
        'valores_despues' => 'array',
    ];

    public function proyecto(): BelongsTo
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function pip(): BelongsTo
    {
        return $this->belongsTo(PresupuestoItemProyecto::class, 'pip_id');
    }

    public function vivienda(): BelongsTo
    {
        return $this->belongsTo(Vivienda::class, 'vivienda_id');
    }
}
