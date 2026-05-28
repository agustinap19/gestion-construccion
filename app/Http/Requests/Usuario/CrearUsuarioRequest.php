<?php

namespace App\Http\Requests\Usuario;

use Illuminate\Foundation\Http\FormRequest;

class CrearUsuarioRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:80'],
            'apellido_paterno' => ['required', 'string', 'max:80'],
            'apellido_materno' => ['nullable', 'string', 'max:80'],
            'ci' => ['required', 'string', 'max:20', 'unique:users,ci'],
            'ci_complemento' => ['nullable', 'string', 'max:5'],
            'email' => ['required', 'email', 'unique:users,email'],
            'telefono' => ['nullable', 'string', 'max:20'],
            'fecha_nacimiento' => ['nullable', 'date', 'before:today'],
            'direccion' => ['nullable', 'string', 'max:200'],
            'rol_id' => ['required', 'integer', 'exists:roles,id'],
            'estado' => ['nullable', 'in:activo,inactivo'],
            'crear_personal_vinculado' => ['nullable', 'boolean'],
            'personal_data' => ['nullable', 'array'],
            'personal_data.tipo' => ['required_if:crear_personal_vinculado,true', 'string'],
            'personal_data.fecha_contratacion' => ['required_if:crear_personal_vinculado,true', 'date'],
            'personal_data.tipo_contrato' => ['required_if:crear_personal_vinculado,true', 'in:indefinido,plazo_fijo,obra,consultoria'],
            'personal_data.salario_base' => ['required_if:crear_personal_vinculado,true', 'numeric', 'min:0'],
            'personal_data.frecuencia_pago' => ['required_if:crear_personal_vinculado,true', 'in:semanal,quincenal,mensual'],
            'personal_data.especialidad' => ['nullable', 'string', 'max:100'],
            'personal_data.categoria' => ['nullable', 'string', 'max:100'],
            'personal_data.banco' => ['nullable', 'string', 'max:100'],
            'personal_data.numero_cuenta' => ['nullable', 'string', 'max:50'],
            'personal_data.tipo_cuenta' => ['nullable', 'string', 'max:30'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre es obligatorio.',
            'apellido_paterno.required' => 'El apellido paterno es obligatorio.',
            'ci.required' => 'El CI es obligatorio.',
            'ci.unique' => 'Ya existe un usuario con ese CI.',
            'email.required' => 'El email es obligatorio.',
            'email.email' => 'El email no tiene un formato válido.',
            'email.unique' => 'Ya existe un usuario con ese email.',
            'rol_id.required' => 'Debe asignar un rol.',
            'rol_id.exists' => 'El rol seleccionado no existe.',
            'fecha_nacimiento.before' => 'La fecha de nacimiento debe ser anterior a hoy.',
            'personal_data.tipo.required_if' => 'El tipo de personal es obligatorio si se vincula.',
            'personal_data.fecha_contratacion.required_if' => 'La fecha de contratación es obligatoria.',
            'personal_data.tipo_contrato.required_if' => 'El tipo de contrato es obligatorio.',
            'personal_data.salario_base.required_if' => 'El salario base es obligatorio.',
            'personal_data.frecuencia_pago.required_if' => 'La frecuencia de pago es obligatoria.',
        ];
    }
}
