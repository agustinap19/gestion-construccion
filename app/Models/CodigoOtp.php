<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodigoOtp extends Model
{
    protected $table = 'codigos_otp';

    protected $fillable = [
        'usuario_id',
        'codigo',
        'tipo',
        'token_temporal',
        'fingerprint_dispositivo',
        'expira_en',
        'usado',
        'intentos_fallidos',
    ];

    protected function casts(): array
    {
        return [
            'usado' => 'boolean',
            'expira_en' => 'datetime',
            'intentos_fallidos' => 'integer',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function scopeVigente(Builder $query): void
    {
        $query->where('usado', false)->where('expira_en', '>', now());
    }
}
