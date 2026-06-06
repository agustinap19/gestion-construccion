<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vivienda extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'viviendas';

    protected $fillable = [
        'codigo',
        'proyecto_id',
        'beneficiario_id',
        'tipo_vivienda_id',
        'estado',
        'porcentaje_avance',
        'tiene_observaciones_activas',
        'latitud',
        'longitud',
        'observaciones',
        'usuario_creador_id',
    ];

    protected $casts = [
        'porcentaje_avance'           => 'decimal:2',
        'tiene_observaciones_activas' => 'boolean',
        'latitud'                     => 'decimal:7',
        'longitud'                    => 'decimal:7',
    ];

    // Avance asociado a cada estado. null = mantiene el porcentaje previo (con_observaciones).
    public const AVANCE_POR_ESTADO = [
        'planificada'       => 0,
        'terreno_preparado' => 10,
        'cimentacion'       => 25,
        'obra_gruesa'       => 50,
        'obra_fina'         => 75,
        'acabados'          => 90,
        'entregada'         => 100,
        'con_observaciones' => null,
    ];

    // Desde con_observaciones se puede regresar/avanzar a cualquier estado constructivo
    private const TRANSICIONES_PERMITIDAS = [
        'planificada'       => ['terreno_preparado', 'con_observaciones'],
        'terreno_preparado' => ['cimentacion', 'con_observaciones'],
        'cimentacion'       => ['obra_gruesa', 'con_observaciones'],
        'obra_gruesa'       => ['obra_fina', 'con_observaciones'],
        'obra_fina'         => ['acabados', 'con_observaciones'],
        'acabados'          => ['entregada', 'con_observaciones'],
        'entregada'         => [],
        'con_observaciones' => [
            'planificada', 'terreno_preparado', 'cimentacion',
            'obra_gruesa', 'obra_fina', 'acabados', 'entregada',
        ],
    ];

    // ── Relaciones ──────────────────────────────────────────────────────────

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function beneficiario()
    {
        return $this->belongsTo(Beneficiario::class, 'beneficiario_id');
    }

    public function tipoVivienda()
    {
        return $this->belongsTo(TipoVivienda::class, 'tipo_vivienda_id');
    }

    public function creador()
    {
        return $this->belongsTo(User::class, 'usuario_creador_id');
    }

    public function itemsChecklist()
    {
        return $this->hasMany(ItemChecklist::class, 'vivienda_id')->orderBy('orden');
    }

    // ── Accessors ────────────────────────────────────────────────────────────

    public function getTieneAvanceAttribute(): bool
    {
        return $this->porcentaje_avance > 0;
    }

    public function getTieneBeneficiarioAttribute(): bool
    {
        return $this->beneficiario_id !== null;
    }

    public function getEstaCompletadaAttribute(): bool
    {
        return $this->estado === 'entregada';
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeDelProyecto($query, int $proyectoId)
    {
        return $query->where('proyecto_id', $proyectoId);
    }

    public function scopePorEstado($query, string $estado)
    {
        return $query->where('estado', $estado);
    }

    public function scopeEntregadas($query)
    {
        return $query->where('estado', 'entregada');
    }

    public function scopeConObservaciones($query)
    {
        return $query->where('tiene_observaciones_activas', true);
    }

    public function scopeSinBeneficiario($query)
    {
        return $query->whereNull('beneficiario_id');
    }

    // ── Métodos de dominio ───────────────────────────────────────────────────

    public function puedeTransicionarA(string $nuevoEstado): bool
    {
        $permitidos = self::TRANSICIONES_PERMITIDAS[$this->estado] ?? [];
        return in_array($nuevoEstado, $permitidos);
    }

    public function getTransicionesPermitidas(): array
    {
        return self::TRANSICIONES_PERMITIDAS[$this->estado] ?? [];
    }

    /**
     * Retorna el porcentaje de avance correspondiente al estado dado.
     * Si es con_observaciones (null), devuelve el avance actual sin modificarlo.
     */
    public function calcularAvancePorEstado(string $estado): float
    {
        $avance = self::AVANCE_POR_ESTADO[$estado] ?? null;
        return $avance !== null ? (float) $avance : (float) $this->porcentaje_avance;
    }
}
