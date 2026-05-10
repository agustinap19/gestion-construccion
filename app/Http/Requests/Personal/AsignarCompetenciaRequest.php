<?php

namespace App\Http\Requests\Personal;

use Illuminate\Foundation\Http\FormRequest;

class AsignarCompetenciaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'competencia_id' => 'required|exists:competencias,id',
            'fecha_emision' => 'required|date|before_or_equal:today',
            'fecha_vencimiento' => 'nullable|date|after:fecha_emision',
            'entidad_emisora' => 'nullable|string|max:120',
            'numero_certificado' => 'nullable|string|max:80',
            'archivo_url' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'competencia_id.required' => 'La competencia es obligatoria.',
            'competencia_id.exists' => 'La competencia seleccionada no existe.',
            'fecha_emision.required' => 'La fecha de emisión es obligatoria.',
            'fecha_emision.before_or_equal' => 'La fecha de emisión no puede ser futura.',
            'fecha_vencimiento.after' => 'La fecha de vencimiento debe ser posterior a la de emisión.',
        ];
    }
}
