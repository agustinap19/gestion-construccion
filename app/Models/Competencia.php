<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Competencia extends Model
{
    use HasFactory;

    protected $table = 'competencias';

    protected $fillable = [
        'nombre', 'descripcion', 'tipo', 'requiere_renovacion', 'vigencia_meses'
    ];

    protected $casts = [
        'requiere_renovacion' => 'boolean',
        'vigencia_meses' => 'integer',
    ];

    public function personal(): BelongsToMany
    {
        return $this->belongsToMany(Personal::class, 'personal_competencia', 'competencia_id', 'personal_id')
                    ->withPivot(['id', 'fecha_emision', 'fecha_vencimiento', 'entidad_emisora', 'numero_certificado', 'archivo_url', 'estado'])
                    ->withTimestamps();
    }
}
