<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class CambiarPasswordPrimerLoginRequest extends FormRequest
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
            'password_actual' => ['required', 'string'],
            'nueva_password' => [
                'required', 
                'string', 
                'min:8', 
                'confirmed',
                'regex:/[A-Z]/',      // must contain at least one uppercase letter
                'regex:/[a-z]/',      // must contain at least one lowercase letter
                'regex:/[0-9]/',      // must contain at least one digit
                'regex:/[\W]/',       // must contain a special character
            ],
            'nueva_password_confirmation' => ['required']
        ];
    }

    /**
     * Custom messages for validation errors
     */
    public function messages(): array
    {
        return [
            'password_actual.required' => 'La contraseña actual es obligatoria.',
            'nueva_password.required' => 'La nueva contraseña es obligatoria.',
            'nueva_password.min' => 'La nueva contraseña debe tener al menos 8 caracteres.',
            'nueva_password.confirmed' => 'La confirmación de la contraseña no coincide.',
            'nueva_password.regex' => 'La nueva contraseña no cumple con los requisitos de seguridad (mayúscula, minúscula, número y símbolo).',
            'nueva_password_confirmation.required' => 'Debes confirmar la nueva contraseña.'
        ];
    }
}
