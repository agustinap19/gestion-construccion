<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForzarCambioPassword
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->debe_cambiar_password) {
            return response()->json([
                'status' => 'error',
                'code' => 'PASSWORD_CHANGE_REQUIRED',
                'message' => 'Debes cambiar tu contraseña antes de continuar.',
            ], 423);
        }

        return $next($request);
    }
}
