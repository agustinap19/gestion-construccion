<?php

namespace App\Http\Requests\Rol;

use Illuminate\Foundation\Http\FormRequest;

class ActualizarPermisosRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'permiso_ids' => ['required', 'array'],
            'permiso_ids.*' => ['integer', 'exists:permisos,id'],
            'razon' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'permiso_ids.required' => 'Debe seleccionar al menos un permiso.',
            'permiso_ids.*.integer' => 'Los permisos seleccionados no son válidos.',
            'permiso_ids.*.exists' => 'Uno o más permisos seleccionados no existen.',
            'razon.max' => 'La razón del cambio no puede exceder los 500 caracteres.',
        ];
    }
}
