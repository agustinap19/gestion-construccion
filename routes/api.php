<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RolController;
use App\Http\Controllers\Api\AuditoriaController;
use App\Http\Controllers\Api\PersonalController;
use App\Http\Controllers\Api\ClienteController;
use App\Http\Controllers\Api\EntidadEstatalController;
use App\Http\Controllers\Api\ZonaGeograficaController;
use App\Http\Controllers\Api\BeneficiarioController;
use App\Http\Controllers\Api\VisitaDomiciliariaController;
use App\Http\Controllers\Api\ProyectoController;
use App\Http\Controllers\Api\TipoViviendaController;

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
        Route::post('/accion-masiva', [\App\Http\Controllers\Api\UsuarioController::class, 'accionMasiva']);
        Route::get('/{id}', [\App\Http\Controllers\Api\UsuarioController::class, 'show']);
        Route::post('/', [\App\Http\Controllers\Api\UsuarioController::class, 'store']);
        Route::put('/{id}', [\App\Http\Controllers\Api\UsuarioController::class, 'update']);
        Route::patch('/{id}/estado', [\App\Http\Controllers\Api\UsuarioController::class, 'cambiarEstado']);
        Route::patch('/{id}/rol', [\App\Http\Controllers\Api\UsuarioController::class, 'cambiarRol']);
        Route::post('/{id}/desbloquear', [\App\Http\Controllers\Api\UsuarioController::class, 'desbloquear']);
        Route::post('/{id}/reenviar-password', [\App\Http\Controllers\Api\UsuarioController::class, 'reenviarPassword']);
        Route::delete('/{id}/sesiones/{tokenId}', [\App\Http\Controllers\Api\UsuarioController::class, 'cerrarSesion']);
        Route::delete('/{id}/sesiones', [\App\Http\Controllers\Api\UsuarioController::class, 'cerrarTodasLasSesiones']);
        Route::patch('/{id}/dispositivos/{dispositivoId}/revocar', [\App\Http\Controllers\Api\UsuarioController::class, 'revocarDispositivo']);
        Route::patch('/{id}/dispositivos/revocar-todos', [\App\Http\Controllers\Api\UsuarioController::class, 'revocarTodosDispositivos']);
        Route::delete('/{id}', [\App\Http\Controllers\Api\UsuarioController::class, 'destroy']);
        Route::post('/{id}/restaurar', [\App\Http\Controllers\Api\UsuarioController::class, 'restaurar']);
    });

    // Notificaciones
    Route::prefix('notificaciones')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\NotificacionController::class, 'index']);
        Route::get('/no-leidas', [\App\Http\Controllers\Api\NotificacionController::class, 'noLeidas']);
        Route::get('/contador', [\App\Http\Controllers\Api\NotificacionController::class, 'contadorNoLeidas']);
        Route::patch('/{id}/leer', [\App\Http\Controllers\Api\NotificacionController::class, 'marcarLeida']);
        Route::patch('/marcar-todas-leidas', [\App\Http\Controllers\Api\NotificacionController::class, 'marcarTodasLeidas']);
    });

    // Gestión de Personal
    Route::prefix('personal')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\PersonalController::class, 'index']);
        Route::get('/estadisticas', [\App\Http\Controllers\Api\PersonalController::class, 'estadisticas']);
        Route::get('/siguiente-codigo', [\App\Http\Controllers\Api\PersonalController::class, 'siguienteCodigo']);
        Route::get('/{id}', [\App\Http\Controllers\Api\PersonalController::class, 'show']);
        Route::post('/', [\App\Http\Controllers\Api\PersonalController::class, 'store']);
        Route::put('/{id}', [\App\Http\Controllers\Api\PersonalController::class, 'update']);
        Route::patch('/{id}/estado-laboral', [\App\Http\Controllers\Api\PersonalController::class, 'cambiarEstadoLaboral']);
        Route::post('/{id}/vincular-usuario', [\App\Http\Controllers\Api\PersonalController::class, 'vincularUsuario']);
        Route::post('/{id}/desvincular-usuario', [\App\Http\Controllers\Api\PersonalController::class, 'desvincularUsuario']);
        Route::post('/{id}/crear-usuario', [\App\Http\Controllers\Api\PersonalController::class, 'crearUsuarioParaPersonal']);
        Route::delete('/{id}', [\App\Http\Controllers\Api\PersonalController::class, 'destroy']);
        Route::post('/{id}/restaurar', [\App\Http\Controllers\Api\PersonalController::class, 'restaurar']);
        
        // Competencias
        Route::get('/{id}/competencias', [\App\Http\Controllers\Api\PersonalController::class, 'competencias']);
        Route::post('/{id}/competencias', [\App\Http\Controllers\Api\PersonalController::class, 'asignarCompetencia']);
        Route::put('/{id}/competencias/{competenciaId}', [\App\Http\Controllers\Api\PersonalController::class, 'actualizarCompetencia']);
        Route::delete('/{id}/competencias/{competenciaId}', [\App\Http\Controllers\Api\PersonalController::class, 'desasignarCompetencia']);
    });

    // Rutas para Clientes
    Route::prefix('clientes')->group(function () {
        Route::get('/', [ClienteController::class, 'index']);
        Route::get('/estadisticas', [ClienteController::class, 'estadisticas']);
        Route::get('/{id}', [ClienteController::class, 'show']);
        Route::get('/{id}/referidos', [ClienteController::class, 'referidos']);
        Route::post('/', [ClienteController::class, 'store']);
        Route::put('/{id}', [ClienteController::class, 'update']);
        Route::patch('/{id}/estado', [ClienteController::class, 'cambiarEstado']);
        Route::delete('/{id}', [ClienteController::class, 'destroy']);
        Route::post('/{id}/restaurar', [ClienteController::class, 'restaurar']);
    });

    // Rutas para Entidades Estatales
    Route::prefix('entidades-estatales')->group(function () {
        Route::get('/', [EntidadEstatalController::class, 'index']);
        Route::get('/estadisticas', [EntidadEstatalController::class, 'estadisticas']);
        Route::get('/{id}', [EntidadEstatalController::class, 'show']);
        Route::post('/', [EntidadEstatalController::class, 'store']);
        Route::put('/{id}', [EntidadEstatalController::class, 'update']);
        Route::patch('/{id}/estado', [EntidadEstatalController::class, 'cambiarEstado']);
        Route::delete('/{id}', [EntidadEstatalController::class, 'destroy']);
        Route::post('/{id}/restaurar', [EntidadEstatalController::class, 'restaurar']);
    });



    // Rutas para Beneficiarios
    Route::prefix('beneficiarios')->group(function () {
        Route::get('/', [BeneficiarioController::class, 'index']);
        Route::get('/proyecto/{proyectoId}/estadisticas', [BeneficiarioController::class, 'estadisticasProyecto']);
        Route::get('/proyecto/{proyectoId}/mapa', [BeneficiarioController::class, 'mapaProyecto']);
        Route::get('/{id}', [BeneficiarioController::class, 'show']);
        Route::get('/{id}/transiciones-permitidas', [BeneficiarioController::class, 'transicionesPermitidas']);
        Route::post('/', [BeneficiarioController::class, 'store']);
        Route::put('/{id}', [BeneficiarioController::class, 'update']);
        Route::patch('/{id}/estado', [BeneficiarioController::class, 'cambiarEstado']);
        Route::patch('/{id}/tipo-vivienda', [BeneficiarioController::class, 'asignarTipoVivienda']);
        Route::delete('/{id}', [BeneficiarioController::class, 'destroy']);
        Route::post('/{id}/restaurar', [BeneficiarioController::class, 'restaurar']);
    });

    // Rutas para Visitas Domiciliarias
    Route::prefix('visitas-domiciliarias')->group(function () {
        Route::get('/', [VisitaDomiciliariaController::class, 'index']);
        Route::get('/proyecto/{proyectoId}/estadisticas', [VisitaDomiciliariaController::class, 'estadisticasProyecto']);
        Route::get('/{id}', [VisitaDomiciliariaController::class, 'show']);
        Route::post('/', [VisitaDomiciliariaController::class, 'store']);
        Route::put('/{id}', [VisitaDomiciliariaController::class, 'update']);
        Route::delete('/{id}', [VisitaDomiciliariaController::class, 'destroy']);
    });

    // ── Gestión de Proyectos ─────────────────────────────────────────
    Route::prefix('proyectos')->group(function () {
        Route::get('/estadisticas', [ProyectoController::class, 'estadisticas']);
        Route::get('/simples', [ProyectoController::class, 'simples']);
        Route::get('/sociales', [ProyectoController::class, 'sociales']);
        Route::get('/', [ProyectoController::class, 'index']);
        Route::get('/{id}', [ProyectoController::class, 'show']);
        Route::post('/', [ProyectoController::class, 'store']);
        Route::put('/{id}', [ProyectoController::class, 'update']);
        Route::patch('/{id}/estado', [ProyectoController::class, 'cambiarEstado']);
        Route::patch('/{id}/administrador', [ProyectoController::class, 'cambiarAdministrador']);
        Route::delete('/{id}', [ProyectoController::class, 'destroy']);
        Route::post('/{id}/restaurar', [ProyectoController::class, 'restaurar']);

        // Viviendas anidadas bajo proyecto
        Route::get('/{proyectoId}/viviendas', [\App\Http\Controllers\Api\ViviendaController::class, 'indexPorProyecto']);
        Route::post('/{proyectoId}/viviendas', [\App\Http\Controllers\Api\ViviendaController::class, 'store']);
        Route::post('/{proyectoId}/viviendas/multiples', [\App\Http\Controllers\Api\ViviendaController::class, 'crearMultiples']);

        // Fases anidadas bajo proyecto
        Route::get('/{proyectoId}/fases', [\App\Http\Controllers\Api\FaseProyectoController::class, 'indexPorProyecto']);
        Route::post('/{proyectoId}/fases', [\App\Http\Controllers\Api\FaseProyectoController::class, 'store']);
        Route::put('/{proyectoId}/fases/reordenar', [\App\Http\Controllers\Api\FaseProyectoController::class, 'reordenar']);
        Route::get('/{proyectoId}/fases/validar-pesos', [\App\Http\Controllers\Api\FaseProyectoController::class, 'validarPesos']);

        // Asignaciones de personal anidadas
        Route::get('/{proyectoId}/personal', [\App\Http\Controllers\Api\AsignacionPersonalController::class, 'indexPorProyecto']);
        Route::post('/{proyectoId}/personal', [\App\Http\Controllers\Api\AsignacionPersonalController::class, 'store']);
    });

    // ── Viviendas (operaciones individuales) ─────────────────────────
    Route::prefix('viviendas')->group(function () {
        Route::get('/{id}', [\App\Http\Controllers\Api\ViviendaController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\Api\ViviendaController::class, 'update']);
        Route::patch('/{id}/estado', [\App\Http\Controllers\Api\ViviendaController::class, 'cambiarEstado']);
        Route::patch('/{id}/beneficiario', [\App\Http\Controllers\Api\ViviendaController::class, 'asignarBeneficiario']);
        Route::delete('/{id}/beneficiario', [\App\Http\Controllers\Api\ViviendaController::class, 'desasignarBeneficiario']);
        Route::delete('/{id}', [\App\Http\Controllers\Api\ViviendaController::class, 'destroy']);
    });

    // ── Fases (operaciones individuales) ─────────────────────────────
    Route::prefix('fases')->group(function () {
        Route::get('/{id}', [\App\Http\Controllers\Api\FaseProyectoController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\Api\FaseProyectoController::class, 'update']);
        Route::patch('/{id}/estado', [\App\Http\Controllers\Api\FaseProyectoController::class, 'cambiarEstado']);
        Route::patch('/{id}/avance', [\App\Http\Controllers\Api\FaseProyectoController::class, 'actualizarAvance']);
        Route::delete('/{id}', [\App\Http\Controllers\Api\FaseProyectoController::class, 'destroy']);
    });

    // ── Asignaciones de personal (operaciones individuales) ──────────
    Route::prefix('asignaciones-personal')->group(function () {
        Route::put('/{id}', [\App\Http\Controllers\Api\AsignacionPersonalController::class, 'update']);
        Route::patch('/{id}/finalizar', [\App\Http\Controllers\Api\AsignacionPersonalController::class, 'finalizar']);
        Route::delete('/{id}', [\App\Http\Controllers\Api\AsignacionPersonalController::class, 'destroy']);
    });

    Route::get('tipos-vivienda', [TipoViviendaController::class, 'index']);

    // Rutas para Zonas Geográficas
    Route::prefix('zonas-geograficas')->group(function () {
        Route::get('/', [ZonaGeograficaController::class, 'index']);
        Route::get('/departamento/{depto}', [ZonaGeograficaController::class, 'porDepartamento']);
        Route::get('/cercanas', [ZonaGeograficaController::class, 'cercanas']);
    });
});
