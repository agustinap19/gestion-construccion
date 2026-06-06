<?php

namespace App\Http\Requests\Proyectos;

use Illuminate\Foundation\Http\FormRequest;

class CambiarEstadoProyectoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'estado' => 'required|in:formulacion,licitacion,adjudicado,en_ejecucion,pausado,finalizado,cancelado',
            'razon'  => 'nullable|string|max:1000',
        ];
    }
}
