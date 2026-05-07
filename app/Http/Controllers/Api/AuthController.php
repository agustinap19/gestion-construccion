<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\VerificarOtpRequest;
use App\Http\Requests\Auth\VerificarRostro2FARequest;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class AuthController extends Controller
{
    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $this->authService->login($request->validated(), $request);

        return response()->json([
            'status' => 'success',
            'message' => $data['mensaje'] ?? 'Autenticación exitosa',
            'data' => $data,
        ], 200);
    }

    public function verificarOtp(VerificarOtpRequest $request): JsonResponse
    {
        try {
            $data = $this->authService->verificarOtp($request->token_temporal, $request->codigo, $request);
            
            return response()->json([
                'status' => 'success',
                'message' => $data['mensaje'],
                'data' => $data,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function verificarRostro2FA(VerificarRostro2FARequest $request): JsonResponse
    {
        try {
            $data = $this->authService->verificarRostro2FA($request->token_temporal, $request->descriptor, $request);
            
            return response()->json([
                'status' => 'success',
                'message' => 'Autenticación exitosa',
                'data' => $data,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 401);
        }
    }

    public function logout(Request $request): JsonResponse
    {
        try {
            $this->authService->logout($request->user());

            return response()->json([
                'status' => 'success',
                'message' => 'Sesión cerrada exitosamente',
                'data' => null,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al cerrar sesión',
                'data' => null,
            ], 500);
        }
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('rol');

        return response()->json([
            'status' => 'success',
            'message' => 'Datos del usuario obtenidos exitosamente',
            'data' => [
                'usuario' => $user,
                'permisos' => $user->getPermisos(),
            ],
        ], 200);
    }
}
