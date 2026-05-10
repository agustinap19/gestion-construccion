<?php

namespace App\Http\Requests\Personal;

use Illuminate\Foundation\Http\FormRequest;

class CrearPersonalRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'codigo_empleado' => 'nullable|string|max:20|unique:personal,codigo_empleado',
            'nombre' => 'required|string|max:80',
            'apellido_paterno' => 'required|string|max:80',
            'apellido_materno' => 'nullable|string|max:80',
            'ci' => 'required|string|max:20|unique:personal,ci',
            'ci_complemento' => 'nullable|string|max:5',
            'telefono' => 'nullable|string|max:20',
            'direccion' => 'nullable|string|max:200',
            'fecha_nacimiento' => 'nullable|date|before:today',
            'tipo' => 'required|in:tecnico,obrero,trabajadora_social,administrativo,gerente,encargado_almacen,encargado_finanzas',
            'especialidad' => 'nullable|string|max:100',
            'categoria' => 'nullable|string|max:50',
            'fecha_contratacion' => 'required|date',
            'tipo_contrato' => 'required|in:indefinido,plazo_fijo,obra,consultoria',
            'salario_base' => 'required|numeric|min:0',
            'frecuencia_pago' => 'required|in:semanal,quincenal,mensual',
            'banco' => 'nullable|string|max:80',
            'numero_cuenta' => 'nullable|string|max:30',
            'tipo_cuenta' => 'nullable|in:ahorro,corriente',
            'estado_laboral' => 'nullable|in:activo,vacaciones,licencia',

            'crear_usuario_vinculado' => 'nullable|boolean',
            'usuario_data' => 'nullable|array|required_if:crear_usuario_vinculado,true',
            'usuario_data.email' => 'required_if:crear_usuario_vinculado,true|email|unique:usuarios,email',
            'usuario_data.rol_id' => 'required_if:crear_usuario_vinculado,true|exists:roles,id',

            'vincular_usuario_existente_id' => 'nullable|exists:usuarios,id',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre es obligatorio.',
            'apellido_paterno.required' => 'El apellido paterno es obligatorio.',
            'ci.required' => 'El CI es obligatorio.',
            'ci.unique' => 'Ya existe un personal con este CI.',
            'codigo_empleado.unique' => 'Este código de empleado ya existe.',
            'tipo.required' => 'El tipo de personal es obligatorio.',
            'tipo.in' => 'El tipo de personal no es válido.',
            'fecha_contratacion.required' => 'La fecha de contratación es obligatoria.',
            'tipo_contrato.required' => 'El tipo de contrato es obligatorio.',
            'tipo_contrato.in' => 'El tipo de contrato no es válido.',
            'salario_base.required' => 'El salario base es obligatorio.',
            'salario_base.min' => 'El salario base no puede ser negativo.',
            'frecuencia_pago.required' => 'La frecuencia de pago es obligatoria.',
            'usuario_data.email.required_if' => 'El email es obligatorio para crear cuenta de usuario.',
            'usuario_data.email.unique' => 'Ya existe un usuario con este email.',
            'usuario_data.rol_id.required_if' => 'El rol es obligatorio para crear cuenta de usuario.',
            'usuario_data.rol_id.exists' => 'El rol seleccionado no existe.',
            'vincular_usuario_existente_id.exists' => 'El usuario seleccionado no existe.',
        ];
    }
}
