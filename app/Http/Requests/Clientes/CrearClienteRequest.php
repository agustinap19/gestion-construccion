<?php

namespace App\Http\Requests\Clientes;

use Illuminate\Foundation\Http\FormRequest;

class CrearClienteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('clientes.crear');
    }

    public function rules(): array
    {
        return [
            'tipo' => 'required|in:persona_natural,empresa',
            'nombre_completo' => 'required|string|max:150',
            'nombre_comercial' => 'nullable|string|max:150|required_if:tipo,empresa',
            'documento_tipo' => 'required|in:ci,nit,pasaporte,rut_extranjero',
            'documento_numero' => 'required|string|max:30',
            'documento_complemento' => 'nullable|string|max:5',
            'email' => 'nullable|email|max:150',
            'telefono_principal' => 'nullable|string|max:20',
            'telefono_alternativo' => 'nullable|string|max:20',
            'direccion' => 'nullable|string',
            'zona_id' => 'nullable|exists:zonas_geograficas,id',
            'latitud' => 'nullable|numeric|between:-90,90',
            'longitud' => 'nullable|numeric|between:-180,180',
            'representante_legal' => 'nullable|string|max:150|required_if:tipo,empresa',
            'cargo_representante' => 'nullable|string|max:100',
            'sector' => 'nullable|string|max:80',
            'notas' => 'nullable|string',
            'estado' => 'nullable|in:activo,inactivo,potencial',
            'origen' => 'nullable|in:directo,referido,sitio_web,licitacion,otro',
            'cliente_referido_por' => 'nullable|exists:clientes,id|required_if:origen,referido',
        ];
    }

    public function messages(): array
    {
        return [
            'tipo.required' => 'El tipo de cliente es obligatorio.',
            'tipo.in' => 'El tipo de cliente debe ser persona natural o empresa.',
            'nombre_completo.required' => 'El nombre o razón social es obligatorio.',
            'nombre_comercial.required_if' => 'El nombre comercial es obligatorio para empresas.',
            'documento_tipo.required' => 'El tipo de documento es obligatorio.',
            'documento_numero.required' => 'El número de documento es obligatorio.',
            'email.email' => 'El correo electrónico no es válido.',
            'zona_id.exists' => 'La zona geográfica seleccionada no existe.',
            'representante_legal.required_if' => 'El representante legal es obligatorio para empresas.',
            'cliente_referido_por.required_if' => 'Debe seleccionar qué cliente lo refirió.',
            'cliente_referido_por.exists' => 'El cliente referente no existe.',
        ];
    }
}
