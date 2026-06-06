<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, \Laravel\Sanctum\HasApiTokens, SoftDeletes;

    // TODO: reactivar OwenIt\Auditing\Auditable cuando la tabla `audits` sea creada (sprint de auditoría)

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
        'es_admin_central',
        // Facial (columnas en DB, no usadas en código — sprint de biometría)
        'rostro_base64',
        'descriptor_facial',
        'rostro_registrado',
        'rostro_registrado_en',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'rostro_base64',
        'descriptor_facial',
    ];

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
            'es_admin_central' => 'boolean',
            'rostro_registrado' => 'boolean',
            'rostro_registrado_en' => 'datetime',
        ];
    }

    public function esAdminCentral(): bool
    {
        return (bool) $this->es_admin_central;
    }

    public function rol(): BelongsTo
    {
        return $this->belongsTo(Rol::class, 'rol_id');
    }

    public function getPermisos()
    {
        if (!$this->rol) {
            return collect();
        }

        return $this->rol->permisos->pluck('codigo');
    }

    public function hasRole(string $rolNombre): bool
    {
        return $this->rol && $this->rol->nombre === $rolNombre;
    }

    public function hasPermissionTo(string $codigo): bool
    {
        if ($this->es_admin_central) {
            return true;
        }
        return $this->getPermisos()->contains($codigo);
    }

    public function personal(): HasOne
    {
        return $this->hasOne(Personal::class, 'usuario_id');
    }
}
