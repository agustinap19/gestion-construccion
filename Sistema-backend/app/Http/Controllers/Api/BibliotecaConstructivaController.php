<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Almacenes\BibliotecaConstructivaService;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Exception;

class BibliotecaConstructivaController extends Controller
{
    public function __construct(protected BibliotecaConstructivaService $service) {}

    // ─── Categorías ──────────────────────────────────────────────────────────

    public function categorias(Request $request)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        return response()->json(['status' => 'success', 'data' => $this->service->listarCategorias()]);
    }

    public function crearCategoria(Request $request)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        $request->validate([
            'nombre'      => 'required|string|max:80|unique:categorias_constructivas,nombre',
            'color'       => 'nullable|string|max:20',
            'orden'       => 'nullable|integer|min:0',
            'descripcion' => 'nullable|string|max:300',
        ]);

        try {
            $cat = $this->service->crearCategoria($request->all());
            return response()->json(['status' => 'success', 'data' => $cat], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function actualizarCategoria(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        $request->validate([
            'nombre' => "sometimes|string|max:80|unique:categorias_constructivas,nombre,{$id}",
            'color'  => 'nullable|string|max:20',
            'orden'  => 'nullable|integer|min:0',
        ]);

        try {
            $cat = $this->service->actualizarCategoria($id, $request->all());
            return response()->json(['status' => 'success', 'data' => $cat]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function eliminarCategoria(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        try {
            $this->service->eliminarCategoria($id);
            return response()->json(['status' => 'success', 'message' => 'Categoría eliminada.']);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    // ─── Ítems Constructivos ─────────────────────────────────────────────────

    public function index(Request $request)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        $data = $this->service->listarItems($request->all(), $request->integer('per_page', 20));
        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function show(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.ver')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        try {
            $item = $this->service->obtenerItem($id);
            return response()->json(['status' => 'success', 'data' => $item]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 404);
        }
    }

    public function store(Request $request)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        $request->validate([
            'nombre'                    => 'required|string|max:150',
            'codigo'                    => 'nullable|string|max:20|unique:items_constructivos,codigo',
            'categoria_constructiva_id' => 'required|integer|exists:categorias_constructivas,id',
            'unidad_base'               => 'required|in:m3,m2,ml,pza,glb,kg',
            'descripcion'               => 'nullable|string',
            'precio_unitario_referencial' => 'nullable|numeric|min:0',
            'receta'                    => 'nullable|array',
            'receta.*.material_id'      => 'required|integer|exists:materiales,id',
            'receta.*.cantidad_por_unidad_base' => 'required|numeric|min:0.0001',
            'receta.*.unidad_material'  => 'nullable|string|max:30',
        ]);

        try {
            $item = $this->service->crearItem($request->all(), $request->user()->id);
            return response()->json(['status' => 'success', 'message' => 'Ítem creado.', 'data' => $item], 201);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function update(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        $request->validate([
            'nombre'   => 'sometimes|string|max:150',
            'codigo'   => "nullable|string|max:20|unique:items_constructivos,codigo,{$id}",
            'unidad_base' => 'sometimes|in:m3,m2,ml,pza,glb,kg',
            'receta'   => 'nullable|array',
            'receta.*.material_id' => 'required|integer|exists:materiales,id',
            'receta.*.cantidad_por_unidad_base' => 'required|numeric|min:0.0001',
        ]);

        try {
            $item = $this->service->actualizarItem($id, $request->all(), $request->user()->id);
            return response()->json(['status' => 'success', 'data' => $item]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function cambiarEstado(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        $request->validate(['estado' => 'required|boolean']);

        try {
            $item = $this->service->cambiarEstado($id, (bool) $request->input('estado'), $request->user()->id);
            return response()->json(['status' => 'success', 'data' => $item]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function destroy(Request $request, int $id)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }
        try {
            $this->service->eliminarItem($id);
            return response()->json(['status' => 'success', 'message' => 'Ítem eliminado.']);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    // ─── Importador Excel ────────────────────────────────────────────────────

    public function descargarPlantillaExcel(Request $request)
    {
        return Excel::download(new class implements \Maatwebsite\Excel\Concerns\FromArray, \Maatwebsite\Excel\Concerns\WithHeadings {
            public function array(): array {
                return [
                    ['ITM-EJ1', 'Ejemplo: Zapata H°A°', 'Cimientos', 'm3', 'Zapata de hormigón armado H21']
                ];
            }
            public function headings(): array {
                return ['codigo', 'nombre', 'categoria', 'unidad_base', 'descripcion'];
            }
        }, 'plantilla_items_constructivos.xlsx');
    }

    public function importarExcel(Request $request)
    {
        if (!$request->user()->hasPermissionTo('biblioteca_constructiva.gestionar')) {
            return response()->json(['status' => 'error', 'message' => 'Sin permiso.'], 403);
        }

        $request->validate(['archivo' => 'required|file|mimes:csv,xlsx,xls|max:5120']);

        try {
            $archivo = $request->file('archivo');
            $filas   = [];

            if ($archivo->getClientOriginalExtension() === 'csv') {
                $handle = fopen($archivo->getPathname(), 'r');
                $cabecera = fgetcsv($handle);
                while (($row = fgetcsv($handle)) !== false) {
                    $filas[] = array_combine($cabecera, $row);
                }
                fclose($handle);
            } else {
                $import = new \App\Imports\ItemsConstructivosImport();
                Excel::import($import, $archivo);
                $filas = $import->getRows();
            }

            if (empty($filas)) {
                return response()->json(['status' => 'error', 'message' => 'El archivo está vacío o no tiene el formato correcto.'], 422);
            }

            $resultado = $this->service->importarDesdeArray($filas, $request->user()->id);

            return response()->json([
                'status'  => 'success',
                'message' => "Importación completada: {$resultado['creados']} creados, {$resultado['actualizados']} actualizados.",
                'data'    => $resultado,
            ]);
        } catch (Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
}
