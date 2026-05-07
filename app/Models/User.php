<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, \Laravel\Sanctum\HasApiTokens, SoftDeletes;

    protected $table = 'usuarios';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'ci',
        'ci_complemento',
        'email',
        'password',
        'telefono',
        'fecha_nacimiento',
        'direccion',
        'foto_url',
        'rol_id',
        'estado',
        'ultimo_acceso',
        'debe_cambiar_password',
        'password_cambiado_en',
        'intentos_fallidos',
        'bloqueado_hasta',
        'rostro_base64',
        'descriptor_facial',
        'rostro_registrado',
        'rostro_registrado_en',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'ultimo_acceso' => 'datetime',
            'fecha_nacimiento' => 'date',
            'password' => 'hashed',
            'password_cambiado_en' => 'datetime',
            'bloqueado_hasta' => 'datetime',
            'intentos_fallidos' => 'integer',
            'debe_cambiar_password' => 'boolean',
            'descriptor_facial' => 'array',
            'rostro_registrado' => 'boolean',
            'rostro_registrado_en' => 'datetime',
        ];
    }

    /**
     * Get the rol associated with the user.
     */
    public function rol(): BelongsTo
    {
        return $this->belongsTo(Rol::class, 'rol_id');
    }

    /**
     * Get user permissions via role
     */
    public function getPermisos()
    {
        if (!$this->rol) {
            return collect();
        }
        
        return $this->rol->permisos->pluck('codigo');
    }
}
