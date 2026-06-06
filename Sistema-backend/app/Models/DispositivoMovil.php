<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DispositivoMovil extends Model
{
    protected $table = 'dispositivos_movil';

    protected $fillable = [
        'usuario_id',
        'device_id',
        'device_name',
        'ultimo_sync',
        'activo',
    ];

    protected $casts = [
        'ultimo_sync' => 'datetime',
        'activo'      => 'boolean',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
