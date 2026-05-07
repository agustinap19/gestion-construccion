<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntentoAcceso extends Model
{
    use HasFactory;

    protected $table = 'intentos_acceso';

    protected $fillable = [
        'email',
        'usuario_id',
        'ip_address',
        'user_agent',
        'exitoso',
        'motivo_fallo',
        'pais',
        'ciudad',
        'fecha_intento',
    ];

    protected function casts(): array
    {
        return [
            'exitoso' => 'boolean',
            'fecha_intento' => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
