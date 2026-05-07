<?php

namespace App\Http\Requests\Recuperacion;

use Illuminate\Foundation\Http\FormRequest;

class CambiarPasswordRecuperacionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'token' => 'required|string|size:60',
            'nueva_password' => [
                'required',
                'string',
                'min:8',
                'regex:/[a-z]/',      // al menos una minúscula
                'regex:/[A-Z]/',      // al menos una mayúscula
                'regex:/[0-9]/',      // al menos un número
                'regex:/[@$!%*#?&_\-]/', // al menos un símbolo
                'confirmed'           // espera nueva_password_confirmation
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'token.required' => 'El token es obligatorio.',
            'nueva_password.required' => 'Debes ingresar una nueva contraseña.',
            'nueva_password.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'nueva_password.regex' => 'La contraseña no cumple con los requisitos de seguridad.',
            'nueva_password.confirmed' => 'Las contraseñas no coinciden.',
        ];
    }
}
