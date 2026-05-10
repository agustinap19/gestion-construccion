<?php

namespace App\Exceptions\Beneficiarios;

use Exception;

class OperacionRequiereGerenteException extends Exception
{
    public function render($request)
    {
        return response()->json([
            'message' => 'Permisos Insuficientes',
            'error' => $this->getMessage()
        ], 403);
    }
}
