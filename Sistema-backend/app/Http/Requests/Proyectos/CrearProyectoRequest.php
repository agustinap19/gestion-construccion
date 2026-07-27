<?php

namespace App\Http\Requests\Proyectos;

use Illuminate\Foundation\Http\FormRequest;

class CrearProyectoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            // Identidad
            'nombre'      => 'required|string|max:255',
            'descripcion' => 'nullable|string|max:2000',
            'categoria'   => 'required|in:social,privado',
            'prioridad'   => 'nullable|in:baja,media,alta,critica',
            'tipo_obra'   => 'nullable|in:vivienda_unifamiliar,edificio,remodelacion,ampliacion,otro',

            // Contraparte
            'cliente_id'         => 'nullable|exists:clientes,id',
            'entidad_estatal_id' => 'nullable|exists:entidades_estatales,id',

            // Ubicación
            'zona_id'       => 'nullable|exists:zonas_geograficas,id',
            'direccion_obra' => 'nullable|string|max:500',
            'latitud'        => 'nullable|numeric|between:-90,90',
            'longitud'       => 'nullable|numeric|between:-180,180',

            // Ubicación extendida
            'comunidad' => 'nullable|string|max:255',

            // Finanzas — monto_contractual es el campo principal; presupuesto_referencial se acepta por legado
            'monto_contractual'        => 'nullable|numeric|min:0',
            'presupuesto_referencial'  => 'nullable|numeric|min:0',
            'monto_contrato'           => 'nullable|numeric|min:0',
            // Porcentajes financieros (opcionales; si no vienen se copian del set)
            'porcentaje_mano_obra'         => 'nullable|numeric|min:0|max:100',
            'porcentaje_gastos_generales'  => 'nullable|numeric|min:0|max:100',
            'porcentaje_utilidad_esperada' => 'nullable|numeric|min:0|max:100',
            // Override montos fijos
            'usa_monto_fijo_mo'             => 'nullable|boolean',
            'usa_monto_fijo_gg'             => 'nullable|boolean',
            'usa_monto_fijo_util'           => 'nullable|boolean',
            'presupuesto_mano_obra'         => 'nullable|numeric|min:0',
            'presupuesto_gastos_generales'  => 'nullable|numeric|min:0',
            'presupuesto_utilidad_esperada' => 'nullable|numeric|min:0',
            'presupuesto_materiales'        => 'nullable|numeric|min:0',
            'aplica_retencion_7_porciento'  => 'nullable|boolean',
            'justificacion_rentabilidad_baja' => 'nullable|string|max:2000',
            'contrato_pdf'             => 'nullable|file|mimes:pdf|max:10240',

            // Cronograma
            'fecha_inicio_planificada' => 'required|date',
            'fecha_fin_planificada'    => 'required|date|after:fecha_inicio_planificada',

            // Optimización de activos (Simplex)
            'avance_esperado'        => 'nullable|numeric|min:0|max:100',
            'penalidad_diaria'       => 'nullable|numeric|min:0',
            'dias_estimados_activo'  => 'nullable|integer|min:1',

            // Personal
            'responsable_id' => 'nullable|exists:users,id',

            // Proyecto privado — fases
            'cantidad_fases'                => 'nullable|integer|min:1|max:50',
            'fases_config'                  => 'nullable|array|max:50',
            'fases_config.*.nombre'         => 'nullable|string|max:120',
            'fases_config.*.porcentaje'     => 'nullable|numeric|min:0|max:100',

            // Proyecto social — beneficiarios
            'cantidad_beneficiarios'         => 'nullable|integer|min:1|max:5000',

            // Hitos de cobro (social: productos SICOOES, privado: hitos negociados)
            'hitos_cobro'                         => 'nullable|array|max:20',
            'hitos_cobro.*.nombre'                => 'required_with:hitos_cobro|string|max:255',
            'hitos_cobro.*.porcentaje'            => 'required_with:hitos_cobro|numeric|min:0|max:100',
            'hitos_cobro.*.fecha_planificada'     => 'nullable|date',
            'hitos_cobro.*.vinculacion_fase_id'   => 'nullable|integer',

            // Legado: productos_contractuales sigue siendo aceptado
            'productos_contractuales'                           => 'nullable|array|max:20',
            'productos_contractuales.*.nombre'                  => 'required_with:productos_contractuales|string|max:255',
            'productos_contractuales.*.porcentaje'              => 'required_with:productos_contractuales|numeric|min:0|max:100',
            'productos_contractuales.*.fecha_planificada_cobro' => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required'                    => 'El nombre del proyecto es obligatorio.',
            'categoria.required'                 => 'Debe seleccionar la categoría del proyecto.',
            'monto_contractual.min'              => 'El monto contractual debe ser mayor a 0.',
            'fecha_inicio_planificada.required'  => 'La fecha de inicio es obligatoria.',
            'fecha_fin_planificada.after'        => 'La fecha de fin debe ser posterior a la de inicio.',
            'contrato_pdf.max'                   => 'El contrato no debe superar 10 MB.',
            'contrato_pdf.mimes'                 => 'El contrato debe ser un archivo PDF.',
            'cantidad_fases.max'                 => 'El proyecto no puede tener más de 50 fases.',
            'cantidad_beneficiarios.max'         => 'El proyecto no puede tener más de 5.000 beneficiarios.',
        ];
    }
}
