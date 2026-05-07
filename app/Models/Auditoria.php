<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Auditoria extends Model
{
    /**
     * La tabla asociada al modelo.
     */
    protected $table = 'auditoria';

    /**
     * Solo usamos created_at, no updated_at.
     */
    const UPDATED_AT = null;

    /**
     * Atributos asignables en masa.
     */
    protected $fillable = [
        'usuario_actor_id',
        'usuario_objetivo_id',
        'evento',
        'tabla_afectada',
        'registro_id',
        'datos_anteriores',
        'datos_nuevos',
        'razon',
        'ip_address',
        'user_agent',
    ];

    /**
     * Casts de atributos.
     */
    protected function casts(): array
    {
        return [
            'datos_anteriores' => 'array',
            'datos_nuevos' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Usuario que realizó la acción.
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_actor_id');
    }

    /**
     * Usuario afectado por la acción (opcional).
     */
    public function objetivo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_objetivo_id');
    }
}
