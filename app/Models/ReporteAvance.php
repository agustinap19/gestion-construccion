<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReporteAvance extends Model
{
    use SoftDeletes;

    protected $table = 'reportes_avance';

    protected $fillable = [
        'proyecto_id',
        'vivienda_id',
        'presupuesto_item_proyecto_id',
        'tecnico_id',
        'porcentaje_avance',
        'porcentaje_anterior',
        'observacion',
        'foto_path',
        'foto_thumbnail_path',
        'coordenadas_gps',
        'fecha_reporte',
        'estado',
        'metadata',
    ];

    protected $casts = [
        'porcentaje_avance'  => 'decimal:2',
        'porcentaje_anterior' => 'decimal:2',
        'fecha_reporte'      => 'datetime',
        'metadata'           => 'array',
    ];

    public function proyecto(): BelongsTo
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function vivienda(): BelongsTo
    {
        return $this->belongsTo(Vivienda::class, 'vivienda_id');
    }

    public function pip(): BelongsTo
    {
        return $this->belongsTo(PresupuestoItemProyecto::class, 'presupuesto_item_proyecto_id');
    }

    public function tecnico(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tecnico_id');
    }

    public function scopeDelItem($query, int $pipId)
    {
        return $query->where('presupuesto_item_proyecto_id', $pipId);
    }

    public function scopeDeVivienda($query, int $viviendaId)
    {
        return $query->where('vivienda_id', $viviendaId);
    }
}
