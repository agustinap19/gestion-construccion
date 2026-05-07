<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TokenRecuperacion extends Model
{
    use HasFactory;

    protected $table = 'tokens_recuperacion';

    protected $fillable = [
        'usuario_id',
        'token',
        'email',
        'ip_solicitud',
        'user_agent',
        'expira_en',
        'usado',
        'usado_en',
        'rostro_verificado'
    ];

    protected $casts = [
        'expira_en' => 'datetime',
        'usado_en' => 'datetime',
        'usado' => 'boolean',
        'rostro_verificado' => 'boolean',
    ];

    /**
     * Obtener el usuario asociado a este token
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    /**
     * Scope para obtener tokens vigentes (no usados y no expirados)
     */
    public function scopeVigente($query)
    {
        return $query->where('usado', false)->where('expira_en', '>', now());
    }

    /**
     * Comprueba si el token está expirado
     */
    public function estaExpirado(): bool
    {
        return $this->expira_en->isPast();
    }
}
