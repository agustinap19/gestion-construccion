<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Proveedor extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'proveedores';

    protected $fillable = [
        'codigo',
        'razon_social',
        'nombre_comercial',
        'nit',
        'categoria_id',
        'tipo',
        'contacto_nombre',
        'contacto_telefono',
        'contacto_email',
        'telefono_principal',
        'email_oficial',
        'direccion',
        'zona_id',
        'sitio_web',
        'productos_servicios',
        'estado',
        'calificacion',
        'observaciones',
        'registrado_por_id',
    ];

    protected $casts = [
        'calificacion' => 'decimal:2',
    ];

    public function categoria()
    {
        return $this->belongsTo(CategoriaProveedor::class, 'categoria_id');
    }

    public function zona()
    {
        return $this->belongsTo(ZonaGeografica::class, 'zona_id');
    }

    public function registradoPor()
    {
        return $this->belongsTo(User::class, 'registrado_por_id');
    }

    public function movimientosAlmacen()
    {
        return $this->hasMany(MovimientoAlmacen::class, 'proveedor_id');
    }

    public function entradasCompra()
    {
        return $this->hasMany(MovimientoAlmacen::class, 'proveedor_id')
                    ->where('tipo', 'entrada_compra');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', 'activo');
    }

    public function scopeBuscar($query, string $termino)
    {
        return $query->where(function ($q) use ($termino) {
            $q->where('razon_social', 'like', "%{$termino}%")
              ->orWhere('nombre_comercial', 'like', "%{$termino}%")
              ->orWhere('codigo', 'like', "%{$termino}%")
              ->orWhere('nit', 'like', "%{$termino}%");
        });
    }
}
