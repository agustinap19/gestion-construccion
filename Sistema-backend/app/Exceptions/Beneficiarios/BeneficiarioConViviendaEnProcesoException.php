<?php

namespace App\Exceptions\Beneficiarios;

use Exception;

class BeneficiarioConViviendaEnProcesoException extends Exception
{
    public function render($request)
    {
        return response()->json([
            'message' => 'Operación Denegada',
            'error' => $this->getMessage()
        ], 422);
    }
}
