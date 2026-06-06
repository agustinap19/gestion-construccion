<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Builder;

class Rol extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'roles';

    protected $fillable = [
        'nombre',
        'nombre_visible',
        'descripcion',
        'es_sistema',
        'estado',
    ];

    protected $casts = [
        'es_sistema' => 'boolean',
    ];

    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('estado', 'activo');
    }

    public function scopeDelSistema(Builder $query): Builder
    {
        return $query->where('es_sistema', true);
    }

    public function scopePersonalizados(Builder $query): Builder
    {
        return $query->where('es_sistema', false);
    }

    public function getCantidadUsuariosAttribute(): int
    {
        return $this->usuarios_count ?? $this->usuarios()->count();
    }

    public function usuarios(): HasMany
    {
        return $this->hasMany(User::class, 'rol_id');
    }

    public function permisos(): BelongsToMany
    {
        return $this->belongsToMany(Permiso::class, 'rol_permiso', 'rol_id', 'permiso_id')->withTimestamps();
    }
}
