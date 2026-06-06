<?php

namespace App\Http\Requests\Competencia;

use Illuminate\Foundation\Http\FormRequest;

class ActualizarCompetenciaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('id');
        return [
            'nombre'              => "required|string|max:120|unique:competencias,nombre,{$id}",
            'descripcion'         => 'nullable|string|max:500',
            'tipo'                => 'required|in:tecnico,seguridad,laboral,certificacion,otro',
            'requiere_renovacion' => 'boolean',
            'vigencia_meses'      => 'nullable|integer|min:1|max:600|required_if:requiere_renovacion,true',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required'              => 'El nombre es obligatorio.',
            'nombre.unique'                => 'Ya existe una competencia con ese nombre.',
            'tipo.required'                => 'El tipo es obligatorio.',
            'tipo.in'                      => 'El tipo debe ser: técnico, seguridad, laboral, certificación u otro.',
            'vigencia_meses.required_if'   => 'Debe indicar los meses de vigencia cuando la competencia requiere renovación.',
            'vigencia_meses.min'           => 'La vigencia debe ser al menos 1 mes.',
        ];
    }
}
