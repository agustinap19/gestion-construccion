<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TipoActivo extends Model
{
    use HasFactory;

    protected $table = 'tipos_activo';

    protected $fillable = [
        'nombre', 'descripcion',
    ];

    public function activos(): HasMany
    {
        return $this->hasMany(Activo::class, 'tipo_activo_id');
    }
}
