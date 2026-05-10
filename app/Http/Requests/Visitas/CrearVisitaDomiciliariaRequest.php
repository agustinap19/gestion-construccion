<?php

namespace App\Http\Requests\Visitas;

use Illuminate\Foundation\Http\FormRequest;

class CrearVisitaDomiciliariaRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'proyecto_id' => 'required|exists:proyectos,id',
            'beneficiario_id' => 'nullable|exists:beneficiarios,id',
            'personal_id' => 'nullable|exists:personal,id',
            'fecha_visita' => 'required|date|before_or_equal:today',
            'hora_visita' => 'nullable|date_format:H:i',
            'latitud_visita' => 'nullable|numeric|between:-90,90',
            'longitud_visita' => 'nullable|numeric|between:-180,180',
            'tipo_visita' => 'required|in:inicial,seguimiento,verificacion,cierre,otra',
            'resultado' => 'required|in:exitosa,no_encontrado,rechazado_por_familia,reprogramada,otro',
            'observaciones' => 'nullable|string',
            'documentos_recolectados' => 'nullable|string',
            'gasto_transporte' => 'nullable|numeric|min:0',
            'foto_visita_url' => 'nullable|string|max:255',
        ];
    }
}
