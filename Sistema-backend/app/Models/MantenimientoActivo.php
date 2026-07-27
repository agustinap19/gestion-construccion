<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MantenimientoActivo extends Model
{
    use HasFactory;

    protected $table = 'mantenimientos_activo';

    protected $fillable = [
        'activo_id', 'tipo', 'fecha_programada', 'fecha_realizada',
        'descripcion', 'costo', 'proveedor_servicio', 'numero_orden_trabajo',
        'horas_al_momento', 'estado', 'realizado_por', 'created_by',
    ];

    protected $casts = [
        'fecha_programada'  => 'date',
        'fecha_realizada'   => 'date',
        'costo'             => 'decimal:2',
        'horas_al_momento'  => 'decimal:2',
    ];

    protected static function boot()
    {
        parent::boot();

        static::updated(function (MantenimientoActivo $mantenimiento) {
            if ($mantenimiento->wasChanged('estado') && $mantenimiento->estado === 'completado') {
                $mantenimiento->activo()->update([
                    'horas_uso_acumuladas' => 0,
                    'estado'               => 'disponible',
                ]);
            }
        });
    }

    public function activo(): BelongsTo
    {
        return $this->belongsTo(Activo::class, 'activo_id');
    }

    public function realizadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'realizado_por');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
