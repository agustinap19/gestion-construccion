<?php

namespace App\Http\Requests\Fases;

use Illuminate\Foundation\Http\FormRequest;

class CrearFaseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre'                => 'required|string|max:255',
            'descripcion'           => 'nullable|string|max:2000',
            'peso_porcentual'       => 'required|numeric|min:0|max:100',
            'fase_prerrequisito_id' => 'nullable|exists:fases_proyecto,id',
            'fecha_inicio_planificada' => 'nullable|date',
            'fecha_fin_planificada' => 'nullable|date|after:fecha_inicio_planificada',
            'presupuesto_fase'      => 'nullable|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre de la fase es obligatorio.',
            'peso_porcentual.required' => 'El peso porcentual es obligatorio.',
        ];
    }
}
