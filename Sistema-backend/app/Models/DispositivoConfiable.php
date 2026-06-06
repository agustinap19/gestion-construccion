<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DispositivoConfiable extends Model
{
    protected $table = 'dispositivos_confiables';

    protected $fillable = [
        'usuario_id',
        'fingerprint',
        'nombre_dispositivo',
        'ip_registro',
        'ultimo_uso',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'ultimo_uso' => 'datetime',
            'activo' => 'boolean',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
