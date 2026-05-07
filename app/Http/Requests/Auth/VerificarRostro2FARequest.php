<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class VerificarRostro2FARequest extends FormRequest
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
            'descriptor' => ['required', 'array', 'size:128'],
            'descriptor.*' => ['numeric'],
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
            'descriptor.required' => 'El descriptor facial es obligatorio.',
            'descriptor.array' => 'El descriptor debe ser un arreglo de datos.',
            'descriptor.size' => 'El descriptor debe contener exactamente 128 elementos.',
            'descriptor.*.numeric' => 'Cada elemento del descriptor debe ser numérico.',
        ];
    }
}
