<?php

namespace App\Http\Requests\Personal;

use Illuminate\Foundation\Http\FormRequest;

class CambiarEstadoLaboralRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'estado_laboral' => 'required|in:activo,vacaciones,licencia,desvinculado',
            'razon' => 'required_if:estado_laboral,desvinculado|nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'estado_laboral.required' => 'El estado laboral es obligatorio.',
            'estado_laboral.in' => 'El estado laboral no es válido.',
            'razon.required_if' => 'La razón es obligatoria para la desvinculación.',
            'razon.max' => 'La razón no puede exceder 500 caracteres.',
        ];
    }
}
