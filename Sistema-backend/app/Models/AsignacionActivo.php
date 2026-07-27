<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AsignacionActivo extends Model
{
    use HasFactory;

    protected $table = 'asignaciones_activo';

    protected $fillable = [
        'activo_id', 'proyecto_id', 'vivienda_id', 'personal_id',
        'fecha_inicio', 'fecha_fin_estimada', 'fecha_fin_real',
        'horas_dia_estimadas', 'horas_reales_acumuladas', 'costo_total_real',
        'estado', 'condicion_entrega', 'condicion_devolucion', 'notas', 'created_by',
    ];

    protected $casts = [
        'fecha_inicio'             => 'date',
        'fecha_fin_estimada'       => 'date',
        'fecha_fin_real'           => 'date',
        'horas_dia_estimadas'      => 'decimal:1',
        'horas_reales_acumuladas'  => 'decimal:2',
        'costo_total_real'         => 'decimal:2',
    ];

    public function activo(): BelongsTo
    {
        return $this->belongsTo(Activo::class, 'activo_id');
    }

    public function proyecto(): BelongsTo
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function vivienda(): BelongsTo
    {
        return $this->belongsTo(Vivienda::class, 'vivienda_id');
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'personal_id');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function actasEntrega(): HasMany
    {
        return $this->hasMany(ActaEntregaActivo::class, 'asignacion_activo_id');
    }
}
