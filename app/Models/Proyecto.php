<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Proyecto extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'proyectos';

    protected $fillable = [
        'codigo',
        'nombre',
        'descripcion',
        'categoria',
        'estado',
        'prioridad',
        'tipo_proyecto_id',
        'cliente_id',
        'entidad_estatal_id',
        'zona_id',
        'administrador_id',
        'usuario_creador_id',
        'presupuesto_total',
        'monto_garantia',
        'porcentaje_avance',
        'cantidad_unidades',
        'duracion_dias_planificada',
        'fecha_inicio_planificada',
        'fecha_fin_planificada',
        'fecha_inicio_real',
        'fecha_fin_real',
        'direccion_obra',
        'latitud',
        'longitud',
        'observaciones',
    ];

    protected $casts = [
        'presupuesto_total'        => 'decimal:2',
        'monto_garantia'           => 'decimal:2',
        'porcentaje_avance'        => 'decimal:2',
        'latitud'                  => 'decimal:7',
        'longitud'                 => 'decimal:7',
        'cantidad_unidades'        => 'integer',
        'duracion_dias_planificada' => 'integer',
        'fecha_inicio_planificada' => 'date',
        'fecha_fin_planificada'    => 'date',
        'fecha_inicio_real'        => 'date',
        'fecha_fin_real'           => 'date',
    ];

    // ── Máquina de estados ──────────────────────────────────────────────────
    // Regla 8: Matriz de transiciones permitidas
    public const TRANSICIONES_PERMITIDAS = [
        'borrador'     => ['planificacion', 'cancelado'],
        'planificacion' => ['en_ejecucion', 'pausado', 'cancelado'],
        'en_ejecucion' => ['pausado', 'finalizado', 'cancelado'],
        'pausado'      => ['en_ejecucion', 'cancelado'],
        'finalizado'   => [],                           // Estado final
        'cancelado'    => ['planificacion'],             // Solo gerente, con razón
    ];

    // ── Relaciones ──────────────────────────────────────────────────────────

    public function tipoProyecto()
    {
        return $this->belongsTo(TipoProyecto::class, 'tipo_proyecto_id');
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    public function entidadEstatal()
    {
        return $this->belongsTo(EntidadEstatal::class, 'entidad_estatal_id');
    }

    public function zona()
    {
        return $this->belongsTo(ZonaGeografica::class, 'zona_id');
    }

    public function administrador()
    {
        return $this->belongsTo(User::class, 'administrador_id');
    }

    public function creador()
    {
        return $this->belongsTo(User::class, 'usuario_creador_id');
    }

    public function beneficiarios()
    {
        return $this->hasMany(Beneficiario::class, 'proyecto_id');
    }

    public function viviendas()
    {
        return $this->hasMany(Vivienda::class, 'proyecto_id');
    }

    public function fasesProyecto()
    {
        return $this->hasMany(FaseProyecto::class, 'proyecto_id');
    }

    public function asignacionesPersonal()
    {
        return $this->hasMany(AsignacionPersonal::class, 'proyecto_id');
    }

    public function visitasDomiciliarias()
    {
        return $this->hasMany(VisitaDomiciliaria::class, 'proyecto_id');
    }

    // ── Accessors ────────────────────────────────────────────────────────────

    public function getEsSocialAttribute(): bool
    {
        return $this->categoria === 'social';
    }

    public function getEsPrivadoAttribute(): bool
    {
        return $this->categoria === 'privado';
    }

    public function getEstaActivoAttribute(): bool
    {
        return in_array($this->estado, ['planificacion', 'en_ejecucion', 'pausado']);
    }

    public function getEstaFinalizadoAttribute(): bool
    {
        return $this->estado === 'finalizado';
    }

    public function getEsCanceladoAttribute(): bool
    {
        return $this->estado === 'cancelado';
    }

    public function getNombreContraparteAttribute(): ?string
    {
        if ($this->es_social && $this->entidadEstatal) {
            return $this->entidadEstatal->nombre;
        } elseif ($this->es_privado && $this->cliente) {
            return $this->cliente->nombre_visible;
        }
        return null;
    }

    /**
     * Duración real en días (si tiene fechas reales).
     */
    public function getDuracionRealDiasAttribute(): ?int
    {
        if ($this->fecha_inicio_real && $this->fecha_fin_real) {
            return $this->fecha_inicio_real->diffInDays($this->fecha_fin_real);
        }
        return null;
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeSociales($query)
    {
        return $query->where('categoria', 'social');
    }

    public function scopePrivados($query)
    {
        return $query->where('categoria', 'privado');
    }

    public function scopeActivos($query)
    {
        return $query->whereIn('estado', ['planificacion', 'en_ejecucion', 'pausado']);
    }

    public function scopeEnEjecucion($query)
    {
        return $query->where('estado', 'en_ejecucion');
    }

    public function scopePorCategoria($query, string $categoria)
    {
        return $query->where('categoria', $categoria);
    }

    public function scopePorEstado($query, string $estado)
    {
        return $query->where('estado', $estado);
    }

    public function scopeBuscar($query, string $termino)
    {
        $term = '%' . $termino . '%';
        return $query->where(function ($q) use ($term) {
            $q->where('codigo', 'LIKE', $term)
              ->orWhere('nombre', 'LIKE', $term)
              ->orWhere('direccion_obra', 'LIKE', $term);
        });
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
