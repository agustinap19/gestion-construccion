<?php

namespace App\Http\Requests\Proyectos;

use Illuminate\Foundation\Http\FormRequest;

class ActualizarProyectoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre'                   => 'sometimes|string|max:255',
            'descripcion'              => 'nullable|string|max:2000',
            'prioridad'                => 'nullable|in:baja,media,alta,critica',
            'cantidad_unidades'        => 'nullable|integer|min:0',
            'zona_id'                  => 'nullable|exists:zonas_geograficas,id',
            'responsable_id'           => 'nullable|exists:users,id',
            'presupuesto_referencial'  => 'sometimes|numeric|min:0',
            'monto_contrato'           => 'nullable|numeric|min:0',
            'monto_contractual'        => 'nullable|numeric|min:0',
            'porcentaje_mano_obra'         => 'nullable|numeric|min:0|max:100',
            'porcentaje_gastos_generales'  => 'nullable|numeric|min:0|max:100',
            'porcentaje_utilidad_esperada' => 'nullable|numeric|min:0|max:100',
            'justificacion_rentabilidad_baja' => 'nullable|string|max:1000',
            'fecha_inicio_planificada' => 'sometimes|date',
            'fecha_fin_planificada'    => 'sometimes|date|after:fecha_inicio_planificada',
            'fecha_inicio_real'        => 'nullable|date',
            'fecha_fin_real'           => 'nullable|date',
            'direccion_obra'           => 'nullable|string|max:500',
            'latitud'                  => 'nullable|numeric|between:-90,90',
            'longitud'                 => 'nullable|numeric|between:-180,180',
            'observaciones'            => 'nullable|string|max:2000',

            // Optimización de activos (Simplex)
            'avance_esperado'        => 'nullable|numeric|min:0|max:100',
            'penalidad_diaria'       => 'nullable|numeric|min:0',
            'dias_estimados_activo'  => 'nullable|integer|min:1',
        ];
    }
}
