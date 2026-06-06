<?php

namespace App\Http\Requests\Beneficiarios;

use Illuminate\Foundation\Http\FormRequest;

class CambiarEstadoBeneficiarioRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'estado_seleccion' => 'required|in:candidato,aceptado,en_construccion,vivienda_entregada,retirado,rechazado',
            'razon' => 'required_if:estado_seleccion,retirado,rechazado|nullable|string|max:500',
            'fecha_aceptacion' => 'nullable|date|required_if:estado_seleccion,aceptado',
            'fecha_entrega_vivienda' => 'nullable|date|required_if:estado_seleccion,vivienda_entregada',
        ];
    }
}
