<?php

namespace App\Http\Requests\Fases;

use Illuminate\Foundation\Http\FormRequest;

class ActualizarFaseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre'                => 'sometimes|string|max:255',
            'descripcion'           => 'nullable|string|max:2000',
            'peso_porcentual'       => 'sometimes|numeric|min:0|max:100',
            'fase_prerrequisito_id' => 'nullable|exists:fases_proyecto,id',
            'fecha_inicio_planificada' => 'nullable|date',
            'fecha_fin_planificada' => 'nullable|date',
            'presupuesto_fase'      => 'nullable|numeric|min:0',
        ];
    }
}
