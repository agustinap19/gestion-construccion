<?php

namespace App\Http\Requests\Usuario;

use Illuminate\Foundation\Http\FormRequest;

class AccionMasivaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'accion' => ['required', 'in:activar,desactivar,suspender,reenviar_password,cerrar_sesiones,revocar_dispositivos,eliminar'],
            'usuario_ids' => ['required', 'array', 'min:1'],
            'usuario_ids.*' => ['integer', 'exists:users,id'],
            'razon' => ['required_if:accion,suspender,eliminar', 'nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'accion.required' => 'Debe especificar una acción.',
            'accion.in' => 'La acción no es válida.',
            'usuario_ids.required' => 'Debe seleccionar al menos un usuario.',
            'usuario_ids.min' => 'Debe seleccionar al menos un usuario.',
            'razon.required_if' => 'La razón es obligatoria para esta acción.',
        ];
    }
}
