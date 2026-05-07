<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodigoOtp extends Model
{
    protected $table = 'codigos_otp';

    public $timestamps = false; // We only have created_at

    protected $fillable = [
        'usuario_id',
        'codigo',
        'token_temporal',
        'fingerprint_dispositivo',
        'usado',
        'expira_en',
        'intentos_fallidos',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'usado' => 'boolean',
            'expira_en' => 'datetime',
            'created_at' => 'datetime',
            'intentos_fallidos' => 'integer',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function scopeVigente(Builder $query): void
    {
        $query->where('usado', false)
              ->where('expira_en', '>', now());
    }
}
