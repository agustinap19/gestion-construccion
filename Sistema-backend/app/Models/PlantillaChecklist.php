<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlantillaChecklist extends Model
{
    use HasFactory;

    protected $table = 'plantillas_checklist';

    protected $fillable = [
        'clave',
        'nombre',
        'tipo_obra',
        'descripcion',
        'es_predeterminada',
        'activo',
    ];

    protected $casts = [
        'es_predeterminada' => 'boolean',
        'activo'            => 'boolean',
    ];

    public function items()
    {
        return $this->hasMany(ItemPlantilla::class, 'plantilla_id')->orderBy('orden');
    }

    public static function paraObraTipo(?string $tipoObra): ?self
    {
        $mapa = [
            'vivienda_unifamiliar' => 'casa_privada',
            'edificio'             => 'edificio',
            'remodelacion'         => 'remodelacion',
            'ampliacion'           => 'remodelacion',
            'vivienda_social'      => 'vivienda_social',
        ];

        $clave = $mapa[$tipoObra] ?? null;
        if ($clave) {
            $plantilla = self::where('clave', $clave)->first();
            if ($plantilla) return $plantilla;
        }

        return self::where('es_predeterminada', true)->first()
            ?? self::where('clave', 'generica')->first()
            ?? self::first();
    }
}
