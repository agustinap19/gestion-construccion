<?php

namespace App\Exceptions\Clientes;

use Exception;
use Illuminate\Http\JsonResponse;

class OperacionNoPermitidaException extends Exception
{
    public function __construct(string $message = 'Operación no permitida')
    {
        parent::__construct($message);
    }

    public function render($request): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => $this->getMessage()
        ], 403);
    }
}
