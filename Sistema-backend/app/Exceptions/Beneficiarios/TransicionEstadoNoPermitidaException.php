<?php

namespace App\Exceptions\Beneficiarios;

use Exception;

class TransicionEstadoNoPermitidaException extends Exception
{
    public function render($request)
    {
        return response()->json([
            'message' => 'Validación de Estado',
            'errors' => [
                'estado_seleccion' => [$this->getMessage()]
            ]
        ], 422);
    }
}
