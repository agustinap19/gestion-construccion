<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IncidenciaReporte extends Model
{
    use HasFactory;

    protected $table = 'incidencias_reporte';

    protected $fillable = [
        'reporte_id',
        'tipo',
        'gravedad',
        'descripcion',
    ];

    public function reporte()
    {
        return $this->belongsTo(ReporteTecnico::class, 'reporte_id');
    }
}
