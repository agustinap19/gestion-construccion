<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentoEmitido extends Model
{
    protected $table = 'documentos_emitidos';
    
    protected $fillable = [
        'hash',
        'tipo_reporte',
        'proyecto_id',
        'beneficiario_id',
        'usuario_emisor_id',
        'fecha_emision',
        'parametros_filtros'
    ];
    
    protected $casts = [
        'parametros_filtros' => 'array',
        'fecha_emision' => 'datetime'
    ];

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function beneficiario()
    {
        return $this->belongsTo(Beneficiario::class, 'beneficiario_id');
    }

    public function emisor()
    {
        return $this->belongsTo(User::class, 'usuario_emisor_id');
    }
}
