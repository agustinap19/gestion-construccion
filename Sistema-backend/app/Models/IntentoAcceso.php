<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IntentoAcceso extends Model
{
    protected $table = 'intentos_acceso';

    public $timestamps = false;

    protected $fillable = [
        'email',
        'ip_address',
        'user_agent',
        'exitoso',
        'motivo',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'exitoso' => 'boolean',
            'created_at' => 'datetime',
        ];
    }
}
