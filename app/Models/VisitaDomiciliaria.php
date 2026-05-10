<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class VisitaDomiciliaria extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'visitas_domiciliarias';

    protected $fillable = [
        'proyecto_id',
        'beneficiario_id',
        'personal_id',
        'fecha_visita',
        'hora_visita',
        'latitud_visita',
        'longitud_visita',
        'tipo_visita',
        'resultado',
        'observaciones',
        'documentos_recolectados',
        'gasto_transporte',
        'foto_visita_url'
    ];

    protected $casts = [
        'fecha_visita' => 'date',
        'hora_visita' => 'string',
        'latitud_visita' => 'decimal:7',
        'longitud_visita' => 'decimal:7',
        'gasto_transporte' => 'decimal:2',
    ];

    // Relaciones
    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function beneficiario()
    {
        return $this->belongsTo(Beneficiario::class, 'beneficiario_id');
    }

    public function visitador()
    {
        return $this->belongsTo(Personal::class, 'personal_id');
    }

    // Accessors
    public function getFechaHoraCompletaAttribute()
    {
        if ($this->fecha_visita && $this->hora_visita) {
            return Carbon::parse($this->fecha_visita->format('Y-m-d') . ' ' . $this->hora_visita);
        }
        return $this->fecha_visita;
    }

    public function getEsExitosaAttribute()
    {
        return $this->resultado === 'exitosa';
    }

    // Scopes
    public function scopeDelProyecto($query, int $proyectoId)
    {
        return $query->where('proyecto_id', $proyectoId);
    }

    public function scopeDelBeneficiario($query, int $beneficiarioId)
    {
        return $query->where('beneficiario_id', $beneficiarioId);
    }

    public function scopeExitosas($query)
    {
        return $query->where('resultado', 'exitosa');
    }

    public function scopePendientes($query)
    {
        return $query->where('resultado', 'reprogramada');
    }

    public function scopeEntreFechas($query, string $desde, string $hasta)
    {
        return $query->whereBetween('fecha_visita', [$desde, $hasta]);
    }
}
