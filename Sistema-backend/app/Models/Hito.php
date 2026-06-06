<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Hito extends Model
{
    use HasFactory;

    protected $table = 'hitos';

    protected $fillable = [
        'proyecto_id',
        'fase_id',
        'nombre',
        'descripcion',
        'fecha_planificada',
        'fecha_cumplimiento',
        'tipo',
        'es_critico',
        'estado',
        'documento_url',
        'observaciones',
    ];

    protected $casts = [
        'fecha_planificada'  => 'date',
        'fecha_cumplimiento' => 'date',
        'es_critico'         => 'boolean',
    ];

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function fase()
    {
        return $this->belongsTo(FaseProyecto::class, 'fase_id');
    }
}
