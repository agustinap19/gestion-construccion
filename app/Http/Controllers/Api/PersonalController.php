<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Personal\ActualizarPersonalRequest;
use App\Http\Requests\Personal\AsignarCompetenciaRequest;
use App\Http\Requests\Personal\CambiarEstadoLaboralRequest;
use App\Http\Requests\Personal\CrearPersonalRequest;
use App\Http\Requests\Personal\CrearUsuarioParaPersonalRequest;
use App\Services\Personal\PersonalCompetenciaService;
use App\Services\Personal\PersonalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class PersonalController extends Controller
{
    public function __construct(
        protected PersonalService $personalService,
        protected PersonalCompetenciaService $competenciaService
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $filtros = $request->only([
                'busqueda', 'tipo', 'estado_laboral', 'tipo_contrato',
                'tiene_usuario', 'especialidad', 'competencia_id',
                'competencias_vencidas', 'proximas_a_vencer_dias',
                'ordenar_por', 'direccion'
            ]);
            $personal = $this->personalService->listarConFiltros($filtros, $request->input('per_page', 15));

            return response()->json([
                'status' => 'success',
                'message' => 'Personal obtenido exitosamente',
                'data' => $personal,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener personal: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function estadisticas(): JsonResponse
    {
        try {
            $stats = $this->personalService->obtenerEstadisticasGenerales();
            return response()->json([
                'status' => 'success',
                'data' => $stats,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener estadísticas: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function siguienteCodigo(): JsonResponse
    {
        try {
            $codigo = $this->personalService->generarCodigoEmpleado();
            return response()->json([
                'status' => 'success',
                'data' => ['codigo' => $codigo],
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al generar código: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(int $id): JsonResponse
    {
        try {
            $data = $this->personalService->obtenerCompleto($id);
            return response()->json([
                'status' => 'success',
                'message' => 'Personal obtenido exitosamente',
                'data' => $data,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener el personal: ' . $e->getMessage(),
            ], 404);
        }
    }

    public function store(CrearPersonalRequest $request): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $personal = $this->personalService->crear($request->validated(), $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Personal creado exitosamente.',
                'data' => $personal,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al crear el personal: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function update(ActualizarPersonalRequest $request, int $id): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $personal = $this->personalService->actualizar($id, $request->validated(), $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Personal actualizado exitosamente',
                'data' => $personal,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al actualizar el personal: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function cambiarEstadoLaboral(CambiarEstadoLaboralRequest $request, int $id): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $personal = $this->personalService->cambiarEstadoLaboral(
                $id,
                $request->estado_laboral,
                $request->razon,
                $actorId
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Estado laboral actualizado exitosamente',
                'data' => $personal,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al cambiar estado laboral: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function vincularUsuario(int $id, Request $request): JsonResponse
    {
        try {
            $request->validate([
                'usuario_id' => 'required|exists:usuarios,id',
            ], [
                'usuario_id.required' => 'El usuario es obligatorio.',
                'usuario_id.exists' => 'El usuario seleccionado no existe.',
            ]);

            $actorId = $request->user()->id;
            $personal = $this->personalService->vincularUsuario($id, $request->usuario_id, $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Usuario vinculado exitosamente',
                'data' => $personal,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al vincular usuario: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function desvincularUsuario(int $id, Request $request): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $personal = $this->personalService->desvincularUsuario($id, $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Usuario desvinculado exitosamente',
                'data' => $personal,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al desvincular usuario: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function crearUsuarioParaPersonal(CrearUsuarioParaPersonalRequest $request, int $id): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $personal = $this->personalService->crearUsuarioParaPersonal($id, $request->validated(), $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Usuario creado y vinculado exitosamente. Se enviaron las credenciales por correo.',
                'data' => $personal,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al crear usuario: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $razon = $request->input('razon');
            $this->personalService->eliminar($id, $actorId, $razon);

            return response()->json([
                'status' => 'success',
                'message' => 'Personal eliminado exitosamente',
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al eliminar el personal: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function restaurar(int $id, Request $request): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $personal = $this->personalService->restaurar($id, $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Personal restaurado exitosamente',
                'data' => $personal,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al restaurar el personal: ' . $e->getMessage(),
            ], 422);
        }
    }

    // ── Competencias ───────────────────────────────────────────

    public function competencias(int $id): JsonResponse
    {
        try {
            $competencias = $this->competenciaService->listarPorPersonal($id);
            return response()->json([
                'status' => 'success',
                'data' => $competencias,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al obtener competencias: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function asignarCompetencia(AsignarCompetenciaRequest $request, int $id): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $registro = $this->competenciaService->asignar($id, $request->competencia_id, $request->validated(), $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Competencia asignada exitosamente',
                'data' => $registro,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al asignar competencia: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function actualizarCompetencia(int $id, int $competenciaId, Request $request): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $registro = $this->competenciaService->actualizar($competenciaId, $request->all(), $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Competencia actualizada exitosamente',
                'data' => $registro,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al actualizar competencia: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function desasignarCompetencia(int $id, int $competenciaId, Request $request): JsonResponse
    {
        try {
            $actorId = $request->user()->id;
            $this->competenciaService->desasignar($competenciaId, $actorId);

            return response()->json([
                'status' => 'success',
                'message' => 'Competencia desasignada exitosamente',
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al desasignar competencia: ' . $e->getMessage(),
            ], 422);
        }
    }
}
