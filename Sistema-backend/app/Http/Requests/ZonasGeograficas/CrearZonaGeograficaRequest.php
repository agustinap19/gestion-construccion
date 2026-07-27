<?php

namespace App\Http\Requests\ZonasGeograficas;

use Illuminate\Foundation\Http\FormRequest;

class CrearZonaGeograficaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre'      => 'required|string|max:150',
            'departamento' => 'required|in:La Paz,Cochabamba,Santa Cruz,Oruro,Potosí,Chuquisaca,Tarija,Beni,Pando',
            'provincia'    => 'nullable|string|max:100',
            'municipio'    => 'nullable|string|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required'       => 'El nombre de la zona es obligatorio.',
            'departamento.required' => 'El departamento es obligatorio.',
            'departamento.in'       => 'El departamento seleccionado no es válido.',
        ];
    }
}
