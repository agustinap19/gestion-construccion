<?php

namespace App\Http\Requests\Usuario;

use Illuminate\Foundation\Http\FormRequest;

class CrearUsuarioRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Asumimos que la autorización se manejará mediante middleware u otros medios
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:80'],
            'apellido_paterno' => ['required', 'string', 'max:80'],
            'apellido_materno' => ['nullable', 'string', 'max:80'],
            'ci' => ['required', 'string', 'max:20', 'unique:usuarios'],
            'ci_complemento' => ['nullable', 'string', 'max:5'],
            'email' => ['required', 'email', 'unique:usuarios'],
            'telefono' => ['nullable', 'string', 'max:20'],
            'fecha_nacimiento' => ['nullable', 'date'],
            'direccion' => ['nullable', 'string', 'max:200'],
            'rol_id' => ['required', 'exists:roles,id'],
            'estado' => ['nullable', 'in:activo,inactivo,suspendido'],
        ];
    }
}
