<?php

namespace App\Http\Requests\Recuperacion;

use Illuminate\Foundation\Http\FormRequest;

class VerificarRostroRecuperacionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Es público, el token valida
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
            'descriptor' => 'required|array|size:128',
            'descriptor.*' => 'numeric',
        ];
    }

    /**
     * Mensajes de error
     */
    public function messages(): array
    {
        return [
            'token.required' => 'El token de recuperación es obligatorio.',
            'descriptor.required' => 'La información biométrica es obligatoria.',
            'descriptor.array' => 'El descriptor facial debe ser un arreglo válido.',
            'descriptor.size' => 'El descriptor facial está incompleto o corrupto.',
        ];
    }
}
