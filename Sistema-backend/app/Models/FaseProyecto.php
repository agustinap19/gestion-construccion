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
        'proyecto_id',
        'nombre',
        'descripcion',
        'orden',
        'fecha_inicio_planificada',
        'fecha_fin_planificada',
        'fecha_inicio_real',
        'fecha_fin_real',
        'avance_porcentaje',
        'estado',
        'fase_prerrequisito_id',
        'observaciones',
    ];

    protected $casts = [
        'avance_porcentaje'        => 'decimal:2',
        'orden'                    => 'integer',
        'fecha_inicio_planificada' => 'date',
        'fecha_fin_planificada'    => 'date',
        'fecha_inicio_real'        => 'date',
        'fecha_fin_real'           => 'date',
    ];

    // Estados: pendiente / en_progreso / completada / suspendida
    private const TRANSICIONES_PERMITIDAS = [
        'pendiente'   => ['en_progreso'],
        'en_progreso' => ['completada', 'suspendida'],
        'suspendida'  => ['en_progreso'],
        'completada'  => [],
    ];

    // ── Relaciones ──────────────────────────────────────────────────────────

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function fasePrerrequisito()
    {
        return $this->belongsTo(FaseProyecto::class, 'fase_prerrequisito_id');
    }

    public function fasesDependientes()
    {
        return $this->hasMany(FaseProyecto::class, 'fase_prerrequisito_id');
    }

    public function itemsChecklist()
    {
        return $this->hasMany(ItemChecklist::class, 'fase_id')->orderBy('orden');
    }

    // ── Accessors ────────────────────────────────────────────────────────────

    public function getEstaCompletadaAttribute(): bool
    {
        return $this->estado === 'completada';
    }

    public function getEstaActivaAttribute(): bool
    {
        return in_array($this->estado, ['en_progreso', 'suspendida']);
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
        return $query->whereIn('estado', ['en_progreso', 'suspendida']);
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
