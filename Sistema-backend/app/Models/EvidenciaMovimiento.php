<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvidenciaMovimiento extends Model
{
    protected $table = 'evidencias_movimiento';

    protected $fillable = [
        'movimiento_almacen_id',
        'tipo',
        'archivo_url',
        'hash_validacion',
        'latitud',
        'longitud',
        'dispositivo',
        'usuario_captura_id',
        'fecha_captura',
    ];

    protected $casts = [
        'latitud'       => 'decimal:7',
        'longitud'      => 'decimal:7',
        'fecha_captura' => 'datetime',
    ];

    public function movimiento(): BelongsTo
    {
        return $this->belongsTo(MovimientoAlmacen::class, 'movimiento_almacen_id');
    }

    public function usuarioCaptura(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_captura_id');
    }
}
