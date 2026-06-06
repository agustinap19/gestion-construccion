<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AvanceChecklistReporte extends Model
{
    use HasFactory;

    protected $table = 'avances_checklist_reporte';

    protected $fillable = [
        'reporte_id',
        'item_checklist_id',
        'porcentaje_anterior',
        'porcentaje_nuevo',
        'notas',
    ];

    protected $casts = [
        'porcentaje_anterior' => 'decimal:2',
        'porcentaje_nuevo'    => 'decimal:2',
    ];

    public function reporte()
    {
        return $this->belongsTo(ReporteTecnico::class, 'reporte_id');
    }

    public function itemChecklist()
    {
        return $this->belongsTo(ItemChecklist::class, 'item_checklist_id');
    }
}
