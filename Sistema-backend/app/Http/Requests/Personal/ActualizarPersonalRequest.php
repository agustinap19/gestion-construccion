<?php

namespace App\Http\Requests\Personal;

use Illuminate\Foundation\Http\FormRequest;

class ActualizarPersonalRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'nombre' => 'sometimes|required|string|max:80',
            'apellido_paterno' => 'sometimes|required|string|max:80',
            'apellido_materno' => 'nullable|string|max:80',
            'ci' => "sometimes|required|string|max:20|unique:personal,ci,{$id}",
            'ci_complemento' => 'nullable|string|max:5',
            'telefono' => 'nullable|string|max:20',
            'direccion' => 'nullable|string|max:200',
            'fecha_nacimiento' => 'nullable|date|before:today',
            'rol_id' => 'sometimes|required|exists:roles,id',
            'especialidad' => 'nullable|string|max:100',
            'categoria' => 'nullable|string|max:50',
            'fecha_contratacion' => 'sometimes|required|date',
            'tipo_contrato' => 'sometimes|required|in:indefinido,plazo_fijo,obra,consultoria',
            'salario_base' => 'sometimes|required|numeric|min:0',
            'frecuencia_pago' => 'sometimes|required|in:semanal,quincenal,mensual',
            'banco' => 'nullable|string|max:80',
            'numero_cuenta' => 'nullable|string|max:30',
            'tipo_cuenta' => 'nullable|in:ahorro,corriente',
        ];
    }

    public function messages(): array
    {
        return [
            'ci.unique' => 'Ya existe otro personal con este CI.',
            'rol_id.exists' => 'El rol seleccionado no existe.',
            'tipo_contrato.in' => 'El tipo de contrato no es válido.',
            'salario_base.min' => 'El salario base no puede ser negativo.',
        ];
    }
}
