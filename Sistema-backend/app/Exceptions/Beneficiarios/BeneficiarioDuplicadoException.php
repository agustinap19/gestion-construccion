<?php

namespace App\Exceptions\Beneficiarios;

use Exception;

class BeneficiarioDuplicadoException extends Exception
{
    public function render($request)
    {
        return response()->json([
            'message' => 'Validación fallida',
            'errors' => [
                'ci' => [$this->getMessage()]
            ]
        ], 422);
    }
}
