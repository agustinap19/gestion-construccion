<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PresupuestoMaterialProyecto extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'presupuesto_material_proyecto';

    protected $fillable = [
        'proyecto_id',
        'material_id',
        'cantidad_total_planificada',
        'precio_unitario_presupuestado',
        'notas',
        'registrado_por_id',
        // Trazabilidad cacheada — gestionada exclusivamente por TrazabilidadMaterialesService
        'cantidad_comprada',
        'cantidad_en_almacen_proyecto',
        'cantidad_devuelta_central',
        'cantidad_entregada_obra',
        'cantidad_merma',
        'cantidad_retrabajo',
        'desfase_contable',
        'identidad_contable_ok',
        // Control
        'bloqueado',
        'bloqueado_por_id',
        'bloqueado_en',
    ];

    protected $casts = [
        'cantidad_total_planificada'    => 'decimal:4',
        'precio_unitario_presupuestado' => 'decimal:4',
        'monto_total'                   => 'decimal:4',
        'cantidad_comprada'             => 'decimal:4',
        'cantidad_en_almacen_proyecto'  => 'decimal:4',
        'cantidad_devuelta_central'     => 'decimal:4',
        'cantidad_entregada_obra'       => 'decimal:4',
        'cantidad_merma'                => 'decimal:4',
        'cantidad_retrabajo'            => 'decimal:4',
        'desfase_contable'              => 'decimal:4',
        'identidad_contable_ok'         => 'boolean',
        'bloqueado'                     => 'boolean',
        'bloqueado_en'                  => 'datetime',
    ];

    // ── Relaciones ───────────────────────────────────────────────────────────────

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function material()
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    public function distribuciones()
    {
        return $this->hasMany(PresupuestoMaterialDistribucion::class, 'presupuesto_material_id');
    }

    public function registradoPor()
    {
        return $this->belongsTo(User::class, 'registrado_por_id');
    }

    // ── Helpers de dominio ────────────────────────────────────────────────────────

    /**
     * Verifica la identidad contable en memoria (sin hit a BD).
     * Comprado = EnAlmacén + DevueltoCentral + Entregado + Merma + Retrabajo
     */
    public function identidadContableValida(): bool
    {
        $sumaSalidas = (float) $this->cantidad_en_almacen_proyecto
                     + (float) $this->cantidad_devuelta_central
                     + (float) $this->cantidad_entregada_obra
                     + (float) $this->cantidad_merma
                     + (float) $this->cantidad_retrabajo;

        return abs((float) $this->cantidad_comprada - $sumaSalidas) < 0.001;
    }
}
