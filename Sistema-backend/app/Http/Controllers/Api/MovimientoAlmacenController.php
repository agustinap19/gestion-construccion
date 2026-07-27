<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MovimientoAlmacen;
use App\Services\Almacenes\EntregaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MovimientoAlmacenController extends Controller
{
    public function __construct(private EntregaService $entregaService) {}

    private function denyUnless(Request $request, string $permiso): ?JsonResponse
    {
        if (!$request->user()->hasPermissionTo($permiso)) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }
        return null;
    }

    // ─── Listado ─────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        if ($deny = $this->denyUnless($request, 'movimientos.ver')) return $deny;

        $q = MovimientoAlmacen::with([
            'almacenOrigen:id,nombre,codigo',
            'almacenDestino:id,nombre,codigo',
            'beneficiario:id,nombre,apellido_paterno',
            'receptorPersonal:id,nombre,apellido_paterno',
            'registradoPor:id,name',
            'detalles.material:id,nombre,codigo,unidad_medida_id',
            'presupuestoItem.itemConstructivo:id,nombre,codigo',
            'proveedor:id,codigo,razon_social',
        ])->latest('fecha_movimiento');

        if ($almacenId = $request->almacen_id) {
            $q->where(fn($q) =>
                $q->where('almacen_origen_id', $almacenId)
                  ->orWhere('almacen_destino_id', $almacenId)
            );
        }
        if ($tipo = $request->tipo) {
            $q->where('tipo', $tipo);
        }
        if ($estado = $request->estado) {
            $q->where('estado', $estado);
        }
        if ($proyectoId = $request->proyecto_id) {
            $q->where('proyecto_id', $proyectoId);
        }
        if ($beneficiarioId = $request->beneficiario_id) {
            $q->where('beneficiario_id', $beneficiarioId);
        }
        if ($desde = $request->fecha_desde) {
            $q->whereDate('fecha_movimiento', '>=', $desde);
        }
        if ($hasta = $request->fecha_hasta) {
            $q->whereDate('fecha_movimiento', '<=', $hasta);
        }
        if ($busqueda = $request->busqueda) {
            $q->where(fn($q) =>
                $q->where('codigo', 'like', "%{$busqueda}%")
                  ->orWhere('numero_factura', 'like', "%{$busqueda}%")
                  ->orWhere('proveedor_nombre', 'like', "%{$busqueda}%")
                  ->orWhere('receptor_nombre', 'like', "%{$busqueda}%")
            );
        }

        return response()->json(
            $q->paginate($request->per_page ?? 20)
        );
    }

    public function show(Request $request, MovimientoAlmacen $movimientoAlmacen): JsonResponse
    {
        if ($deny = $this->denyUnless($request, 'movimientos.ver')) return $deny;

        return response()->json(
            $movimientoAlmacen->load([
                'almacenOrigen',
                'almacenDestino',
                'proyecto:id,nombre,codigo',
                'beneficiario',
                'presupuestoItem.itemConstructivo',
                'receptorPersonal',
                'registradoPor:id,name',
                'aprobadoPor:id,name',
                'anuladoPor:id,name',
                'detalles.material',
                'evidencias',
                'proveedor:id,codigo,razon_social,telefono_principal,email_oficial',
            ])
        );
    }

    // ─── Entrada (compra) ─────────────────────────────────────────────────────────

    public function registrarEntrada(Request $request): JsonResponse
    {
        if ($deny = $this->denyUnless($request, 'movimientos.crear_entrada')) return $deny;

        $validated = $request->validate([
            'almacen_id'         => 'required|exists:almacenes,id',
            'proyecto_id'        => 'nullable|exists:proyectos,id',
            'proveedor_id'       => 'nullable|exists:proveedores,id',
            'proveedor_nombre'   => 'nullable|string|max:150',
            'numero_factura'     => 'nullable|string|max:60',
            'fecha_factura'      => 'nullable|date',
            'archivo_factura_url'=> 'nullable|string',
            'notas'              => 'nullable|string',
            'materiales'         => 'required|array|min:1',
            'materiales.*.material_id'    => 'required|exists:materiales,id',
            'materiales.*.cantidad'       => 'required|numeric|min:0.0001',
            'materiales.*.precio_unitario'=> 'required|numeric|min:0',
            'evidencias'                  => 'nullable|array',
            'evidencias.*.tipo'           => 'required_with:evidencias|in:foto,documento',
            'evidencias.*.base64'         => 'nullable|string',
            'evidencias.*.archivo_url'    => 'nullable|string',
            'evidencias.*.latitud'        => 'nullable|numeric',
            'evidencias.*.longitud'       => 'nullable|numeric',
            'evidencias.*.dispositivo'    => 'nullable|string|max:100',
        ]);

        $movimiento = $this->entregaService->registrarEntrada($validated, auth()->id());
        return response()->json($movimiento, 201);
    }

    // ─── Salida social ────────────────────────────────────────────────────────────

    public function registrarSalidaSocial(Request $request): JsonResponse
    {
        if ($deny = $this->denyUnless($request, 'movimientos.crear_salida_social')) return $deny;

        $validated = $request->validate([
            'almacen_id'                    => 'required|exists:almacenes,id',
            'beneficiario_id'               => 'required|exists:beneficiarios,id',
            'material_id'                   => 'required|exists:materiales,id',
            'cantidad_total'                => 'required|numeric|min:0.0001',
            // items_distribucion: uno por ítem. Vacío = entrega adicional sin ítem
            'items_distribucion'            => 'nullable|array',
            'items_distribucion.*.presupuesto_item_proyecto_id' => 'required_with:items_distribucion|exists:presupuesto_items_proyecto,id',
            'items_distribucion.*.cantidad' => 'required_with:items_distribucion|numeric|min:0.0001',
            'items_distribucion.*.justificacion' => 'nullable|string',
            'justificacion_sobre_consumo'   => 'nullable|string',
            'aprobado_por_id'               => 'nullable|exists:users,id',
            'notas'                         => 'nullable|string',
            'evidencias'                    => 'nullable|array',
            'evidencias.*.tipo'             => 'required_with:evidencias|in:foto,firma,documento',
            'evidencias.*.base64'           => 'nullable|string',
            'evidencias.*.archivo_url'      => 'nullable|string',
            'evidencias.*.latitud'          => 'nullable|numeric',
            'evidencias.*.longitud'         => 'nullable|numeric',
        ]);

        $movimientos = $this->entregaService->registrarSalidaSocial($validated, auth()->id());
        return response()->json(['movimientos' => $movimientos], 201);
    }

    // ─── Salida privada ───────────────────────────────────────────────────────────

    public function registrarSalidaPrivada(Request $request): JsonResponse
    {
        if ($deny = $this->denyUnless($request, 'movimientos.crear_salida_privado')) return $deny;

        $validated = $request->validate([
            'almacen_id'            => 'required|exists:almacenes,id',
            'proyecto_id'           => 'nullable|exists:proyectos,id',
            'receptor_personal_id'  => 'nullable|exists:personal,id',
            'receptor_nombre'       => 'nullable|string|max:120',
            'receptor_ci'           => 'nullable|string|max:20',
            'notas'                 => 'nullable|string',
            'materiales'            => 'required|array|min:1',
            'materiales.*.material_id' => 'required|exists:materiales,id',
            'materiales.*.cantidad'    => 'required|numeric|min:0.0001',
            'evidencias'            => 'nullable|array',
            'evidencias.*.tipo'     => 'required_with:evidencias|in:foto,firma,documento',
            'evidencias.*.base64'   => 'nullable|string',
            'evidencias.*.archivo_url'=> 'nullable|string',
        ]);

        $movimiento = $this->entregaService->registrarSalidaPrivada($validated, auth()->id());
        return response()->json($movimiento, 201);
    }

    // ─── Transferencia ────────────────────────────────────────────────────────────

    public function registrarTransferencia(Request $request): JsonResponse
    {
        if ($deny = $this->denyUnless($request, 'movimientos.transferir')) return $deny;

        $validated = $request->validate([
            'almacen_origen_id'  => 'required|exists:almacenes,id|different:almacen_destino_id',
            'almacen_destino_id' => 'required|exists:almacenes,id',
            'proyecto_id'        => 'nullable|exists:proyectos,id',
            'notas'              => 'nullable|string',
            'materiales'         => 'required|array|min:1',
            'materiales.*.material_id' => 'required|exists:materiales,id',
            'materiales.*.cantidad'    => 'required|numeric|min:0.0001',
        ]);

        $movimiento = $this->entregaService->registrarTransferencia($validated, auth()->id());
        return response()->json($movimiento, 201);
    }

    // ─── Devolución a Central ─────────────────────────────────────────────────────

    public function devolverCentral(Request $request, int $almacenId): JsonResponse
    {
        if ($deny = $this->denyUnless($request, 'movimientos.transferir')) return $deny;

        try {
            $movimiento = $this->entregaService->devolverCentral($almacenId, auth()->id());
            return response()->json($movimiento, 201);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // ─── Anulación ────────────────────────────────────────────────────────────────

    public function anular(Request $request, MovimientoAlmacen $movimientoAlmacen): JsonResponse
    {
        if ($deny = $this->denyUnless($request, 'movimientos.anular')) return $deny;

        $request->validate([
            'motivo' => 'required|string|min:10',
        ]);

        $movimiento = $this->entregaService->anular(
            $movimientoAlmacen,
            $request->motivo,
            auth()->id()
        );

        return response()->json($movimiento);
    }

    // ─── Confirmar recepción de transferencia ─────────────────────────────────────

    public function confirmarTransferencia(Request $request, MovimientoAlmacen $movimientoAlmacen): JsonResponse
    {
        if ($deny = $this->denyUnless($request, 'movimientos.transferir')) return $deny;

        try {
            $movimiento = $this->entregaService->confirmarRecepcionTransferencia(
                $movimientoAlmacen,
                auth()->id()
            );
            return response()->json($movimiento);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // ─── Validar sobre-consumo (previo al guardado) ───────────────────────────────

    public function validarConsumo(Request $request): JsonResponse
    {
        if ($deny = $this->denyUnless($request, 'movimientos.crear_salida_social')) return $deny;

        $request->validate([
            'presupuesto_item_proyecto_id' => 'required|exists:presupuesto_items_proyecto,id',
            'materiales'                   => 'required|array|min:1',
            'materiales.*.material_id'     => 'required|integer',
            'materiales.*.cantidad'        => 'required|numeric|min:0',
        ]);

        $resultado = $this->entregaService->validarSobreConsumo(
            $request->presupuesto_item_proyecto_id,
            $request->materiales
        );

        return response()->json(['validacion' => $resultado]);
    }
}
