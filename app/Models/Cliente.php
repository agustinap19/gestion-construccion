<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Cliente extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'clientes';

    protected $fillable = [
        'tipo',
        'nombre_completo',
        'nombre_comercial',
        'documento_tipo',
        'documento_numero',
        'documento_complemento',
        'email',
        'telefono_principal',
        'telefono_alternativo',
        'direccion',
        'zona_id',
        'latitud',
        'longitud',
        'representante_legal',
        'cargo_representante',
        'sector',
        'notas',
        'estado',
        'origen',
        'cliente_referido_por',
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

    public function referidoPor()
    {
        return $this->belongsTo(Cliente::class, 'cliente_referido_por');
    }

    public function referidos()
    {
        return $this->hasMany(Cliente::class, 'cliente_referido_por');
    }

    public function proyectos()
    {
        return $this->hasMany(Proyecto::class, 'cliente_id');
    }

    // Accessors
    public function getNombreVisibleAttribute()
    {
        if ($this->tipo === 'empresa') {
            return $this->nombre_comercial ?? $this->nombre_completo;
        }
        return $this->nombre_completo;
    }

    public function getDocumentoCompletoAttribute()
    {
        $doc = $this->documento_numero;
        if (!empty($this->documento_complemento)) {
            $doc .= '-' . $this->documento_complemento;
        }
        return $doc;
    }

    public function getEsPersonaAttribute()
    {
        return $this->tipo === 'persona_natural';
    }

    public function getEsEmpresaAttribute()
    {
        return $this->tipo === 'empresa';
    }

    // Scopes
    public function scopeActivos($query)
    {
        return $query->where('estado', 'activo');
    }

    public function scopePersonas($query)
    {
        return $query->where('tipo', 'persona_natural');
    }

    public function scopeEmpresas($query)
    {
        return $query->where('tipo', 'empresa');
    }

    public function scopeBuscar($query, $termino)
    {
        if (empty($termino)) {
            return $query;
        }
        
        $term = '%' . $termino . '%';
        
        return $query->where(function ($q) use ($term) {
            $q->where('nombre_completo', 'LIKE', $term)
              ->orWhere('nombre_comercial', 'LIKE', $term)
              ->orWhere('documento_numero', 'LIKE', $term)
              ->orWhere('email', 'LIKE', $term);
        });
    }
}
