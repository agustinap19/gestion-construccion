<?php

namespace App\Exceptions\Clientes;

use Exception;
use Illuminate\Http\JsonResponse;

class ClienteConDependenciasException extends Exception
{
    protected $tipo_dependencia;
    protected $cantidad;

    public function __construct(string $message, string $tipo_dependencia, int $cantidad)
    {
        parent::__construct($message);
        $this->tipo_dependencia = $tipo_dependencia;
        $this->cantidad = $cantidad;
    }

    public function render($request): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => $this->getMessage(),
            'data' => [
                'tipo_dependencia' => $this->tipo_dependencia,
                'cantidad' => $this->cantidad
            ]
        ], 422);
    }
}
