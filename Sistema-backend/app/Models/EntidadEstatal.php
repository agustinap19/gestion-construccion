<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

// TODO: reactivar OwenIt\Auditing\Auditable cuando la tabla `audits` sea creada (sprint de auditoría)

class EntidadEstatal extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'entidades_estatales';

    protected $fillable = [
        'nombre',
        'sigla',
        'nivel',
        'nit',
        'direccion',
        'zona_id',
        'latitud',
        'longitud',
        'telefono_principal',
        'email_oficial',
        'sitio_web',
        'representante_legal',
        'cargo_representante',
        'tipo_proyectos_que_otorga',
        'estado',
        'notas',
        'usuario_creador_id'
    ];

    protected $casts = [
        'latitud' => 'decimal:7',
        'longitud' => 'decimal:7',
    ];

    // Relaciones
    public function zona()
    {
        return $this->belongsTo(ZonaGeografica::class, 'zona_id');
    }

    public function creador()
    {
        return $this->belongsTo(User::class, 'usuario_creador_id');
    }

    public function proyectos()
    {
        return $this->hasMany(Proyecto::class, 'entidad_estatal_id');
    }

    // Accessors
    public function getNombreCompletoAttribute()
    {
        if (!empty($this->sigla)) {
            return $this->nombre . ' (' . $this->sigla . ')';
        }
        return $this->nombre;
    }

    // Scopes
    public function scopeActivas($query)
    {
        return $query->where('estado', 'activa');
    }

    public function scopePorNivel($query, $nivel)
    {
        return $query->where('nivel', $nivel);
    }
}
