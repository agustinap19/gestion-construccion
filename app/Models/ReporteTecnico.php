<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReporteTecnico extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'reportes_tecnicos';

    protected $fillable = [
        'proyecto_id',
        'vivienda_id',
        'fase_id',
        'usuario_id',
        'fecha_reporte',
        'descripcion',
        'observaciones',
        'latitud_tecnico',
        'longitud_tecnico',
        'distancia_vivienda_metros',
        'alerta_distancia',
        'estado',
    ];

    protected $casts = [
        'fecha_reporte'             => 'datetime',
        'latitud_tecnico'           => 'decimal:7',
        'longitud_tecnico'          => 'decimal:7',
        'distancia_vivienda_metros' => 'decimal:2',
        'alerta_distancia'          => 'boolean',
    ];

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function vivienda()
    {
        return $this->belongsTo(Vivienda::class, 'vivienda_id');
    }

    public function fase()
    {
        return $this->belongsTo(FaseProyecto::class, 'fase_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function fotos()
    {
        return $this->hasMany(FotoReporte::class, 'reporte_id')->orderBy('orden');
    }

    public function incidencias()
    {
        return $this->hasMany(IncidenciaReporte::class, 'reporte_id');
    }

    public function avancesChecklist()
    {
        return $this->hasMany(AvanceChecklistReporte::class, 'reporte_id');
    }

    public function scopeDelProyecto($query, int $proyectoId)
    {
        return $query->where('proyecto_id', $proyectoId);
    }

    public function scopeDeVivienda($query, int $viviendaId)
    {
        return $query->where('vivienda_id', $viviendaId);
    }

    public function scopeDeFase($query, int $faseId)
    {
        return $query->where('fase_id', $faseId);
    }
}
