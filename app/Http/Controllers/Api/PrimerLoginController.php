<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\CambiarPasswordPrimerLoginRequest;
use App\Services\PrimerLoginService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class PrimerLoginController extends Controller
{
    public function __construct(
        protected PrimerLoginService $primerLoginService
    ) {}

    /**
     * Retorna el estado actual del flujo de primer login del usuario
     */
    public function verificarEstadoPrimerLogin(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'status' => 'success',
            'data' => [
                'debe_cambiar_password' => $user->debe_cambiar_password,
                'rostro_registrado' => $user->rostro_registrado,
            ]
        ], 200);
    }

    /**
     * Procesa el cambio de contraseña obligatorio
     */
    public function cambiarPassword(CambiarPasswordPrimerLoginRequest $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->debe_cambiar_password) {
            return response()->json([
                'status' => 'error',
                'message' => 'El usuario ya ha cambiado su contraseña inicial.'
            ], 400);
        }

        $this->primerLoginService->cambiarPasswordObligatorio(
            $user, 
            $request->validated('password_actual'),
            $request->validated('nueva_password'),
            $request
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Contraseña actualizada exitosamente.'
        ], 200);
    }

    /**
     * Procesa la captura del rostro para el segundo paso
     */
    public function registrarRostro(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->rostro_registrado) {
            return response()->json([
                'status' => 'error',
                'message' => 'El usuario ya tiene un rostro registrado.'
            ], 400);
        }

        $request->validate([
            'rostro_base64' => 'required|string',
            'descriptor' => 'required|array|size:128'
        ], [
            'rostro_base64.required' => 'La imagen del rostro es requerida.',
            'descriptor.required' => 'El descriptor facial es requerido.',
            'descriptor.size' => 'El descriptor facial es inválido.'
        ]);

        $this->primerLoginService->registrarRostro(
            $user, 
            $request->input('rostro_base64'),
            $request->input('descriptor')
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Rostro registrado exitosamente para futuros accesos.'
        ], 200);
    }
}
