<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RolController;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/2fa/verificar-otp', [AuthController::class, 'verificarOtp']);
Route::post('/2fa/verificar-rostro', [AuthController::class, 'verificarRostro2FA']);

use App\Http\Controllers\Api\RecuperacionPasswordController;

Route::prefix('recuperacion')->group(function () {
    Route::post('/solicitar', [RecuperacionPasswordController::class, 'solicitar'])->middleware('throttle:recuperacion');
    Route::get('/validar-token/{token}', [RecuperacionPasswordController::class, 'validarToken']);
    Route::post('/verificar-rostro', [RecuperacionPasswordController::class, 'verificarRostro']);
    Route::post('/cambiar-password', [RecuperacionPasswordController::class, 'cambiarPassword']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Primer Login (Cambio de contraseña y registro facial)
    Route::prefix('primer-login')->group(function () {
        Route::get('/estado', [\App\Http\Controllers\Api\PrimerLoginController::class, 'verificarEstadoPrimerLogin']);
        Route::post('/cambiar-password', [\App\Http\Controllers\Api\PrimerLoginController::class, 'cambiarPassword']);
        Route::post('/registrar-rostro', [\App\Http\Controllers\Api\PrimerLoginController::class, 'registrarRostro']);
    });

    // Reportes JSON
    Route::get('/reportes/personal-rol', [\App\Http\Controllers\Api\ReporteController::class, 'reporte1']);
    Route::get('/reportes/planillas', [\App\Http\Controllers\Api\ReporteController::class, 'reporte2']);
    Route::get('/reportes/competencias-personal', [\App\Http\Controllers\Api\ReporteController::class, 'reporte3']);
    Route::get('/reportes/personal-competencias', [\App\Http\Controllers\Api\ReporteController::class, 'reporte4']);
    Route::get('/reportes/usuarios-permisos', [\App\Http\Controllers\Api\ReporteController::class, 'reporte5']);

    // Reportes PDF
    Route::get('/reportes/personal-rol/pdf', [\App\Http\Controllers\Api\ReporteController::class, 'reporte1Pdf']);
    Route::get('/reportes/planillas/pdf', [\App\Http\Controllers\Api\ReporteController::class, 'reporte2Pdf']);
    Route::get('/reportes/competencias-personal/pdf', [\App\Http\Controllers\Api\ReporteController::class, 'reporte3Pdf']);
    Route::get('/reportes/personal-competencias/pdf', [\App\Http\Controllers\Api\ReporteController::class, 'reporte4Pdf']);
    Route::get('/reportes/usuarios-permisos/pdf', [\App\Http\Controllers\Api\ReporteController::class, 'reporte5Pdf']);

    // Gestión de Roles y Permisos
    Route::prefix('roles')->group(function () {
        Route::get('/permisos/agrupados', [RolController::class, 'permisosAgrupados']);
        Route::get('/', [RolController::class, 'index']);
        Route::get('/{id}', [RolController::class, 'show']);
        Route::get('/{id}/usuarios', [RolController::class, 'usuariosAsignados']);
        Route::post('/', [RolController::class, 'store']);
        Route::put('/{id}', [RolController::class, 'update']);
        Route::patch('/{id}/permisos', [RolController::class, 'actualizarPermisos']);
        Route::post('/{id}/duplicar', [RolController::class, 'duplicar']);
        Route::delete('/{id}', [RolController::class, 'destroy']);
    });


    // Gestión de Usuarios
    Route::prefix('usuarios')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\UsuarioController::class, 'index']);
        Route::get('/{id}', [\App\Http\Controllers\Api\UsuarioController::class, 'show']);
        Route::post('/', [\App\Http\Controllers\Api\UsuarioController::class, 'store']);
        Route::put('/{id}', [\App\Http\Controllers\Api\UsuarioController::class, 'update']);
        Route::patch('/{id}/estado', [\App\Http\Controllers\Api\UsuarioController::class, 'cambiarEstado']);
        Route::post('/{id}/reenviar-password', [\App\Http\Controllers\Api\UsuarioController::class, 'reenviarPassword']);
        Route::delete('/{id}', [\App\Http\Controllers\Api\UsuarioController::class, 'destroy']);
    });

    // Notificaciones
    Route::prefix('notificaciones')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\NotificacionController::class, 'index']);
        Route::get('/no-leidas', [\App\Http\Controllers\Api\NotificacionController::class, 'noLeidas']);
        Route::get('/contador', [\App\Http\Controllers\Api\NotificacionController::class, 'contadorNoLeidas']);
        Route::patch('/{id}/leer', [\App\Http\Controllers\Api\NotificacionController::class, 'marcarLeida']);
        Route::patch('/marcar-todas-leidas', [\App\Http\Controllers\Api\NotificacionController::class, 'marcarTodasLeidas']);
    });
});

