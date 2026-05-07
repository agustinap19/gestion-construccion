<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Recuperacion\SolicitarRecuperacionRequest;
use App\Http\Requests\Recuperacion\VerificarRostroRecuperacionRequest;
use App\Http\Requests\Recuperacion\CambiarPasswordRecuperacionRequest;
use App\Services\RecuperacionPasswordService;
use Exception;

class RecuperacionPasswordController extends Controller
{
    public function __construct(
        protected RecuperacionPasswordService $recuperacionService
    ) {}

    /**
     * POST /api/recuperacion/solicitar
     */
    public function solicitar(SolicitarRecuperacionRequest $request)
    {
        try {
            $resultado = $this->recuperacionService->solicitarRecuperacion($request->email, $request);
            
            return response()->json([
                'status' => 'success',
                'message' => $resultado['mensaje']
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ocurrió un error al procesar tu solicitud.' // Mensaje genérico por seguridad
            ], 500);
        }
    }

    /**
     * GET /api/recuperacion/validar-token/{token}
     */
    public function validarToken(string $token)
    {
        try {
            // El servicio lanza excepción si es inválido
            $tokenObj = $this->recuperacionService->validarToken($token);
            
            return response()->json([
                'status' => 'success',
                'message' => 'Token válido.',
                'data' => [
                    'email' => $tokenObj->email,
                    'nombre' => $tokenObj->usuario->nombres
                ]
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * POST /api/recuperacion/verificar-rostro
     */
    public function verificarRostro(VerificarRostroRecuperacionRequest $request)
    {
        try {
            $resultado = $this->recuperacionService->verificarRostroRecuperacion(
                $request->token, 
                $request->descriptor, 
                $request
            );
            
            return response()->json([
                'status' => 'success',
                'data' => $resultado
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * POST /api/recuperacion/cambiar-password
     */
    public function cambiarPassword(CambiarPasswordRecuperacionRequest $request)
    {
        try {
            $this->recuperacionService->cambiarPasswordRecuperacion(
                $request->token,
                $request->nueva_password,
                $request
            );
            
            return response()->json([
                'status' => 'success',
                'message' => 'Contraseña actualizada correctamente.'
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
