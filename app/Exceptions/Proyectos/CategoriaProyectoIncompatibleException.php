<?php

namespace App\Exceptions\Proyectos;

use Exception;
use Illuminate\Http\JsonResponse;

class CategoriaProyectoIncompatibleException extends Exception
{
    public function __construct(string $message = 'Operación incompatible con la categoría del proyecto')
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
