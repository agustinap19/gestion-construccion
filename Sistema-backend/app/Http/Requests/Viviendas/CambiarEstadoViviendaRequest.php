<?php

namespace App\Http\Requests\Viviendas;

use Illuminate\Foundation\Http\FormRequest;

class CambiarEstadoViviendaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'estado' => 'required|in:planificada,en_construccion,obra_gruesa,acabados,inspeccion,con_observaciones,aprobada,entregada',
            'razon'  => 'nullable|string|max:1000',
        ];
    }
}
