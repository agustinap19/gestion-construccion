<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class VerificarOtpRequest extends FormRequest
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
            'token_temporal' => ['required', 'string'],
            'codigo' => ['required', 'string', 'size:6', 'regex:/^[0-9]+$/'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'token_temporal.required' => 'El token temporal es obligatorio.',
            'codigo.required' => 'El código de verificación es obligatorio.',
            'codigo.size' => 'El código debe tener exactamente 6 dígitos.',
            'codigo.regex' => 'El código debe contener solo números.',
        ];
    }
}
