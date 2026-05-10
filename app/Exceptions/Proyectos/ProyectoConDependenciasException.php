<?php

namespace App\Exceptions\Proyectos;

use Exception;
use Illuminate\Http\JsonResponse;

class ProyectoConDependenciasException extends Exception
{
    protected string $tipoDependencia;
    protected int $cantidad;

    public function __construct(string $message, string $tipoDependencia = '', int $cantidad = 0)
    {
        parent::__construct($message);
        $this->tipoDependencia = $tipoDependencia;
        $this->cantidad = $cantidad;
    }

    public function render($request): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => $this->getMessage(),
            'data' => [
                'tipo_dependencia' => $this->tipoDependencia,
                'cantidad' => $this->cantidad,
            ]
        ], 422);
    }
}
