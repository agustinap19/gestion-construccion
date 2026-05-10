<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AsignacionPersonal extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'asignaciones_personal';

    protected $fillable = [
        'proyecto_id',
        'personal_id',
        'rol_en_proyecto',
        'fecha_inicio',
        'fecha_fin',
        'estado',
        'es_responsable_principal',
        'observaciones',
        'usuario_asignador_id',
    ];

    protected $casts = [
        'fecha_inicio'            => 'date',
        'fecha_fin'               => 'date',
        'es_responsable_principal' => 'boolean',
    ];

    // ── Relaciones ──────────────────────────────────────────────────────────

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
    }

    public function personal()
    {
        return $this->belongsTo(Personal::class, 'personal_id');
    }

    public function asignador()
    {
        return $this->belongsTo(User::class, 'usuario_asignador_id');
    }

    // ── Accessors ────────────────────────────────────────────────────────────

    public function getEstaActivaAttribute(): bool
    {
        return $this->estado === 'activa';
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActivas($query)
    {
        return $query->where('estado', 'activa');
    }

    public function scopeDelProyecto($query, int $proyectoId)
    {
        return $query->where('proyecto_id', $proyectoId);
    }

    public function scopeDelPersonal($query, int $personalId)
    {
        return $query->where('personal_id', $personalId);
    }
}
