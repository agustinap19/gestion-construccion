<?php

namespace App\Http\Requests\Rol;

use Illuminate\Foundation\Http\FormRequest;

class CrearRolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:50', 'regex:/^[a-z_]+$/', 'unique:roles,nombre'],
            'nombre_visible' => ['required', 'string', 'max:80'],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'permiso_ids' => ['required', 'array', 'min:1'],
            'permiso_ids.*' => ['integer', 'exists:permisos,id'],
            'copia_de_rol_id' => ['nullable', 'integer', 'exists:roles,id'],
            'estado' => ['nullable', 'in:activo,inactivo'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre interno del rol es obligatorio.',
            'nombre.max' => 'El nombre interno no puede exceder los 50 caracteres.',
            'nombre.regex' => 'El nombre interno solo puede contener letras minúsculas y guiones bajos.',
            'nombre.unique' => 'Ya existe un rol con ese nombre interno.',
            'nombre_visible.required' => 'El nombre visible del rol es obligatorio.',
            'nombre_visible.max' => 'El nombre visible no puede exceder los 80 caracteres.',
            'descripcion.max' => 'La descripción no puede exceder los 500 caracteres.',
            'permiso_ids.required' => 'Debe seleccionar al menos un permiso.',
            'permiso_ids.min' => 'Debe seleccionar al menos un permiso.',
            'permiso_ids.*.integer' => 'Los permisos seleccionados no son válidos.',
            'permiso_ids.*.exists' => 'Uno o más permisos seleccionados no existen.',
            'copia_de_rol_id.exists' => 'El rol seleccionado para copiar no existe.',
            'estado.in' => 'El estado debe ser activo o inactivo.',
        ];
    }
}
