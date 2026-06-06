<?php

namespace App\Http\Requests\Viviendas;

use Illuminate\Foundation\Http\FormRequest;

class CrearViviendaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'tipo_vivienda_id'  => 'nullable|exists:tipos_vivienda,id',
            'beneficiario_id'   => 'nullable|exists:beneficiarios,id',
            'latitud'           => 'nullable|numeric|between:-90,90',
            'longitud'          => 'nullable|numeric|between:-180,180',
            'direccion'         => 'nullable|string|max:500',
            'observaciones'     => 'nullable|string|max:2000',
        ];
    }
}
