<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\HitoCobro;

class PresupuestoItemProyecto extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Observer: snapshot de receta al crear cualquier PIP.
     * Protege el proyecto de cambios futuros en la Biblioteca Constructiva.
     * firstOrCreate garantiza idempotencia — seguro en creaciones masivas.
     */
    protected static function booted(): void
    {
        static::created(function (self $pip) {
            $recetas = RecetaItem::where('item_constructivo_id', $pip->item_constructivo_id)->get();
            foreach ($recetas as $r) {
                OverrideItemProyecto::firstOrCreate(
                    [
                        'proyecto_id'          => $pip->proyecto_id,
                        'item_constructivo_id' => $pip->item_constructivo_id,
                        'material_id'          => $r->material_id,
                        'vivienda_id'          => null,
                    ],
                    [
                        'cantidad_por_unidad_base' => $r->cantidad_por_unidad_base,
                        'nivel'                    => 'tipologia',
                        'justificacion'            => 'Snapshot automático al crear PIP.',
                        'usuario_autorizador_id'   => auth()->id(),
                    ]
                );
            }
        });
    }

    protected $table = 'presupuesto_items_proyecto';

    protected $fillable = [
        'proyecto_id', 'vivienda_id', 'item_constructivo_id',
        'cantidad_planificada', 'producto_contractual_id', 'hito_cobro_id', 'fase_id',
        'orden', 'ponderacion_avance', 'estado_ejecucion',
        'porcentaje_avance', 'tiene_override_receta', 'metadata',
    ];

    protected $casts = [
        'cantidad_planificada'  => 'decimal:4',
        'ponderacion_avance'    => 'decimal:4',
        'porcentaje_avance'     => 'decimal:2',
        'tiene_override_receta' => 'boolean',
        'metadata'              => 'array',
    ];

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function vivienda()
    {
        return $this->belongsTo(Vivienda::class, 'vivienda_id');
    }

    public function itemConstructivo()
    {
        return $this->belongsTo(ItemConstructivo::class, 'item_constructivo_id');
    }

    public function productoContractual()
    {
        return $this->belongsTo(ProductoContractual::class, 'producto_contractual_id');
    }

    public function hitoCobro()
    {
        return $this->belongsTo(HitoCobro::class, 'hito_cobro_id');
    }

    public function fase()
    {
        return $this->belongsTo(FaseProyecto::class, 'fase_id');
    }

    public function overrides()
    {
        return $this->hasMany(OverrideRecetaProyecto::class, 'presupuesto_item_proyecto_id');
    }

    public function scopePorProyecto($query, int $proyectoId)
    {
        return $query->where('proyecto_id', $proyectoId);
    }

    public function scopePorVivienda($query, int $viviendaId)
    {
        return $query->where('vivienda_id', $viviendaId);
    }

    public function scopeObrasComunes($query)
    {
        return $query->whereNull('vivienda_id');
    }
}
