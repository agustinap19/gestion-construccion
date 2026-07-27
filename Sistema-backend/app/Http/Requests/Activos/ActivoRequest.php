<?php

namespace App\Http\Requests\Activos;

use Illuminate\Foundation\Http\FormRequest;

class ActivoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'codigo'                   => 'nullable|string|max:20|unique:activos,codigo',
            'nombre'                   => 'required|string|max:150',
            'tipo'                     => 'required|in:maquinaria,equipo,herramienta,vehiculo',
            'tipo_activo_id'           => 'nullable|integer|exists:tipos_activo,id',
            'descripcion'              => 'nullable|string',
            'marca'                    => 'nullable|string|max:100',
            'modelo'                   => 'nullable|string|max:100',
            'serie'                    => 'nullable|string|max:255',
            'anio_fabricacion'         => 'nullable|integer|min:1900|max:' . (date('Y') + 1),
            'costo_dia_uso'            => 'nullable|numeric|min:0',
            'horas_mantenimiento_cada' => 'nullable|numeric|min:0',
            'estado'                   => 'nullable|in:disponible,asignado,mantenimiento,baja',
            'propiedad'                => 'nullable|in:propio,arrendado,en_comodato',
            'fecha_adquisicion'        => 'nullable|date',
            'valor_adquisicion'        => 'nullable|numeric|min:0',
            'valor_actual'             => 'nullable|numeric|min:0',
            'vida_util_anios'          => 'nullable|integer|min:0',
            'metodo_depreciacion'      => 'nullable|in:lineal,saldo_decreciente,unidades_produccion',
            'tasa_depreciacion'        => 'nullable|numeric|min:0|max:100',
            'almacen_id'               => 'nullable|integer|exists:almacenes,id',
            'responsable_id'           => 'nullable|integer|exists:personal,id',
            'foto_url'                 => 'nullable|string|max:500',
            'notas'                    => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre del activo es obligatorio.',
            'tipo.required'   => 'El tipo de activo es obligatorio.',
            'tipo.in'         => 'El tipo debe ser maquinaria, equipo, herramienta o vehículo.',
            'codigo.unique'   => 'Ya existe un activo con este código.',
        ];
    }
}
