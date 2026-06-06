<?php

namespace App\Http\Requests\Usuario;

use Illuminate\Foundation\Http\FormRequest;

class CambiarEstadoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'estado' => ['required', 'in:activo,inactivo,suspendido'],
            'razon' => ['required_if:estado,suspendido', 'nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'estado.required' => 'El estado es obligatorio.',
            'estado.in' => 'El estado debe ser activo, inactivo o suspendido.',
            'razon.required_if' => 'La razón es obligatoria para suspender una cuenta.',
        ];
    }
}
