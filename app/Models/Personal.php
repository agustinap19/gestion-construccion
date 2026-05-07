<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function competencias(): BelongsToMany
    {
        return $this->belongsToMany(Competencia::class, 'personal_competencia', 'personal_id', 'competencia_id')
                    ->withPivot(['fecha_emision', 'fecha_vencimiento', 'entidad_emisora', 'numero_certificado', 'archivo_url', 'estado'])
                    ->withTimestamps();
    }

    public function detallesPlanilla(): HasMany
    {
        return $this->hasMany(DetallePlanilla::class, 'personal_id');
    }
}
