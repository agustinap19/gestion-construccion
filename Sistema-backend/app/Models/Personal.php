<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;

// TODO: reactivar OwenIt\Auditing\Auditable cuando la tabla `audits` sea creada (sprint de auditoría)

class Personal extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'personal';

    protected $fillable = [
        'usuario_id', 'codigo_empleado', 'nombre', 'apellido_paterno', 'apellido_materno',
        'ci', 'ci_complemento', 'telefono', 'direccion', 'fecha_nacimiento', 'tipo',
        'especialidad', 'categoria', 'fecha_contratacion', 'fecha_desvinculacion',
        'tipo_contrato', 'salario_base', 'frecuencia_pago', 'banco', 'numero_cuenta',
        'tipo_cuenta', 'estado_laboral'
    ];

    protected function casts(): array
    {
        return [
            'fecha_nacimiento' => 'date',
            'fecha_contratacion' => 'date',
            'fecha_desvinculacion' => 'date',
            'salario_base' => 'decimal:2',
        ];
    }

    // ── Accessors ──────────────────────────────────────────────

    protected function nombreCompleto(): Attribute
    {
        return Attribute::get(fn () =>
            trim("{$this->nombre} {$this->apellido_paterno} " . ($this->apellido_materno ?? ''))
        );
    }

    // ── Métodos de consulta ────────────────────────────────────

    public function tieneUsuario(): bool
    {
        return $this->usuario_id !== null;
    }

    public function puedeAcceder(): bool
    {
        return $this->tieneUsuario() && $this->usuario && $this->usuario->estado === 'activo';
    }

    // ── Scopes ─────────────────────────────────────────────────

    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('estado_laboral', 'activo');
    }

    public function scopeConUsuario(Builder $query): Builder
    {
        return $query->whereNotNull('usuario_id');
    }

    public function scopeSinUsuario(Builder $query): Builder
    {
        return $query->whereNull('usuario_id');
    }

    // ── Relaciones ─────────────────────────────────────────────

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function competencias(): BelongsToMany
    {
        return $this->belongsToMany(Competencia::class, 'personal_competencia', 'personal_id', 'competencia_id')
                    ->withPivot(['id', 'fecha_emision', 'fecha_vencimiento', 'entidad_emisora', 'numero_certificado', 'archivo_url', 'estado'])
                    ->withTimestamps();
    }

    public function detallesPlanilla(): HasMany
    {
        return $this->hasMany(DetallePlanilla::class, 'personal_id');
    }

    public function registrosAsistencia(): HasMany
    {
        return $this->hasMany(RegistroAsistencia::class ?? Model::class, 'personal_id');
    }
}
