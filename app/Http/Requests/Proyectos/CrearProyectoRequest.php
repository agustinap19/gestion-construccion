<?php

namespace App\Http\Requests\Proyectos;

use Illuminate\Foundation\Http\FormRequest;

class CrearProyectoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre'                   => 'required|string|max:255',
            'descripcion'              => 'nullable|string|max:2000',
            'categoria'                => 'required|in:social,privado',
            'tipo_proyecto_id'         => 'nullable|exists:tipos_proyecto,id',
            'cliente_id'               => 'nullable|exists:clientes,id',
            'entidad_estatal_id'       => 'nullable|exists:entidades_estatales,id',
            'zona_id'                  => 'nullable|exists:zonas_geograficas,id',
            'administrador_id'         => 'nullable|exists:usuarios,id',
            'presupuesto_total'        => 'required|numeric|min:0',
            'monto_garantia'           => 'nullable|numeric|min:0',
            'cantidad_unidades'        => 'nullable|integer|min:0',
            'prioridad'                => 'nullable|in:baja,media,alta,critica',
            'fecha_inicio_planificada' => 'required|date',
            'fecha_fin_planificada'    => 'required|date|after:fecha_inicio_planificada',
            'direccion_obra'           => 'nullable|string|max:500',
            'latitud'                  => 'nullable|numeric|between:-90,90',
            'longitud'                 => 'nullable|numeric|between:-180,180',
            'observaciones'            => 'nullable|string|max:2000',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre del proyecto es obligatorio.',
            'categoria.required' => 'Debe seleccionar la categoría del proyecto.',
            'presupuesto_total.required' => 'El presupuesto total es obligatorio.',
            'fecha_inicio_planificada.required' => 'La fecha de inicio es obligatoria.',
            'fecha_fin_planificada.after' => 'La fecha de fin debe ser posterior a la de inicio.',
        ];
    }
}
