<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MovimientoMaterial extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'movimientos_material';

    protected $fillable = [
        'movimiento_almacen_id',
        'almacen_id',
        'material_id',
        'tipo',
        'cantidad',
        'precio_unitario',
        'costo_total',
        'saldo_anterior',
        'saldo_posterior',
        'costo_promedio_resultante',
        'concepto',
        'referencia_tipo',
        'referencia_id',
        'registrado_por_id',
        'fecha_movimiento',
    ];

    protected $casts = [
        'cantidad'                  => 'decimal:4',
        'precio_unitario'           => 'decimal:4',
        'costo_total'               => 'decimal:4',
        'saldo_anterior'            => 'decimal:4',
        'saldo_posterior'           => 'decimal:4',
        'costo_promedio_resultante' => 'decimal:4',
        'fecha_movimiento'          => 'datetime',
    ];

    const TIPOS_ENTRADA = ['entrada', 'transferencia_entrada', 'ajuste_positivo', 'inventario_inicial'];
    const TIPOS_SALIDA  = ['salida', 'transferencia_salida', 'ajuste_negativo'];

    public function almacen()
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function material()
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    public function registradoPor()
    {
        return $this->belongsTo(User::class, 'registrado_por_id');
    }

    public function movimientoAlmacen()
    {
        return $this->belongsTo(MovimientoAlmacen::class, 'movimiento_almacen_id');
    }

    public function esEntrada(): bool
    {
        return in_array($this->tipo, self::TIPOS_ENTRADA);
    }
}
