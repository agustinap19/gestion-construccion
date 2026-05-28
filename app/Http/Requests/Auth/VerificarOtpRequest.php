<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class VerificarOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token_temporal' => ['required', 'string'],
            'codigo' => ['required', 'string', 'size:6', 'regex:/^[0-9]+$/'],
            'confiar_dispositivo' => ['boolean'],
            'fingerprint' => ['required_if:confiar_dispositivo,true', 'nullable', 'string', 'max:64'],
        ];
    }

    public function messages(): array
    {
        return [
            'token_temporal.required' => 'El token de sesión es obligatorio.',
            'codigo.required' => 'El código de verificación es obligatorio.',
            'codigo.size' => 'El código debe tener exactamente 6 dígitos.',
            'codigo.regex' => 'El código debe contener solo números.',
            'fingerprint.required_if' => 'Se requiere el identificador del dispositivo para registrarlo como confiable.',
        ];
    }
}
