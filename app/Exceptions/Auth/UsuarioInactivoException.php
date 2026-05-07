<?php

namespace App\Exceptions\Auth;

use Exception;
use Illuminate\Http\JsonResponse;

class UsuarioInactivoException extends Exception
{
    protected $message = 'Credenciales inválidas.'; // Mensaje genérico

    public function render($request): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => $this->getMessage(),
            'data' => null
        ], 401);
    }
}
