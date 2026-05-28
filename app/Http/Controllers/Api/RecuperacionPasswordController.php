<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Recuperacion\SolicitarRecuperacionRequest;
use App\Http\Requests\Recuperacion\CambiarPasswordRecuperacionRequest;
use App\Services\RecuperacionPasswordService;
use Exception;

class RecuperacionPasswordController extends Controller
{
    public function __construct(
        protected RecuperacionPasswordService $recuperacionService
    ) {}

    public function solicitar(SolicitarRecuperacionRequest $request)
    {
        $resultado = $this->recuperacionService->solicitar($request->email, $request);

        return response()->json([
            'status' => 'success',
            'message' => $resultado['mensaje'],
        ]);
    }

    public function validarToken(string $token)
    {
        try {
            $tokenObj = $this->recuperacionService->validarToken($token);

            return response()->json([
                'status' => 'success',
                'message' => 'Token válido.',
                'data' => [
                    'email' => $tokenObj->usuario->email,
                    'nombre' => $tokenObj->usuario->nombre,
                ],
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function restablecer(CambiarPasswordRecuperacionRequest $request)
    {
        try {
            $this->recuperacionService->restablecer(
                $request->validated('token'),
                $request->validated('nueva_password'),
                $request
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.',
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
