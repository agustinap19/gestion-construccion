<?php

namespace App\Http\Requests\Fases;

use Illuminate\Foundation\Http\FormRequest;

class CambiarEstadoFaseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'estado' => 'required|in:pendiente,en_proceso,completada,cancelada',
            'razon'  => 'nullable|string|max:1000',
        ];
    }
}
