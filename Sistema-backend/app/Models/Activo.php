<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Builder;

class Activo extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'activos';

    protected $fillable = [
        'codigo', 'nombre', 'tipo', 'tipo_activo_id', 'descripcion',
        'marca', 'modelo', 'serie', 'anio_fabricacion',
        'costo_dia_uso', 'horas_uso_acumuladas', 'horas_mantenimiento_cada',
        'estado', 'propiedad', 'fecha_adquisicion', 'valor_adquisicion',
        'valor_actual', 'vida_util_anios', 'metodo_depreciacion', 'tasa_depreciacion',
        'almacen_id', 'responsable_id', 'foto_url', 'notas', 'created_by',
    ];

    protected $appends = ['porcentaje_hasta_mantenimiento'];

    protected $casts = [
        'deleted_at'               => 'datetime',
        'fecha_adquisicion'        => 'date',
        'costo_dia_uso'            => 'decimal:2',
        'horas_uso_acumuladas'     => 'decimal:2',
        'horas_mantenimiento_cada' => 'decimal:2',
        'valor_adquisicion'        => 'decimal:2',
        'valor_actual'             => 'decimal:2',
        'tasa_depreciacion'        => 'decimal:2',
    ];

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function tipoActivo(): BelongsTo
    {
        return $this->belongsTo(TipoActivo::class, 'tipo_activo_id');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'responsable_id');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function asignaciones(): HasMany
    {
        return $this->hasMany(AsignacionActivo::class, 'activo_id');
    }

    public function mantenimientos(): HasMany
    {
        return $this->hasMany(MantenimientoActivo::class, 'activo_id');
    }

    public function planesOptimizacion(): HasMany
    {
        return $this->hasMany(PlanOptimizacion::class, 'activo_id');
    }

    public function actasEntrega(): HasMany
    {
        return $this->hasMany(ActaEntregaActivo::class, 'activo_id');
    }

    public function depreciaciones(): HasMany
    {
        return $this->hasMany(DepreciacionActivo::class, 'activo_id');
    }

    public function seguros(): HasMany
    {
        return $this->hasMany(SeguroActivo::class, 'activo_id');
    }

    protected function porcentajeHastaMantenimiento(): Attribute
    {
        return Attribute::get(function () {
            if ((float) $this->horas_mantenimiento_cada <= 0) {
                return 0;
            }

            $porcentaje = ((float) $this->horas_uso_acumuladas / (float) $this->horas_mantenimiento_cada) * 100;

            return min(round($porcentaje, 2), 100);
        });
    }

    public function necesitaMantenimiento(): bool
    {
        return (float) $this->horas_uso_acumuladas >= (float) $this->horas_mantenimiento_cada;
    }

    public function scopeDisponibles(Builder $query): Builder
    {
        return $query->where('estado', 'disponible')
            ->whereDoesntHave('mantenimientos', function (Builder $q) {
                $q->where('estado', 'vencido');
            });
    }
}
