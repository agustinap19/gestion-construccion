<?php

namespace App\Http\Requests\Entidades;

use Illuminate\Foundation\Http\FormRequest;

class CrearEntidadEstatalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('entidades.crear');
    }

    public function rules(): array
    {
        return [
            'nombre' => 'required|string|max:200',
            'sigla' => 'nullable|string|max:20',
            'nivel' => 'required|in:nacional,departamental,municipal,autonomo,descentralizado,otro',
            'nit' => 'required|string|max:20',
            'direccion' => 'nullable|string',
            'zona_id' => 'nullable|exists:zonas_geograficas,id',
            'latitud' => 'nullable|numeric|between:-90,90',
            'longitud' => 'nullable|numeric|between:-180,180',
            'telefono_principal' => ['nullable', 'string', 'regex:/^[67][0-9]{7}$/'],
            'email_oficial' => 'nullable|email|max:150',
            'sitio_web' => 'nullable|string|max:150',
            'representante_legal' => 'nullable|string|max:150',
            'cargo_representante' => 'nullable|string|max:100',
            'tipo_proyectos_que_otorga' => 'nullable|string|max:255',
            'estado' => 'nullable|in:activa,inactiva,en_disputa',
            'notas' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre de la entidad estatal es obligatorio.',
            'nivel.required' => 'El nivel gubernamental es obligatorio.',
            'nivel.in' => 'El nivel seleccionado no es válido.',
            'nit.required' => 'El NIT es obligatorio.',
            'zona_id.exists' => 'La zona geográfica seleccionada no existe.',
            'email_oficial.email' => 'El correo electrónico oficial no es válido.',
            'telefono_principal.regex' => 'El teléfono debe ser un número boliviano válido (8 dígitos, empieza con 6 o 7).',
        ];
    }
}
