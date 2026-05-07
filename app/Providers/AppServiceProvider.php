<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request) {
            return [
                Limit::perMinutes(15, 10)->by($request->ip()),
                Limit::perMinutes(15, 5)->by($request->input('email')),
            ];
        });

        // Configuración de Rate Limiting para recuperación de contraseña
        RateLimiter::for('recuperacion', function (Request $request) {
            return [
                Limit::perMinutes(60, 3)->by($request->input('email')),
                Limit::perMinutes(60, 5)->by($request->ip()),
            ];
        });
    }
}
