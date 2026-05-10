<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FaseProyecto extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'fases_proyecto';

    protected $fillable = [
        'codigo',
        'proyecto_id',
        'nombre',
        'descripcion',
        'orden',
        'fase_prerrequisito_id',
        'peso_porcentual',
        'estado',
        'porcentaje_avance_interno',
        'fecha_inicio_planificada',
        'fecha_fin_planificada',
        'fecha_inicio_real',
        'fecha_fin_real',
        'observaciones',
        'usuario_creador_id',
    ];

    protected $casts = [
        'peso_porcentual'          => 'decimal:2',
        'porcentaje_avance_interno' => 'decimal:2',
        'orden'                    => 'integer',
        'fecha_inicio_planificada' => 'date',
        'fecha_fin_planificada'    => 'date',
        'fecha_inicio_real'        => 'date',
        'fecha_fin_real'           => 'date',
    ];

    private const TRANSICIONES_PERMITIDAS = [
        'pendiente'  => ['en_proceso', 'cancelada'],
        'en_proceso' => ['completada', 'pausada', 'cancelada'],
        'pausada'    => ['en_proceso', 'cancelada'],
        'completada' => [],
        'cancelada'  => [],
    ];

    // ── Relaciones ──────────────────────────────────────────────────────────

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    // La fase que debe terminar antes de que esta pueda iniciar
    public function fasePrerrequisito()
    {
        return $this->belongsTo(FaseProyecto::class, 'fase_prerrequisito_id');
    }

    // Fases que dependen de esta para poder iniciar
    public function fasesDependientes()
    {
        return $this->hasMany(FaseProyecto::class, 'fase_prerrequisito_id');
    }

    public function creador()
    {
        return $this->belongsTo(User::class, 'usuario_creador_id');
    }

    // ── Accessors ────────────────────────────────────────────────────────────

    public function getContribucionAlAvanceAttribute(): float
    {
        return round((float) $this->peso_porcentual * (float) $this->porcentaje_avance_interno / 100, 4);
    }

    public function getEstaCompletadaAttribute(): bool
    {
        return $this->estado === 'completada';
    }

    public function getEstaActivaAttribute(): bool
    {
        return in_array($this->estado, ['en_proceso', 'pausada']);
    }

    public function getPrerrequisitoCumplidoAttribute(): bool
    {
        if ($this->fase_prerrequisito_id === null) {
            return true;
        }
        return $this->fasePrerrequisito && $this->fasePrerrequisito->estado === 'completada';
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

    public function scopeOrdenadas($query)
    {
        return $query->orderBy('orden', 'asc');
    }

    public function scopeActivas($query)
    {
        return $query->whereIn('estado', ['en_proceso', 'pausada']);
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
}
