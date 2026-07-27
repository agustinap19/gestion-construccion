<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActaEntregaActivo extends Model
{
    use HasFactory;

    protected $table = 'actas_entrega_activo';

    public const TRANSICIONES_PERMITIDAS = [
        'generada'       => ['impresa'],
        'impresa'        => ['firmada_subida'],
        'firmada_subida' => ['aprobada', 'impresa'],
        'aprobada'       => ['entregada'],
        'entregada'      => ['devuelta'],
        'devuelta'       => [],
    ];

    protected $fillable = [
        'asignacion_activo_id', 'vivienda_id', 'beneficiario_id', 'activo_id',
        'numero_acta', 'fecha_entrega_estimada', 'fecha_devolucion_estimada',
        'fecha_entrega_real', 'fecha_devolucion_real', 'estado',
        'pdf_generado_url', 'pdf_firmado_url', 'foto_entrega_url', 'foto_devolucion_url',
        'estado_devolucion', 'observaciones', 'nota_rechazo', 'aprobado_por', 'created_by',
        'entrega_registrada_por', 'devolucion_registrada_por',
    ];

    protected $casts = [
        'fecha_entrega_estimada'    => 'date',
        'fecha_devolucion_estimada' => 'date',
        'fecha_entrega_real'        => 'date',
        'fecha_devolucion_real'     => 'date',
    ];

    public function asignacion(): BelongsTo
    {
        return $this->belongsTo(AsignacionActivo::class, 'asignacion_activo_id');
    }

    public function vivienda(): BelongsTo
    {
        return $this->belongsTo(Vivienda::class, 'vivienda_id');
    }

    public function beneficiario(): BelongsTo
    {
        return $this->belongsTo(Beneficiario::class, 'beneficiario_id');
    }

    public function activo(): BelongsTo
    {
        return $this->belongsTo(Activo::class, 'activo_id');
    }

    public function aprobadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprobado_por');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function entregaRegistradaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'entrega_registrada_por');
    }

    public function devolucionRegistradaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'devolucion_registrada_por');
    }

    public function getNumeroActaFormateadoAttribute(): string
    {
        if (preg_match('/-(\d+)$/', $this->numero_acta, $m)) {
            $prefijo = substr($this->numero_acta, 0, -strlen($m[1]));
            return $prefijo . str_pad($m[1], 3, '0', STR_PAD_LEFT);
        }

        return $this->numero_acta;
    }

    public function puedeTransicionarA(string $nuevoEstado): bool
    {
        $permitidos = self::TRANSICIONES_PERMITIDAS[$this->estado] ?? [];
        return in_array($nuevoEstado, $permitidos, true);
    }
}
