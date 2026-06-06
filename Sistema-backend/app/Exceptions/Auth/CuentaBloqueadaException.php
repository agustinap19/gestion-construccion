<?php

namespace App\Exceptions\Auth;

use Exception;
use Illuminate\Http\JsonResponse;

class CuentaBloqueadaException extends Exception
{
    public $minutosRestantes;

    public function __construct(int $minutosRestantes = 0)
    {
        parent::__construct('Cuenta bloqueada temporalmente.');
        $this->minutosRestantes = $minutosRestantes;
    }

    public function render($request): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => $this->getMessage(),
            'data' => [
                'minutos_restantes' => $this->minutosRestantes
            ]
        ], 423); // 423 Locked
    }
}
