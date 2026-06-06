<?php

namespace App\Exceptions\Clientes;

use Exception;
use Illuminate\Http\JsonResponse;

class ClienteDuplicadoException extends Exception
{
    protected $documento_tipo;
    protected $documento_numero;

    public function __construct(string $documento_tipo, string $documento_numero)
    {
        parent::__construct('Ya existe un cliente con este documento');
        $this->documento_tipo = $documento_tipo;
        $this->documento_numero = $documento_numero;
    }

    public function render($request): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => $this->getMessage(),
            'data' => [
                'documento_tipo' => $this->documento_tipo,
                'documento_numero' => $this->documento_numero
            ]
        ], 422);
    }
}
