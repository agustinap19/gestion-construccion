<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\CambiarPasswordPrimerLoginRequest;
use App\Services\PrimerLoginService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrimerLoginController extends Controller
{
    public function __construct(
        protected PrimerLoginService $primerLoginService
    ) {}

    public function verificarEstado(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'status' => 'success',
            'data' => [
                'debe_cambiar_password' => $user->debe_cambiar_password,
            ],
        ], 200);
    }

    public function cambiarPassword(CambiarPasswordPrimerLoginRequest $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->debe_cambiar_password) {
            return response()->json([
                'status' => 'error',
                'message' => 'El usuario ya actualizó su contraseña.',
            ], 400);
        }

        $this->primerLoginService->cambiarPasswordObligatorio(
            $user,
            $request->validated('password_actual'),
            $request->validated('nueva_password')
        );

        // Emitir nuevo token limpio
        $token = $user->createToken('auth_token', ['*'], now()->addHours(8))->plainTextToken;
        $user->load('rol');

        return response()->json([
            'status' => 'success',
            'message' => 'Contraseña actualizada exitosamente.',
            'data' => [
                'token' => $token,
                'usuario' => $user,
                'permisos' => $user->getPermisos(),
            ],
        ], 200);
    }
}
