<?php

namespace App\Http\Requests\Usuario;

use Illuminate\Foundation\Http\FormRequest;

class CambiarRolRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'rol_id' => ['required', 'integer', 'exists:roles,id'],
            'razon' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'rol_id.required' => 'Debe seleccionar un rol.',
            'rol_id.exists' => 'El rol seleccionado no existe.',
        ];
    }
}
