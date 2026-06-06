<?php

namespace App\Exceptions\Proyectos;

use Exception;
use Illuminate\Http\JsonResponse;

class FaseConDependenciasException extends Exception
{
    public function __construct(string $message = 'La fase tiene dependencias que impiden la operación')
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
