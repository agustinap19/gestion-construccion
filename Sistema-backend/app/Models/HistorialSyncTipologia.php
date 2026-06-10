<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistorialSyncTipologia extends Model
{
    protected $table = 'historial_sync_tipologia';

    protected $fillable = [
        'beneficiario_id',
        'proyecto_id',
        'vivienda_id',
        'tipo_anterior_id',
        'tipo_nuevo_id',
        'actor_id',
        'modo',
        'estado',
        'resumen',
    ];

    protected $casts = [
        'resumen' => 'array',
    ];

    public function beneficiario(): BelongsTo
    {
        return $this->belongsTo(Beneficiario::class);
    }

    public function tipoAnterior(): BelongsTo
    {
        return $this->belongsTo(TipoVivienda::class, 'tipo_anterior_id');
    }

    public function tipoNuevo(): BelongsTo
    {
        return $this->belongsTo(TipoVivienda::class, 'tipo_nuevo_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'actor_id');
    }
}
