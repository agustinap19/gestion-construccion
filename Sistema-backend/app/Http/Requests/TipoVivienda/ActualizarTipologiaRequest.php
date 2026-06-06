<?php

namespace App\Http\Requests\TipoVivienda;

use Illuminate\Foundation\Http\FormRequest;

class ActualizarTipologiaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('id');
        return [
            'nombre'      => "sometimes|required|string|max:60|unique:tipos_vivienda,nombre,{$id}",
            'descripcion' => 'nullable|string|max:500',
            'plano_url'   => 'nullable|string|max:500',
            'metros_cuadrados'     => 'nullable|numeric|min:1|max:9999',
            'cantidad_dormitorios' => 'nullable|integer|min:0|max:20',
            'cantidad_banos'       => 'nullable|integer|min:0|max:20',
            'costo_referencial'    => 'nullable|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return ['nombre.unique' => 'Ya existe una tipología con ese nombre.'];
    }
}
