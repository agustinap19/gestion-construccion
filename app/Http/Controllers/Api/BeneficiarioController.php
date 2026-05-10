<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Beneficiarios\BeneficiarioService;
use App\Http\Requests\Beneficiarios\CrearBeneficiarioRequest;
use App\Http\Requests\Beneficiarios\ActualizarBeneficiarioRequest;
use App\Http\Requests\Beneficiarios\CambiarEstadoBeneficiarioRequest;
use App\Http\Requests\Beneficiarios\AsignarTipoViviendaRequest;
use Illuminate\Http\Request;

class BeneficiarioController extends Controller
{
    protected $beneficiarioService;

    public function __construct(BeneficiarioService $beneficiarioService)
    {
        $this->beneficiarioService = $beneficiarioService;
        
        // Asumiendo que hay un middleware de permisos
        // $this->middleware('permission:beneficiarios.ver')->only(['index', 'show', 'estadisticasProyecto', 'mapaProyecto']);
        // $this->middleware('permission:beneficiarios.crear')->only('store');
        // $this->middleware('permission:beneficiarios.editar')->only('update', 'asignarTipoVivienda');
        // $this->middleware('permission:beneficiarios.cambiar_estado')->only('cambiarEstado');
        // $this->middleware('permission:beneficiarios.eliminar')->only('destroy');
    }

    public function index(Request $request)
    {
        $filtros = $request->all();
        $perPage = $request->input('per_page', 20);
        $beneficiarios = $this->beneficiarioService->listarConFiltros($filtros, $perPage);
        return response()->json($beneficiarios);
    }

    public function show(Request $request, int $id)
    {
        $actorId = $request->user()->id;
        $puedeVerDatosSensibles = $request->user()->hasPermissionTo('beneficiarios.ver_datos_sensibles');
        
        $data = $this->beneficiarioService->obtenerCompleto($id, $actorId, $puedeVerDatosSensibles);
        return response()->json($data);
    }

    public function store(CrearBeneficiarioRequest $request)
    {
        $beneficiario = $this->beneficiarioService->crear(
            $request->validated(),
            $request->user()->id
        );
        return response()->json($beneficiario, 201);
    }

    public function update(ActualizarBeneficiarioRequest $request, int $id)
    {
        $beneficiario = $this->beneficiarioService->actualizar(
            $id,
            $request->validated(),
            $request->user()->id
        );
        return response()->json($beneficiario);
    }

    public function cambiarEstado(CambiarEstadoBeneficiarioRequest $request, int $id)
    {
        $esGerente = $request->user()->hasRole('gerente');
        
        $beneficiario = $this->beneficiarioService->cambiarEstado(
            $id,
            $request->estado_seleccion,
            $request->razon,
            $request->user()->id,
            $esGerente
        );
        return response()->json($beneficiario);
    }

    public function asignarTipoVivienda(AsignarTipoViviendaRequest $request, int $id)
    {
        $beneficiario = $this->beneficiarioService->asignarTipoVivienda(
            $id,
            $request->tipo_vivienda_id,
            $request->user()->id
        );
        return response()->json($beneficiario);
    }

    public function destroy(Request $request, int $id)
    {
        $this->beneficiarioService->eliminar(
            $id,
            $request->user()->id,
            $request->input('razon')
        );
        return response()->json(['message' => 'Beneficiario eliminado correctamente.']);
    }

    public function restaurar(Request $request, int $id)
    {
        // En este diseño solo el gerente puede restaurar, el service puede no tener el metodo restaurar
        // Por lo general se usa el cambiarEstado('aceptado') pero si se usa SoftDeletes:
        $esGerente = $request->user()->hasRole('gerente');
        if (!$esGerente) {
            return response()->json(['message' => 'Solo un gerente puede restaurar un beneficiario eliminado.'], 403);
        }
        
        $beneficiario = \App\Models\Beneficiario::onlyTrashed()->findOrFail($id);
        $beneficiario->restore();
        $beneficiario->estado_seleccion = 'aceptado';
        $beneficiario->save();

        return response()->json($beneficiario);
    }

    public function estadisticasProyecto(Request $request, int $proyectoId)
    {
        $puedeVerDatosSensibles = $request->user()->hasPermissionTo('beneficiarios.ver_datos_sensibles');
        $stats = $this->beneficiarioService->obtenerEstadisticasProyecto($proyectoId, $puedeVerDatosSensibles);
        return response()->json($stats);
    }

    public function mapaProyecto(int $proyectoId)
    {
        $mapa = $this->beneficiarioService->obtenerMapaProyecto($proyectoId);
        return response()->json($mapa);
    }

    public function transicionesPermitidas(int $id)
    {
        $beneficiario = \App\Models\Beneficiario::findOrFail($id);
        return response()->json($beneficiario->getTransicionesPermitidas());
    }
}
