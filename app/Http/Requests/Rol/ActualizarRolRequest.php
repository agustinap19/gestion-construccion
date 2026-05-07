<?php

namespace App\Http\Requests\Rol;

use Illuminate\Foundation\Http\FormRequest;

class ActualizarRolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre_visible' => ['required', 'string', 'max:80'],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'estado' => ['required', 'in:activo,inactivo'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre_visible.required' => 'El nombre visible del rol es obligatorio.',
            'nombre_visible.max' => 'El nombre visible no puede exceder los 80 caracteres.',
            'descripcion.max' => 'La descripción no puede exceder los 500 caracteres.',
            'estado.required' => 'El estado del rol es obligatorio.',
            'estado.in' => 'El estado debe ser activo o inactivo.',
        ];
    }
}
