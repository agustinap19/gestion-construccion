<?php

namespace App\Exceptions\Proyectos;

use Exception;
use Illuminate\Http\JsonResponse;

class PesoPorcentualInvalidoException extends Exception
{
    protected float $sumaActual;

    public function __construct(string $message = 'La suma de pesos porcentuales no es válida', float $sumaActual = 0)
    {
        parent::__construct($message);
        $this->sumaActual = $sumaActual;
    }

    public function render($request): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => $this->getMessage(),
            'data' => [
                'suma_actual' => $this->sumaActual,
                'suma_esperada' => 100,
            ]
        ], 422);
    }
}
