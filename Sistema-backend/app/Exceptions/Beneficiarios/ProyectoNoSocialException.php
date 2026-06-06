<?php

namespace App\Exceptions\Beneficiarios;

use Exception;

class ProyectoNoSocialException extends Exception
{
    public function render($request)
    {
        return response()->json([
            'message' => 'Validación de Proyecto',
            'errors' => [
                'proyecto_id' => [$this->getMessage()]
            ]
        ], 422);
    }
}
