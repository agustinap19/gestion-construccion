<?php

namespace App\Http\Requests\Activos;

use Illuminate\Foundation\Http\FormRequest;

class AsignacionActivoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'proyecto_id'               => 'required|integer|exists:proyectos,id',
            'vivienda_id'               => 'nullable|integer|exists:viviendas,id',
            'fecha_inicio'              => 'required|date',
            'fecha_fin_estimada'        => 'required|date|after_or_equal:fecha_inicio',
            'horas_dia_estimadas'       => 'nullable|numeric|min:0.5|max:24',
            'notas'                     => 'nullable|string',
            'forzar_pese_a_advertencia' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'proyecto_id.required'        => 'Debe seleccionar un proyecto.',
            'fecha_fin_estimada.after_or_equal' => 'La fecha de fin debe ser posterior o igual a la fecha de inicio.',
        ];
    }
}
