<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogExportacion extends Model
{
    protected $table = 'logs_exportacion';

    protected $fillable = [
        'usuario_id',
        'recurso',
        'formato',
        'nombre_archivo',
        'parametros',
        'ip',
        'filas',
    ];

    protected $casts = [
        'parametros' => 'array',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
