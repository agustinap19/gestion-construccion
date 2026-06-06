<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FotoReporte extends Model
{
    use HasFactory;

    protected $table = 'fotos_reporte';

    protected $fillable = [
        'reporte_id',
        'url_original',
        'url_thumbnail',
        'caption',
        'orden',
        'latitud',
        'longitud',
    ];

    protected $casts = [
        'latitud'  => 'decimal:7',
        'longitud' => 'decimal:7',
        'orden'    => 'integer',
    ];

    public function reporte()
    {
        return $this->belongsTo(ReporteTecnico::class, 'reporte_id');
    }
}
