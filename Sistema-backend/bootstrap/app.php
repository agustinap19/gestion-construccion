<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'forzar.cambio.password' => \App\Http\Middleware\ForzarCambioPassword::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API-only: never redirect to a web login route
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No autenticado. Por favor, inicia sesión.',
                'data'    => null,
            ], 401);
        });

        // Safety net: route('login') doesn't exist in this API-only app
        $exceptions->render(function (\Symfony\Component\Routing\Exception\RouteNotFoundException $e, \Illuminate\Http\Request $request) {
            if (str_contains($e->getMessage(), 'login')) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'No autenticado. Por favor, inicia sesión.',
                    'data'    => null,
                ], 401);
            }
        });

        $exceptions->render(function (\Illuminate\Http\Exceptions\ThrottleRequestsException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Demasiados intentos. Por favor, intenta nuevamente en unos minutos.',
                    'data' => null,
                ], 429);
            }
        });
    })->create();
