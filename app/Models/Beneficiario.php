<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Exceptions\Beneficiarios\TransicionEstadoNoPermitidaException;

class Beneficiario extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'beneficiarios';

    protected $fillable = [
        'codigo_beneficiario',
        'proyecto_id',
        'usuario_registrador_id',
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'ci',
        'ci_complemento',
        'fecha_nacimiento',
        'estado_civil',
        'genero',
        'telefono_principal',
        'telefono_alternativo',
        'email',
        'cantidad_familiares',
        'personas_dependientes',
        'ingreso_mensual_familiar',
        'direccion_actual',
        'direccion_terreno',
        'latitud_terreno',
        'longitud_terreno',
        'foto_titular_url',
        'documento_propiedad_terreno_url',
        'estado_seleccion',
        'fecha_aceptacion',
        'fecha_entrega_vivienda',
        'tipo_vivienda_id',
        'observaciones'
    ];

    protected $casts = [
        'fecha_nacimiento' => 'date',
        'fecha_aceptacion' => 'date',
        'fecha_entrega_vivienda' => 'date',
        'latitud_terreno' => 'decimal:7',
        'longitud_terreno' => 'decimal:7',
        'ingreso_mensual_familiar' => 'decimal:2',
        'cantidad_familiares' => 'integer',
        'personas_dependientes' => 'integer',
    ];

    // Matriz de transiciones válidas de estado
    private const TRANSICIONES_PERMITIDAS = [
        'candidato' => ['aceptado', 'rechazado'],
        'aceptado' => ['en_construccion', 'retirado'],
        'en_construccion' => ['vivienda_entregada', 'retirado'],
        'vivienda_entregada' => [], // Estado final
        'retirado' => ['aceptado'], // Solo por gerente
        'rechazado' => [], // Estado final
    ];

    // Relaciones
    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function tipoVivienda()
    {
        return $this->belongsTo(TipoVivienda::class, 'tipo_vivienda_id');
    }

    public function registrador()
    {
        return $this->belongsTo(User::class, 'usuario_registrador_id');
    }

    public function visitasDomiciliarias()
    {
        return $this->hasMany(VisitaDomiciliaria::class, 'beneficiario_id');
    }

    // Accessors
    public function getNombreCompletoAttribute()
    {
        $partes = array_filter([$this->nombre, $this->apellido_paterno, $this->apellido_materno]);
        return implode(' ', $partes);
    }

    public function getCiCompletoAttribute()
    {
        return $this->ci . ($this->ci_complemento ? '-' . $this->ci_complemento : '');
    }

    public function getEdadAttribute()
    {
        return $this->fecha_nacimiento ? $this->fecha_nacimiento->age : null;
    }

    public function getEsCandidatoAttribute()
    {
        return $this->estado_seleccion === 'candidato';
    }

    public function getEstaAceptadoAttribute()
    {
        return in_array($this->estado_seleccion, ['aceptado', 'en_construccion', 'vivienda_entregada']);
    }

    public function getViviendaCompletaAttribute()
    {
        return $this->estado_seleccion === 'vivienda_entregada';
    }

    // Scopes
    public function scopeCandidatos($query)
    {
        return $query->where('estado_seleccion', 'candidato');
    }

    public function scopeAceptados($query)
    {
        return $query->where('estado_seleccion', 'aceptado');
    }

    public function scopeEnConstruccion($query)
    {
        return $query->where('estado_seleccion', 'en_construccion');
    }

    public function scopeViviendasEntregadas($query)
    {
        return $query->where('estado_seleccion', 'vivienda_entregada');
    }

    public function scopeRetirados($query)
    {
        return $query->where('estado_seleccion', 'retirado');
    }

    public function scopeRechazados($query)
    {
        return $query->where('estado_seleccion', 'rechazado');
    }

    public function scopeDelProyecto($query, int $proyectoId)
    {
        return $query->where('proyecto_id', $proyectoId);
    }

    public function scopeBuscar($query, string $q)
    {
        return $query->where(function ($query) use ($q) {
            $query->where('codigo_beneficiario', 'LIKE', "%{$q}%")
                  ->orWhere('ci', 'LIKE', "%{$q}%")
                  ->orWhereRaw("CONCAT(nombre, ' ', apellido_paterno, ' ', COALESCE(apellido_materno, '')) LIKE ?", ["%{$q}%"])
                  ->orWhere('telefono_principal', 'LIKE', "%{$q}%");
        });
    }

    // Métodos de Dominio
    public function puedeTransicionarA(string $nuevoEstado): bool
    {
        $permitidos = self::TRANSICIONES_PERMITIDAS[$this->estado_seleccion] ?? [];
        return in_array($nuevoEstado, $permitidos);
    }

    public function getTransicionesPermitidas(): array
    {
        return self::TRANSICIONES_PERMITIDAS[$this->estado_seleccion] ?? [];
    }
}
