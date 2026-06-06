<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OverrideRecetaProyecto extends Model
{
    use HasFactory;

    protected $table = 'overrides_recetas_proyecto';

    protected $fillable = [
        'presupuesto_item_proyecto_id', 'material_id',
        'cantidad_por_unidad_base', 'justificacion',
        'usuario_autorizador_id',
    ];

    protected $casts = [
        'cantidad_por_unidad_base' => 'decimal:4',
    ];

    public function presupuestoItem()
    {
        return $this->belongsTo(PresupuestoItemProyecto::class, 'presupuesto_item_proyecto_id');
    }

    public function material()
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    public function autorizador()
    {
        return $this->belongsTo(User::class, 'usuario_autorizador_id');
    }
}
