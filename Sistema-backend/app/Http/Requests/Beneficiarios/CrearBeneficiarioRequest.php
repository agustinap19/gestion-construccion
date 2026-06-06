<?php

namespace App\Http\Requests\Beneficiarios;

use Illuminate\Foundation\Http\FormRequest;

class CrearBeneficiarioRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'proyecto_id' => 'required|exists:proyectos,id',
            'nombre' => 'required|string|max:80',
            'apellido_paterno' => 'required|string|max:80',
            'apellido_materno' => 'nullable|string|max:80',
            'apellido_conyuge' => 'nullable|string|max:80',
            'ci' => 'required|string|max:20',
            'ci_complemento' => 'nullable|string|max:2',
            'fecha_nacimiento' => 'nullable|date|before:today',
            'estado_civil' => 'nullable|in:soltero,casado,divorciado,viudo,union_libre,otro',
            'genero' => 'nullable|in:masculino,femenino,otro',
            'telefono_principal' => 'nullable|string|max:20',
            'telefono_alternativo' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:150',
            'ingreso_mensual_familiar' => 'nullable|numeric|min:0|max:99999999',
            'comunidad' => 'nullable|string|max:120',
            'direccion_actual' => 'nullable|string',
            'latitud_terreno' => 'nullable|numeric|between:-90,90',
            'longitud_terreno' => 'nullable|numeric|between:-180,180',
            'foto_titular_url' => 'nullable|string|max:500',
            'documento_propiedad_terreno_url' => 'nullable|string|max:500',
            'estado_seleccion' => 'nullable|in:candidato,aceptado',
            'tipo_vivienda_id' => 'nullable|exists:tipos_vivienda,id',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $lat = $this->input('latitud_terreno');
            $lng = $this->input('longitud_terreno');

            if (($lat && !$lng) || (!$lat && $lng)) {
                $validator->errors()->add('latitud_terreno', 'Si ingresa coordenadas GPS, debe proporcionar tanto latitud como longitud.');
            }
        });
    }
}
