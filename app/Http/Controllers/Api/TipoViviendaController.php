<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TipoVivienda\CrearTipologiaRequest;
use App\Http\Requests\TipoVivienda\ActualizarTipologiaRequest;
use App\Models\TipoVivienda;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TipoViviendaController extends Controller
{
    public function index(): JsonResponse
    {
        $tipos = TipoVivienda::select('id', 'nombre', 'descripcion', 'plano_url', 'metros_cuadrados', 'cantidad_dormitorios', 'cantidad_banos', 'costo_referencial', 'estado', 'plantilla_constructiva_id')
            ->orderBy('nombre')
            ->get();
        return response()->json(['status' => 'success', 'data' => $tipos]);
    }

    public function store(CrearTipologiaRequest $request): JsonResponse
    {
        $tipo = TipoVivienda::create(array_merge($request->validated(), ['estado' => 'activo']));
        return response()->json(['status' => 'success', 'data' => $tipo, 'message' => 'Tipología creada exitosamente.'], 201);
    }

    public function show(int $id): JsonResponse
    {
        $tipo = TipoVivienda::findOrFail($id);
        return response()->json(['status' => 'success', 'data' => $tipo]);
    }

    public function update(ActualizarTipologiaRequest $request, int $id): JsonResponse
    {
        $tipo = TipoVivienda::findOrFail($id);
        $tipo->update($request->validated());
        return response()->json(['status' => 'success', 'data' => $tipo, 'message' => 'Tipología actualizada.']);
    }

    public function cambiarEstado(Request $request, int $id): JsonResponse
    {
        $request->validate(['estado' => 'required|in:activo,inactivo']);
        $tipo = TipoVivienda::findOrFail($id);
        $tipo->estado = $request->estado;
        $tipo->save();
        return response()->json(['status' => 'success', 'data' => $tipo, 'message' => 'Estado de tipología actualizado.']);
    }

    public function destroy(int $id): JsonResponse
    {
        $tipo = TipoVivienda::findOrFail($id);
        $enUso = $tipo->beneficiarios()->exists();
        if ($enUso) {
            return response()->json(['status' => 'error', 'message' => 'No se puede eliminar: hay beneficiarios con esta tipología asignada.'], 422);
        }
        $tipo->delete();
        return response()->json(['status' => 'success', 'message' => 'Tipología eliminada.']);
    }
}
