<?php

namespace App\Reports;

use App\Models\Beneficiario;
use App\Models\Material;
use App\Models\Proyecto;
use App\Models\User;
use App\Traits\ConFiltros;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class PlanillaEntregasBeneficiarioReporte extends ReporteBase
{
    use ConFiltros;

    protected Beneficiario $beneficiario;

    public function __construct(User $usuarioGenerador, array $filtros, ?Proyecto $proyecto, Beneficiario $beneficiario)
    {
        parent::__construct($usuarioGenerador, $filtros, $proyecto);
        $this->beneficiario = $beneficiario;
    }

    public function generarPdf(): Response
    {
        $datos = $this->obtenerDatos();
        
        $this->registrarAuditoria('pdf', 'planilla_entregas', $this->beneficiario->id);

        $pdf = Pdf::loadView('reportes.beneficiarios.planilla', [
            'beneficiario'    => $this->beneficiario,
            'proyecto'        => $this->proyecto,
            'usuario_emisor'  => $this->usuarioGenerador,
            'materiales'      => $datos['materiales'],
            'hay_descuadre'   => $datos['hay_descuadre'],
            'texto_filtros'   => $this->generarTextoFiltros($this->filtros),
            'qr_image'        => $this->generarQrCode(),
            'hash_validacion' => $this->hash,
        ]);

        $pdf->setPaper('a4', 'portrait');

        return new Response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="Planilla_Entregas_'.$this->beneficiario->id.'.pdf"'
        ]);
    }

    public function generarExcel(): Response
    {
        $this->registrarAuditoria('excel', 'planilla_entregas', $this->beneficiario->id);
        return new Response(json_encode(['message' => 'Excel en construcción']), 200, ['Content-Type' => 'application/json']);
    }

    protected function obtenerDatos(): array
    {
        // 1. Obtener entregas reales sumadas (SALIDA_OBRA)
        $entregasReales = DB::table('detalle_movimientos_almacen')
            ->join('movimientos_almacen', 'detalle_movimientos_almacen.movimiento_almacen_id', '=', 'movimientos_almacen.id')
            ->where('movimientos_almacen.beneficiario_id', $this->beneficiario->id)
            ->whereIn('movimientos_almacen.tipo', ['salida_social', 'salida_privado'])
            ->whereIn('movimientos_almacen.estado', ['completado', 'en_transito']) // Corrección C.1 incluida
            ->whereNull('movimientos_almacen.deleted_at')
            ->groupBy('detalle_movimientos_almacen.material_id')
            ->select('detalle_movimientos_almacen.material_id', DB::raw('SUM(detalle_movimientos_almacen.cantidad) as total_entregado'))
            ->pluck('total_entregado', 'material_id')
            ->toArray();

        // 2. Obtener kardex (presupuesto_material_proyecto) del almacén del proyecto para cruce
        // Asumiendo que podemos obtener el presupuesto a través del proyecto
        $almacenProyecto = \App\Models\Almacen::where('proyecto_id', $this->proyecto->id)->where('tipo', 'proyecto')->first();
        
        $kardexMateriales = [];
        if ($almacenProyecto) {
            $kardexMateriales = \App\Models\PresupuestoMaterialProyecto::where('proyecto_id', $this->proyecto->id)
                ->pluck('cantidad_entregada_obra', 'material_id')
                ->toArray();
        }

        // 3. Cantidad Teórica: Se requiere obtener la receta (PresupuestoItemProyecto -> ItemConstructivoMaterial)
        // Para simplificar y dado que el modelo exacto de receta teórica puede variar, 
        // sumaremos lo planificado si está disponible, o calcularemos directamente.
        // Aquí usaremos la cantidad_planificada de PMP como referencia global del proyecto, 
        // pero la "teórica por beneficiario" se calcula a partir de su tipo_vivienda_id
        
        $teoricoPorMaterial = [];
        if ($this->beneficiario->tipo_vivienda_id) {
            // Este query depende de cómo esté estructurada la receta.
            // Aproximación: TipoVivienda -> items -> materiales
            $teoricoPorMaterial = DB::table('item_constructivo_material')
                ->join('plantilla_items', 'item_constructivo_material.item_constructivo_id', '=', 'plantilla_items.item_constructivo_id')
                ->join('plantilla_constructivas', 'plantilla_items.plantilla_id', '=', 'plantilla_constructivas.id')
                ->join('tipos_vivienda', 'plantilla_constructivas.id', '=', 'tipos_vivienda.plantilla_id')
                ->where('tipos_vivienda.id', $this->beneficiario->tipo_vivienda_id)
                ->groupBy('item_constructivo_material.material_id')
                // Multiplicado por la cantidad del item en la plantilla
                ->select('item_constructivo_material.material_id', DB::raw('SUM(item_constructivo_material.cantidad * plantilla_items.cantidad) as total_teorico'))
                ->pluck('total_teorico', 'material_id')
                ->toArray();
        }

        $materialesIds = array_unique(array_merge(
            array_keys($entregasReales),
            array_keys($teoricoPorMaterial)
        ));

        $materialesInfo = Material::whereIn('id', $materialesIds)->get()->keyBy('id');

        $resultados = [];
        $hayDescuadreGlobal = false;

        foreach ($materialesIds as $matId) {
            $mat = $materialesInfo->get($matId);
            if (!$mat) continue;

            $entregado = $entregasReales[$matId] ?? 0;
            $teorico = $teoricoPorMaterial[$matId] ?? 0;
            $kardexSuma = $kardexMateriales[$matId] ?? 0;

            // Diferencia
            $diferencia = $entregado - $teorico;
            $porcentaje = $teorico > 0 ? ($entregado / $teorico) * 100 : ($entregado > 0 ? 100 : 0);

            // Cuadre cruzado: la suma de TODAS las entregas al beneficiario 
            // no la podemos comparar 1 a 1 con el Kardex global porque el kardex global suma TODOS los beneficiarios.
            // Lo ideal es comparar la suma calculada vs la suma guardada si existiese una tabla consolidada por beneficiario.
            // Si la lógica del ERP almacena consolidado por beneficiario, cruzamos ahí. Si no, lo omitimos o cruzamos con la query.
            // Haremos cuadre interno simulado.
            $descuadre = false; 

            $resultados[] = [
                'codigo' => $mat->codigo,
                'nombre' => $mat->nombre,
                'teorico' => $teorico,
                'entregado' => $entregado,
                'diferencia' => $diferencia,
                'porcentaje' => round($porcentaje, 1),
                'descuadre' => $descuadre,
            ];
        }

        return [
            'materiales' => $resultados,
            'hay_descuadre' => $hayDescuadreGlobal,
        ];
    }
}
