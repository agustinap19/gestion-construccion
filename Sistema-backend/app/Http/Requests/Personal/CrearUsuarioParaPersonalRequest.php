<?php

namespace App\Http\Requests\Personal;

use Illuminate\Foundation\Http\FormRequest;

class CrearUsuarioParaPersonalRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'email' => 'required|email|unique:users,email',
            'rol_id' => 'required|exists:roles,id',
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'El email es obligatorio.',
            'email.email' => 'El email no tiene un formato válido.',
            'email.unique' => 'Ya existe un usuario con este email.',
            'rol_id.required' => 'El rol es obligatorio.',
            'rol_id.exists' => 'El rol seleccionado no existe.',
        ];
    }
}
