<?php

namespace App\Exceptions\Proyectos;

use Exception;
use Illuminate\Http\JsonResponse;

class ProyectoEnEstadoNoModificableException extends Exception
{
    public function __construct(string $message = 'El proyecto no puede ser modificado en su estado actual')
    {
        parent::__construct($message);
    }

    public function render($request): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => $this->getMessage()
        ], 422);
    }
}
