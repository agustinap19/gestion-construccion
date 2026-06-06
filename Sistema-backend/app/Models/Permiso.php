<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Builder;

class Permiso extends Model
{
    use HasFactory;

    protected $table = 'permisos';

    protected $fillable = [
        'codigo',
        'nombre',
        'nombre_visible',
        'modulo',
        'accion',
        'descripcion',
    ];

    public function scopePorModulo(Builder $query, string $modulo): Builder
    {
        return $query->where('modulo', $modulo);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Rol::class, 'rol_permiso', 'permiso_id', 'rol_id')->withTimestamps();
    }
}
