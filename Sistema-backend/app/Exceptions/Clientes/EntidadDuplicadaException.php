<?php

namespace App\Exceptions\Clientes;

use Exception;
use Illuminate\Http\JsonResponse;

class EntidadDuplicadaException extends Exception
{
    protected $campo_duplicado;
    protected $valor;

    public function __construct(string $campo_duplicado, string $valor)
    {
        parent::__construct('Ya existe una entidad estatal con este dato');
        $this->campo_duplicado = $campo_duplicado;
        $this->valor = $valor;
    }

    public function render($request): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => $this->getMessage(),
            'data' => [
                'campo_duplicado' => $this->campo_duplicado,
                'valor' => $this->valor
            ]
        ], 422);
    }
}
