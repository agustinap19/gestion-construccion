<?php

namespace App\Http\Requests\Beneficiarios;

use Illuminate\Foundation\Http\FormRequest;

class AsignarTipoViviendaRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'tipo_vivienda_id' => 'required|exists:tipos_vivienda,id',
        ];
    }
}
