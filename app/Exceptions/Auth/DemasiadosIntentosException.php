<?php

namespace App\Exceptions\Auth;

use Exception;
use Illuminate\Http\JsonResponse;

class DemasiadosIntentosException extends Exception
{
    protected $message = 'Demasiados intentos de acceso. Por favor, intente más tarde.';

    public function render($request): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => $this->getMessage(),
            'data' => null
        ], 429);
    }
}
