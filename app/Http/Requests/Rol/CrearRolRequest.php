<?php

namespace App\Http\Requests\Rol;

use Illuminate\Foundation\Http\FormRequest;

class CrearRolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre_visible' => ['required', 'string', 'max:50'],
            'descripcion'    => ['nullable', 'string', 'max:100'],
            'permiso_ids'    => ['required', 'array', 'min:1'],
            'permiso_ids.*'  => ['integer', 'exists:permisos,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre_visible.required' => 'El nombre del rol es obligatorio.',
            'nombre_visible.max'      => 'El nombre no puede exceder los 50 caracteres.',
            'descripcion.max'         => 'La descripción no puede exceder los 100 caracteres.',
            'permiso_ids.required'    => 'Debe seleccionar al menos un permiso.',
            'permiso_ids.min'         => 'Debe seleccionar al menos un permiso.',
            'permiso_ids.*.exists'    => 'Uno o más permisos seleccionados no existen.',
        ];
    }
}
