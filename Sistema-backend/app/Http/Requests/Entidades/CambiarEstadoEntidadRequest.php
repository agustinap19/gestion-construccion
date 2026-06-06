<?php

namespace App\Http\Requests\Entidades;

use Illuminate\Foundation\Http\FormRequest;

class CambiarEstadoEntidadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('entidades.editar');
    }

    public function rules(): array
    {
        return [
            'estado' => 'required|in:activa,inactiva,en_disputa',
            'razon' => 'nullable|string|max:500|required_if:estado,en_disputa',
        ];
    }

    public function messages(): array
    {
        return [
            'estado.required' => 'El estado es obligatorio.',
            'estado.in' => 'El estado seleccionado no es válido.',
            'razon.required_if' => 'Debe especificar una razón al marcar la entidad como "En disputa".',
            'razon.max' => 'La razón no puede superar los 500 caracteres.',
        ];
    }
}
