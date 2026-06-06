<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Modificatorio extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'modificatorios_proyecto';

    protected $fillable = [
        'proyecto_id',
        'tipo',
        'subtipo',
        'estado',
        'motivo',
        'justificacion',
        'justificativo_legal',
        'monto_original',
        'monto_nuevo',
        'delta_monto',
        'plazo_original_dias',
        'dias_ampliacion',
        'plazo_nuevo_dias',
        'fecha_fin_original',
        'fecha_fin_nueva',
        'numero',
        'creado_por_id',
        'aprobado_por_id',
        'rechazado_por_id',
        'aplicado_por_id',
        'fecha_aprobacion',
        'fecha_rechazo',
        'fecha_aplicacion',
        'razon_rechazo',
        'documento_url',
    ];

    protected function casts(): array
    {
        return [
            'monto_original'       => 'decimal:2',
            'monto_nuevo'          => 'decimal:2',
            'delta_monto'          => 'decimal:2',
            'plazo_original_dias'  => 'integer',
            'dias_ampliacion'      => 'integer',
            'plazo_nuevo_dias'     => 'integer',
            'fecha_fin_original'   => 'date',
            'fecha_fin_nueva'      => 'date',
            'fecha_aprobacion'     => 'datetime',
            'fecha_rechazo'        => 'datetime',
            'fecha_aplicacion'     => 'datetime',
        ];
    }

    // ── Estados ───────────────────────────────────────────────────────────────
    public const ESTADOS = ['borrador', 'pendiente_aprobacion', 'aprobado', 'rechazado', 'aplicado'];

    public function esBorrador(): bool        { return $this->estado === 'borrador'; }
    public function esPendiente(): bool       { return $this->estado === 'pendiente_aprobacion'; }
    public function estaAprobado(): bool      { return $this->estado === 'aprobado'; }
    public function estaRechazado(): bool     { return $this->estado === 'rechazado'; }
    public function estaAplicado(): bool      { return $this->estado === 'aplicado'; }

    // ── Relaciones ────────────────────────────────────────────────────────────

    public function proyecto(): BelongsTo
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creado_por_id');
    }

    public function aprobadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprobado_por_id');
    }

    public function rechazadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rechazado_por_id');
    }

    public function aplicadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aplicado_por_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ItemModificatorio::class, 'modificatorio_id');
    }

    // ── Métodos de dominio ───────────────────────────────────────────────────

    /** Suma algebraica de todos los deltas de ítems; debe ser 0 para tipo=monto */
    public function calcularDeltaTotal(): float
    {
        return (float) $this->items()->sum('delta_monto');
    }

    public function esSumaZero(): bool
    {
        return abs($this->calcularDeltaTotal()) < 0.01;
    }
}
