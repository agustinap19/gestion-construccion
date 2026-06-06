<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TokenRecuperacion extends Model
{
    protected $table = 'tokens_recuperacion';

    protected $fillable = [
        'usuario_id',
        'token',
        'expira_en',
        'usado',
    ];

    protected $casts = [
        'expira_en' => 'datetime',
        'usado' => 'boolean',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function scopeVigente($query)
    {
        return $query->where('usado', false)->where('expira_en', '>', now());
    }

    public function estaExpirado(): bool
    {
        return $this->expira_en->isPast();
    }
}
