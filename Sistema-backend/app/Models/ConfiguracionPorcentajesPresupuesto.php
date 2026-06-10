<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConfiguracionPorcentajesPresupuesto extends Model
{
    protected $table = 'configuracion_porcentajes_presupuesto';

    protected $fillable = [
        'tipo_proyecto',
        'porcentaje_mano_obra',
        'porcentaje_gastos_generales',
        'porcentaje_utilidad_esperada',
        'umbral_rentabilidad_minima',
        'umbral_gg_minimo',
        'notas',
        'usuario_actualizador_id',
    ];

    protected $casts = [
        'porcentaje_mano_obra'         => 'decimal:2',
        'porcentaje_gastos_generales'  => 'decimal:2',
        'porcentaje_utilidad_esperada' => 'decimal:2',
        'umbral_rentabilidad_minima'   => 'decimal:2',
        'umbral_gg_minimo'             => 'decimal:2',
    ];

    public function usuarioActualizador()
    {
        return $this->belongsTo(User::class, 'usuario_actualizador_id');
    }

    public static function paraProyecto(string $tipo): self
    {
        return static::firstOrCreate(
            ['tipo_proyecto' => $tipo],
            [
                'porcentaje_mano_obra'         => $tipo === 'social' ? 30.00 : 28.00,
                'porcentaje_gastos_generales'  => $tipo === 'social' ? 12.00 : 10.00,
                'porcentaje_utilidad_esperada' => $tipo === 'social' ? 15.00 : 18.00,
                'umbral_rentabilidad_minima'   => 5.00,
            ]
        );
    }
}
