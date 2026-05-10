<?php

namespace App\Http\Requests\Proyectos;

use Illuminate\Foundation\Http\FormRequest;

class ActualizarProyectoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre'                  => 'sometimes|string|max:255',
            'descripcion'             => 'nullable|string|max:2000',
            'zona_id'                 => 'nullable|exists:zonas_geograficas,id',
            'administrador_id'        => 'nullable|exists:usuarios,id',
            'presupuesto_total'       => 'sometimes|numeric|min:0',
            'monto_garantia'          => 'nullable|numeric|min:0',
            'cantidad_unidades'       => 'nullable|integer|min:0',
            'prioridad'               => 'nullable|in:baja,media,alta,critica',
            'fecha_inicio_planificada' => 'sometimes|date',
            'fecha_fin_planificada'   => 'sometimes|date|after:fecha_inicio_planificada',
            'fecha_inicio_real'       => 'nullable|date',
            'fecha_fin_real'          => 'nullable|date',
            'direccion_obra'          => 'nullable|string|max:500',
            'latitud'                 => 'nullable|numeric|between:-90,90',
            'longitud'                => 'nullable|numeric|between:-180,180',
            'observaciones'           => 'nullable|string|max:2000',
        ];
    }
}
