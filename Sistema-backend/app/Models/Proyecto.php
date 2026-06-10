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
        'prioridad',
        'tipo_obra',
        'cantidad_unidades',
        'cantidad_beneficiarios',
        'tipo_proyecto_id',
        'cliente_id',
        'entidad_estatal_id',
        'zona_id',
        'comunidad',
        'direccion_obra',
        'latitud',
        'longitud',
        'estado',
        'fecha_inicio_planificada',
        'fecha_fin_planificada',
        'fecha_inicio_real',
        'fecha_fin_real',
        'plazo_dias',
        // Financiero (legado — conservado para compatibilidad)
        'presupuesto_referencial',
        'monto_contrato',
        // Financiero rediseño
        'monto_contractual',
        'presupuesto_materiales',
        'sobreentregas_materiales',
        'alerta_gg_bajo',
        'porcentaje_mano_obra',
        'porcentaje_gastos_generales',
        'porcentaje_utilidad_esperada',
        'presupuesto_mano_obra',
        'presupuesto_gastos_generales',
        'presupuesto_utilidad_esperada',
        'usa_monto_fijo_mo',
        'usa_monto_fijo_gg',
        'usa_monto_fijo_util',
        'justificacion_rentabilidad_baja',
        'salud_financiera',
        'aplica_retencion_7_porciento',
        // Documentos
        'contrato_url',
        // Gestión
        'avance_fisico',
        'avance_financiero',
        'responsable_id',
        'creado_por_id',
        'observaciones',
        // Sub-fase F: cierre de registros
        'registros_beneficiarios_cerrados',
        'fecha_cierre_registros',
        'cerrado_registros_por_id',
    ];

    protected $appends = ['es_social'];

    protected $casts = [
        'presupuesto_referencial'           => 'decimal:2',
        'monto_contrato'                    => 'decimal:2',
        'monto_contractual'                 => 'decimal:2',
        'presupuesto_materiales'            => 'decimal:2',
        'sobreentregas_materiales'          => 'decimal:2',
        'alerta_gg_bajo'                    => 'boolean',
        'porcentaje_mano_obra'              => 'decimal:2',
        'porcentaje_gastos_generales'       => 'decimal:2',
        'porcentaje_utilidad_esperada'      => 'decimal:2',
        'presupuesto_mano_obra'             => 'decimal:2',
        'presupuesto_gastos_generales'      => 'decimal:2',
        'presupuesto_utilidad_esperada'     => 'decimal:2',
        'usa_monto_fijo_mo'                 => 'boolean',
        'usa_monto_fijo_gg'                 => 'boolean',
        'usa_monto_fijo_util'               => 'boolean',
        'aplica_retencion_7_porciento'      => 'boolean',
        'avance_fisico'                     => 'decimal:2',
        'avance_financiero'                 => 'decimal:2',
        'latitud'                           => 'decimal:7',
        'longitud'                          => 'decimal:7',
        'fecha_inicio_planificada'          => 'date',
        'fecha_fin_planificada'             => 'date',
        'fecha_inicio_real'                 => 'date',
        'fecha_fin_real'                    => 'date',
        'registros_beneficiarios_cerrados'  => 'boolean',
        'fecha_cierre_registros'            => 'datetime',
    ];

    // ── Máquina de estados ───────────────────────────────────────────────────
    public const TRANSICIONES_PERMITIDAS = [
        'formulacion'  => ['licitacion', 'cancelado'],
        'licitacion'   => ['adjudicado', 'cancelado'],
        'adjudicado'   => ['en_ejecucion', 'cancelado'],
        'en_ejecucion' => ['pausado', 'finalizado', 'cancelado'],
        'pausado'      => ['en_ejecucion', 'cancelado'],
        'finalizado'   => [],
        'cancelado'    => ['formulacion'],
    ];

    // ── Relaciones ───────────────────────────────────────────────────────────

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

    public function responsable()
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }

    public function creadoPor()
    {
        return $this->belongsTo(User::class, 'creado_por_id');
    }

    public function beneficiarios()
    {
        return $this->hasMany(Beneficiario::class, 'proyecto_id');
    }

    public function fasesProyecto()
    {
        return $this->hasMany(FaseProyecto::class, 'proyecto_id');
    }

    public function viviendas()
    {
        return $this->hasMany(Vivienda::class, 'proyecto_id');
    }

    public function almacen()
    {
        return $this->hasOne(Almacen::class, 'proyecto_id');
    }

    public function productosContractuales()
    {
        return $this->hasMany(ProductoContractual::class, 'proyecto_id')->orderBy('orden');
    }

    /** Hitos de cobro unificados (social + privado) */
    public function hitosCobro()
    {
        return $this->hasMany(HitoCobro::class, 'proyecto_id')->orderBy('orden');
    }

    public function hitos()
    {
        return $this->hasMany(Hito::class, 'proyecto_id');
    }

    public function modificatorios()
    {
        return $this->hasMany(Modificatorio::class, 'proyecto_id')->latest();
    }

    public function codigosReapertura()
    {
        return $this->hasMany(CodigoReapertura::class, 'proyecto_id');
    }

    public function cerradoRegistrosPor()
    {
        return $this->belongsTo(User::class, 'cerrado_registros_por_id');
    }

    // ── Accessors ────────────────────────────────────────────────────────────

    public function getPorcentajeAvanceAttribute(): float
    {
        return (float) $this->avance_fisico;
    }

    public function getEsSocialAttribute(): bool
    {
        return $this->categoria === 'social';
    }

    public function getEstaActivoAttribute(): bool
    {
        return in_array($this->estado, ['adjudicado', 'en_ejecucion', 'pausado']);
    }

    public function getEstaFinalizadoAttribute(): bool
    {
        return $this->estado === 'finalizado';
    }

    public function getEsCanceladoAttribute(): bool
    {
        return $this->estado === 'cancelado';
    }

    /**
     * Monto contractual efectivo.
     * Usa el nuevo campo; si es null, cae al legado.
     */
    public function getMontoContractualEfectivoAttribute(): float
    {
        return (float) ($this->monto_contractual
            ?? $this->monto_contrato
            ?? $this->presupuesto_referencial
            ?? 0);
    }

    /**
     * Total de costos operativos = Materiales + MO + GG
     */
    public function getTotalCostosOperativosAttribute(): float
    {
        return (float) ($this->presupuesto_materiales ?? 0)
            + (float) ($this->presupuesto_mano_obra ?? 0)
            + (float) ($this->presupuesto_gastos_generales ?? 0);
    }

    /**
     * Rentabilidad estimada = Contractual − (Materiales + MO + GG)
     * No persistida — calculada al vuelo.
     */
    public function getRentabilidadEstimadaAttribute(): float
    {
        return $this->monto_contractual_efectivo - $this->total_costos_operativos;
    }

    /**
     * Porcentaje de utilidad real = rentabilidad / contractual × 100
     */
    public function getPorcentajeUtilidadRealAttribute(): float
    {
        $contractual = $this->monto_contractual_efectivo;
        if ($contractual <= 0) {
            return 0.0;
        }
        return ($this->rentabilidad_estimada / $contractual) * 100;
    }

    /**
     * Estado de salud financiera.
     * Usa el valor persisted por ProyectoService cuando está disponible;
     * si no, lo calcula dinámicamente para proyectos legados/en-memoria.
     */
    public function getSaludFinancieraAttribute(): string
    {
        $stored = $this->attributes['salud_financiera'] ?? null;
        if ($stored !== null) return $stored;

        $utilReal     = $this->porcentaje_utilidad_real;
        $utilEsperada = (float) ($this->porcentaje_utilidad_esperada ?? 15.0);
        $umbralMin    = 5.0;

        if ($utilReal >= $utilEsperada * 0.9) return 'saludable';
        if ($utilReal >= $umbralMin) return 'atencion';
        return 'critico';
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActivos($query)
    {
        return $query->whereIn('estado', ['adjudicado', 'en_ejecucion', 'pausado']);
    }

    public function scopeEnEjecucion($query)
    {
        return $query->where('estado', 'en_ejecucion');
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

    /**
     * Recalcula los montos de MO, GG y Utilidad desde los porcentajes snapshot.
     * Llama a save() al finalizar.
     */
    public function recalcularComponentesFinancieros(): void
    {
        $contractual = $this->monto_contractual_efectivo;

        if (!$this->usa_monto_fijo_mo) {
            $this->presupuesto_mano_obra = $contractual * ((float) ($this->porcentaje_mano_obra ?? 0) / 100);
        }
        if (!$this->usa_monto_fijo_gg) {
            $this->presupuesto_gastos_generales = $contractual * ((float) ($this->porcentaje_gastos_generales ?? 0) / 100);
        }
        if (!$this->usa_monto_fijo_util) {
            $this->presupuesto_utilidad_esperada = $contractual * ((float) ($this->porcentaje_utilidad_esperada ?? 0) / 100);
        }

        $this->save();
    }
}
