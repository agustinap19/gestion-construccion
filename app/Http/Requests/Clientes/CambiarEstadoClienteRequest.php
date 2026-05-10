<?php

namespace App\Http\Requests\Clientes;

use Illuminate\Foundation\Http\FormRequest;

class CambiarEstadoClienteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('clientes.editar');
    }

    public function rules(): array
    {
        return [
            'estado' => 'required|in:activo,inactivo,potencial,bloqueado',
            'razon' => 'nullable|string|max:500|required_if:estado,bloqueado',
        ];
    }

    public function messages(): array
    {
        return [
            'estado.required' => 'El estado es obligatorio.',
            'estado.in' => 'El estado seleccionado no es válido.',
            'razon.required_if' => 'Debe especificar una razón al bloquear al cliente.',
            'razon.max' => 'La razón no puede superar los 500 caracteres.',
        ];
    }
}
