<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\VerificarOtpRequest;
use App\Services\AuthService;
use App\Services\OtpService;
use App\Models\CodigoOtp;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        protected AuthService $authService,
        protected OtpService $otpService
    ) {}

    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $data = $this->authService->intentarLogin($request->validated(), $request);

            return response()->json([
                'status'  => 'success',
                'message' => 'Operación exitosa.',
                'data'    => $data,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'data'    => null,
            ], 401);
        }
    }

    public function verificarOtp(VerificarOtpRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();
            $data = $this->authService->verificarOtp(
                $validated['token_temporal'],
                $validated['codigo'],
                (bool) ($validated['confiar_dispositivo'] ?? false),
                $validated['fingerprint'] ?? '',
                $request
            );

            return response()->json([
                'status'  => 'success',
                'message' => 'Verificación exitosa.',
                'data'    => $data,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'data'    => null,
            ], 400);
        }
    }

    public function reenviarOtp(Request $request): JsonResponse
    {
        $request->validate([
            'token_temporal' => ['required', 'string'],
            'fingerprint'    => ['nullable', 'string', 'max:128'],
        ]);

        $otp = CodigoOtp::where('token_temporal', $request->token_temporal)
            ->where('usado', false)
            ->where('expira_en', '>', now())
            ->first();

        if (!$otp) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Sesión de verificación inválida o expirada.',
            ], 400);
        }

        $user = User::findOrFail($otp->usuario_id);

        $nuevoToken = $this->otpService->generarYEnviar(
            $user,
            $otp->fingerprint_dispositivo ?? ($request->fingerprint ?? ''),
            $request->userAgent() ?? '',
            $request->ip()
        );

        $partes = explode('@', $user->email);
        $emailMascarado = substr($partes[0], 0, 2) . '***@' . $partes[1];

        return response()->json([
            'status'  => 'success',
            'message' => 'Código reenviado.',
            'data'    => [
                'token_temporal' => $nuevoToken,
                'email_destino'  => $emailMascarado,
            ],
        ], 200);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json([
            'status'  => 'success',
            'message' => 'Sesión cerrada exitosamente.',
            'data'    => null,
        ], 200);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('rol');

        return response()->json([
            'status'  => 'success',
            'message' => 'Datos obtenidos.',
            'data'    => [
                'usuario'  => $user,
                'permisos' => $user->getPermisos(),
            ],
        ], 200);
    }
}
