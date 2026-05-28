<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class CodigoReapertura extends Model
{
    protected $table = 'codigos_reapertura';

    protected $fillable = [
        'proyecto_id',
        'usuario_id',
        'codigo',
        'tipo',
        'usado',
        'expira_en',
        'usado_en',
    ];

    protected function casts(): array
    {
        return [
            'usado'     => 'boolean',
            'expira_en' => 'datetime',
            'usado_en'  => 'datetime',
        ];
    }

    public function proyecto(): BelongsTo
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function scopeVigente(Builder $query): void
    {
        $query->where('usado', false)->where('expira_en', '>', now());
    }

    public function estaVigente(): bool
    {
        return !$this->usado && $this->expira_en->isFuture();
    }
}
