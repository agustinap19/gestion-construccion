<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RolController;
use App\Http\Controllers\Api\PersonalController;
use App\Http\Controllers\Api\ClienteController;
use App\Http\Controllers\Api\EntidadEstatalController;
use App\Http\Controllers\Api\ZonaGeograficaController;
use App\Http\Controllers\Api\BeneficiarioController;
use App\Http\Controllers\Api\ProyectoController;
use App\Http\Controllers\Api\TipoViviendaController;
use App\Http\Controllers\Api\SubidaArchivoController;
use App\Http\Controllers\Api\ReporteTecnicoController;
use App\Http\Controllers\Api\RecuperacionPasswordController;
use App\Http\Controllers\Api\ExportacionController;
use App\Http\Controllers\Api\AlmacenController;
use App\Http\Controllers\Api\PresupuestoMaterialController;
use App\Http\Controllers\Api\ModificatorioController;
use App\Http\Controllers\Api\CierreRegistrosBeneficiariosController;
use App\Http\Controllers\Api\PlantillaChecklistController;
use App\Http\Middleware\ForzarCambioPassword;
use App\Http\Controllers\Api\BibliotecaConstructivaController;
use App\Http\Controllers\Api\PlantillaConstructivaController;
use App\Http\Controllers\Api\PresupuestoItemsProyectoController;
use App\Http\Controllers\Api\MovimientoAlmacenController;
use App\Http\Controllers\Api\ConfiguracionPorcentajesController;
use App\Http\Controllers\Api\RecalculoFinancieroController;

// ── Auth pública ─────────────────────────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/2fa/verificar-otp', [AuthController::class, 'verificarOtp']);
Route::post('/2fa/reenviar-otp', [AuthController::class, 'reenviarOtp']);

Route::prefix('recuperacion')->group(function () {
    Route::post('/solicitar', [RecuperacionPasswordController::class, 'solicitar'])->middleware('throttle:6,1');
    Route::get('/validar-token/{token}', [RecuperacionPasswordController::class, 'validarToken']);
    Route::post('/restablecer', [RecuperacionPasswordController::class, 'restablecer']);
});

// ── Auth protegida ────────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Cambio de contraseña obligatorio (sin ForzarCambioPassword para no crear ciclo)
    Route::prefix('primer-login')->group(function () {
        Route::get('/estado', [\App\Http\Controllers\Api\PrimerLoginController::class, 'verificarEstado']);
        Route::post('/cambiar-password', [\App\Http\Controllers\Api\PrimerLoginController::class, 'cambiarPassword']);
    });

    // Todo lo demás requiere contraseña ya cambiada
    Route::middleware(ForzarCambioPassword::class)->group(function () {

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

        // Roles y Permisos
        Route::get('/permisos/matriz', [RolController::class, 'matrizPermisos']);
        Route::prefix('roles')->group(function () {
            Route::get('/permisos/agrupados', [RolController::class, 'permisosAgrupados']);
            Route::get('/', [RolController::class, 'index']);
            Route::get('/{id}', [RolController::class, 'show']);
            Route::get('/{id}/usuarios', [RolController::class, 'usuariosAsignados']);
            Route::post('/', [RolController::class, 'store']);
            Route::put('/{id}', [RolController::class, 'update']);
            Route::patch('/{id}/estado', [RolController::class, 'cambiarEstado']);
            Route::patch('/{id}/permisos', [RolController::class, 'actualizarPermisos']);
            Route::post('/{id}/duplicar', [RolController::class, 'duplicar']);
            Route::delete('/{id}', [RolController::class, 'destroy']);
        });

        // Usuarios
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

        // Personal
        Route::prefix('personal')->group(function () {
            Route::get('/', [PersonalController::class, 'index']);
            Route::get('/estadisticas', [PersonalController::class, 'estadisticas']);
            Route::get('/siguiente-codigo', [PersonalController::class, 'siguienteCodigo']);
            Route::get('/{id}', [PersonalController::class, 'show']);
            Route::post('/', [PersonalController::class, 'store']);
            Route::put('/{id}', [PersonalController::class, 'update']);
            Route::patch('/{id}/estado-laboral', [PersonalController::class, 'cambiarEstadoLaboral']);
            Route::post('/{id}/vincular-usuario', [PersonalController::class, 'vincularUsuario']);
            Route::post('/{id}/desvincular-usuario', [PersonalController::class, 'desvincularUsuario']);
            Route::post('/{id}/crear-usuario', [PersonalController::class, 'crearUsuarioParaPersonal']);
            Route::delete('/{id}', [PersonalController::class, 'destroy']);
            Route::post('/{id}/restaurar', [PersonalController::class, 'restaurar']);
            Route::get('/{id}/competencias', [PersonalController::class, 'competencias']);
            Route::post('/{id}/competencias', [PersonalController::class, 'asignarCompetencia']);
            Route::put('/{id}/competencias/{competenciaId}', [PersonalController::class, 'actualizarCompetencia']);
            Route::delete('/{id}/competencias/{competenciaId}', [PersonalController::class, 'desasignarCompetencia']);
        });

        // Clientes
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

        // Entidades Estatales
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

        // Subida de archivos
        Route::prefix('upload')->group(function () {
            Route::post('/imagen',       [SubidaArchivoController::class, 'imagen']);
            Route::post('/documento',    [SubidaArchivoController::class, 'documento']);
            Route::post('/plano',        [SubidaArchivoController::class, 'plano']);
            Route::post('/foto-reporte', [SubidaArchivoController::class, 'fotoReporte']);
        });

        // Beneficiarios
        Route::prefix('beneficiarios')->group(function () {
            Route::get('/', [BeneficiarioController::class, 'index']);
            Route::get('/proyecto/{proyectoId}/estadisticas', [BeneficiarioController::class, 'estadisticasProyecto']);
            Route::get('/proyecto/{proyectoId}/mapa', [BeneficiarioController::class, 'mapaProyecto']);
            Route::get('/proyecto/{proyectoId}/cupo', [BeneficiarioController::class, 'cupoProyecto']);
            Route::get('/proyecto/{proyectoId}/exportar', [BeneficiarioController::class, 'exportar']);
            Route::get('/{id}', [BeneficiarioController::class, 'show']);
            Route::get('/{id}/transiciones-permitidas', [BeneficiarioController::class, 'transicionesPermitidas']);
            Route::post('/', [BeneficiarioController::class, 'store']);
            Route::put('/{id}', [BeneficiarioController::class, 'update']);
            Route::patch('/{id}/estado', [BeneficiarioController::class, 'cambiarEstado']);
            Route::patch('/{id}/tipo-vivienda', [BeneficiarioController::class, 'asignarTipoVivienda']);
            Route::delete('/{id}', [BeneficiarioController::class, 'destroy']);
            Route::post('/{id}/restaurar', [BeneficiarioController::class, 'restaurar']);
        });

        // Auditoría
        Route::get('auditoria/{tipo}/{id}', [\App\Http\Controllers\Api\AuditoriaController::class, 'porEntidad']);
        Route::get('auditoria/{tipo}/{id}/exportar-pdf', [\App\Http\Controllers\Api\AuditoriaController::class, 'exportarPdf']);

        // Proyectos
        Route::prefix('proyectos')->group(function () {
            Route::get('/estadisticas', [ProyectoController::class, 'estadisticas']);
            Route::get('/simples', [ProyectoController::class, 'simples']);
            Route::get('/sociales', [ProyectoController::class, 'sociales']);
            Route::get('/', [ProyectoController::class, 'index']);
            Route::get('/{id}', [ProyectoController::class, 'show']);
            Route::get('/{id}/dashboard', [ProyectoController::class, 'dashboard']);
            Route::get('/{id}/exportar', [ProyectoController::class, 'exportar']);
            Route::post('/', [ProyectoController::class, 'store']);
            Route::put('/{id}', [ProyectoController::class, 'update']);
            Route::patch('/{id}/estado', [ProyectoController::class, 'cambiarEstado']);
            Route::patch('/{id}/administrador', [ProyectoController::class, 'cambiarAdministrador']);
            Route::delete('/{id}', [ProyectoController::class, 'destroy']);
            Route::post('/{id}/restaurar', [ProyectoController::class, 'restaurar']);
            Route::get('/{proyectoId}/viviendas', [\App\Http\Controllers\Api\ViviendaController::class, 'indexPorProyecto']);
            Route::post('/{proyectoId}/viviendas', [\App\Http\Controllers\Api\ViviendaController::class, 'store']);
            Route::post('/{proyectoId}/viviendas/multiples', [\App\Http\Controllers\Api\ViviendaController::class, 'crearMultiples']);
            Route::get('/{proyectoId}/fases', [\App\Http\Controllers\Api\FaseProyectoController::class, 'indexPorProyecto']);
            Route::post('/{proyectoId}/fases', [\App\Http\Controllers\Api\FaseProyectoController::class, 'store']);
            Route::put('/{proyectoId}/fases/reordenar', [\App\Http\Controllers\Api\FaseProyectoController::class, 'reordenar']);
            Route::get('/{proyectoId}/fases/validar-pesos', [\App\Http\Controllers\Api\FaseProyectoController::class, 'validarPesos']);
            Route::get('/{proyectoId}/personal', [\App\Http\Controllers\Api\AsignacionPersonalController::class, 'indexPorProyecto']);
            Route::post('/{proyectoId}/personal', [\App\Http\Controllers\Api\AsignacionPersonalController::class, 'store']);

            // Reactividad financiera
            Route::patch('/{id}/porcentajes-financieros', [RecalculoFinancieroController::class, 'actualizarPorcentajes']);
            Route::get('/{id}/matriz-items-productos', [RecalculoFinancieroController::class, 'obtenerMatriz']);
            Route::patch('/{id}/items/{itemId}/producto-contractual', [RecalculoFinancieroController::class, 'asignarItemAProducto']);
            Route::patch('/{id}/items/{itemId}/cantidad', [RecalculoFinancieroController::class, 'actualizarCantidadItem']);
            Route::post('/{id}/items/asignacion-automatica', [RecalculoFinancieroController::class, 'asignacionAutomatica']);
        });

        // Viviendas (operaciones individuales)
        Route::prefix('viviendas')->group(function () {
            Route::get('/{id}', [\App\Http\Controllers\Api\ViviendaController::class, 'show']);
            Route::put('/{id}', [\App\Http\Controllers\Api\ViviendaController::class, 'update']);
            Route::patch('/{id}/estado', [\App\Http\Controllers\Api\ViviendaController::class, 'cambiarEstado']);
            Route::patch('/{id}/beneficiario', [\App\Http\Controllers\Api\ViviendaController::class, 'asignarBeneficiario']);
            Route::delete('/{id}/beneficiario', [\App\Http\Controllers\Api\ViviendaController::class, 'desasignarBeneficiario']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\ViviendaController::class, 'destroy']);
        });

        // Fases (operaciones individuales)
        Route::prefix('fases')->group(function () {
            Route::get('/{id}', [\App\Http\Controllers\Api\FaseProyectoController::class, 'show']);
            Route::put('/{id}', [\App\Http\Controllers\Api\FaseProyectoController::class, 'update']);
            Route::patch('/{id}/estado', [\App\Http\Controllers\Api\FaseProyectoController::class, 'cambiarEstado']);
            Route::patch('/{id}/avance', [\App\Http\Controllers\Api\FaseProyectoController::class, 'actualizarAvance']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\FaseProyectoController::class, 'destroy']);
        });

        // Asignaciones de personal
        Route::prefix('asignaciones-personal')->group(function () {
            Route::put('/{id}', [\App\Http\Controllers\Api\AsignacionPersonalController::class, 'update']);
            Route::patch('/{id}/finalizar', [\App\Http\Controllers\Api\AsignacionPersonalController::class, 'finalizar']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\AsignacionPersonalController::class, 'destroy']);
        });

        // Competencias (catálogo)
        Route::prefix('competencias')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\CompetenciaController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\Api\CompetenciaController::class, 'store']);
            Route::put('/{id}', [\App\Http\Controllers\Api\CompetenciaController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\CompetenciaController::class, 'destroy']);
        });

        // Tipologías (tipos de vivienda)
        Route::prefix('tipos-vivienda')->group(function () {
            Route::get('/', [TipoViviendaController::class, 'index']);
            Route::get('/{id}', [TipoViviendaController::class, 'show']);
            Route::post('/', [TipoViviendaController::class, 'store']);
            Route::put('/{id}', [TipoViviendaController::class, 'update']);
            Route::patch('/{id}/estado', [TipoViviendaController::class, 'cambiarEstado']);
            Route::delete('/{id}', [TipoViviendaController::class, 'destroy']);
        });

        // Reportes técnicos de campo (Sub-fase D)
        Route::prefix('reportes-tecnicos')->group(function () {
            Route::get('/unidad/{tipo}/{id}',               [ReporteTecnicoController::class, 'porUnidad']);
            Route::get('/proyecto/{proyectoId}/galeria',    [ReporteTecnicoController::class, 'galeriaProyecto']);
            Route::get('/vivienda/{viviendaId}/exportar-avance', [ReporteTecnicoController::class, 'exportarAvance']);
            Route::get('/vivienda/{viviendaId}/exportar-fotos',  [ReporteTecnicoController::class, 'exportarFotos']);
            Route::get('/{id}',                             [ReporteTecnicoController::class, 'show']);
            Route::post('/',                                [ReporteTecnicoController::class, 'store']);
        });

        Route::prefix('exportar')->group(function () {
            Route::get('/materiales',                       [ExportacionController::class, 'materiales']);
            Route::get('/proyectos',                        [ExportacionController::class, 'proyectos']);
            Route::get('/proyectos/{id}/avance',            [ExportacionController::class, 'avanceProyecto']);
            Route::get('/proyectos/{id}/beneficiarios',     [ExportacionController::class, 'beneficiarios']);
            Route::post('/proyectos/{id}/actas-zip',        [ExportacionController::class, 'actasZip']);
            Route::get('/beneficiarios/{id}/ficha',         [ExportacionController::class, 'fichaBeneficiario']);
            Route::get('/viviendas/{id}/acta',              [ExportacionController::class, 'actaEntrega']);
            Route::get('/personal',                         [ExportacionController::class, 'personal']);
            Route::get('/usuarios',                         [ExportacionController::class, 'usuarios']);
            Route::get('/roles/matriz',                     [ExportacionController::class, 'matrizRoles']);
            Route::get('/almacenes/{almacenId}/kardex/{materialId}', [ExportacionController::class, 'kardexAlmacen']);
            Route::get('/proyectos/{proyectoId}/presupuesto-materiales', [ExportacionController::class, 'presupuestoMateriales']);
            Route::get('/movimientos-almacen', [ExportacionController::class, 'movimientosAlmacen']);
        });

        // Almacenes y Materiales
        Route::get('/unidades-medida', function () {
            return response()->json([
                'status' => 'success',
                'data' => \App\Models\UnidadMedida::where('activa', true)->orderBy('nombre')->get()
            ]);
        });

        Route::prefix('categorias-material')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\CategoriaMaterialController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\Api\CategoriaMaterialController::class, 'store']);
            Route::put('/{id}', [\App\Http\Controllers\Api\CategoriaMaterialController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\CategoriaMaterialController::class, 'destroy']);
        });

        Route::prefix('materiales')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\MaterialController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\Api\MaterialController::class, 'store']);
            Route::put('/{id}', [\App\Http\Controllers\Api\MaterialController::class, 'update']);
            Route::patch('/{id}/estado', [\App\Http\Controllers\Api\MaterialController::class, 'cambiarEstado']);
            Route::post('/upload-foto', [\App\Http\Controllers\Api\MaterialController::class, 'uploadFoto']);
        });

        // Almacenes (Sub-fase B)
        Route::prefix('almacenes')->group(function () {
            Route::get('/estadisticas',               [AlmacenController::class, 'estadisticas']);
            Route::get('/',                           [AlmacenController::class, 'index']);
            Route::post('/',                          [AlmacenController::class, 'store']);
            Route::get('/{id}',                       [AlmacenController::class, 'show']);
            Route::put('/{id}',                       [AlmacenController::class, 'update']);
            Route::patch('/{id}/estado',              [AlmacenController::class, 'cambiarEstado']);
            Route::post('/{almacenId}/entradas',      [AlmacenController::class, 'registrarEntrada']);
            Route::post('/{almacenId}/salidas',       [AlmacenController::class, 'registrarSalida']);
            Route::post('/{almacenId}/ajustes',       [AlmacenController::class, 'ajustar']);
            Route::get('/{almacenId}/kardex/{materialId}', [AlmacenController::class, 'kardex']);
        });
        Route::post('/almacenes-transferencias', [AlmacenController::class, 'transferir']);

        // Movimientos de almacén — Sub-fase C
        Route::prefix('movimientos-almacen')->group(function () {
            Route::get('/',                                     [MovimientoAlmacenController::class, 'index']);
            Route::get('/{movimientoAlmacen}',                  [MovimientoAlmacenController::class, 'show']);
            Route::post('/entradas',                            [MovimientoAlmacenController::class, 'registrarEntrada']);
            Route::post('/salidas-sociales',                    [MovimientoAlmacenController::class, 'registrarSalidaSocial']);
            Route::post('/salidas-privadas',                    [MovimientoAlmacenController::class, 'registrarSalidaPrivada']);
            Route::post('/transferencias',                      [MovimientoAlmacenController::class, 'registrarTransferencia']);
            Route::patch('/{movimientoAlmacen}/anular',         [MovimientoAlmacenController::class, 'anular']);
            Route::post('/validar-consumo',                     [MovimientoAlmacenController::class, 'validarConsumo']);
        });

        // Presupuesto de materiales por proyecto (Sub-fase B)
        Route::prefix('proyectos/{proyectoId}/presupuesto-materiales')->group(function () {
            Route::get('/',                                [PresupuestoMaterialController::class, 'indexPorProyecto']);
            Route::post('/',                               [PresupuestoMaterialController::class, 'store']);
            Route::delete('/{id}',                         [PresupuestoMaterialController::class, 'destroy']);
            Route::post('/importar',                       [PresupuestoMaterialController::class, 'importar']);
        });
        Route::get('/presupuesto-materiales/{presupuestoId}/sugerir-distribucion', [PresupuestoMaterialController::class, 'sugerirDistribucion']);

        Route::prefix('zonas-geograficas')->group(function () {
            Route::get('/', [ZonaGeograficaController::class, 'index']);
            Route::get('/departamento/{depto}', [ZonaGeograficaController::class, 'porDepartamento']);
            Route::get('/cercanas', [ZonaGeograficaController::class, 'cercanas']);
        });

        // Modificatorios contractuales (Sub-fase F)
        Route::prefix('proyectos/{proyectoId}/modificatorios')->group(function () {
            Route::get('/',         [ModificatorioController::class, 'index']);
            Route::post('/monto',   [ModificatorioController::class, 'storeMonto']);
            Route::post('/plazo',   [ModificatorioController::class, 'storePlazo']);
        });
        Route::prefix('modificatorios')->group(function () {
            Route::get('/{id}',                    [ModificatorioController::class, 'show']);
            Route::put('/{id}/items',              [ModificatorioController::class, 'updateItems']);
            Route::put('/{id}/justificativo',      [ModificatorioController::class, 'updateJustificativo']);
            Route::post('/{id}/justificativo/generar', [ModificatorioController::class, 'generarJustificativo']);
            Route::post('/{id}/enviar-aprobacion', [ModificatorioController::class, 'enviarAprobacion']);
            Route::post('/{id}/aprobar',           [ModificatorioController::class, 'aprobar']);
            Route::post('/{id}/rechazar',          [ModificatorioController::class, 'rechazar']);
            Route::post('/{id}/aplicar',           [ModificatorioController::class, 'aplicar']);
            Route::get('/{id}/pdf',                [ModificatorioController::class, 'pdf']);
        });

        // Cierre de registros de beneficiarios (Sub-fase F)
        Route::prefix('proyectos/{proyectoId}/cierre-registros')->group(function () {
            Route::get('/estado',                 [CierreRegistrosBeneficiariosController::class, 'estado']);
            Route::post('/cerrar',                [CierreRegistrosBeneficiariosController::class, 'cerrar']);
            Route::post('/solicitar-reapertura',  [CierreRegistrosBeneficiariosController::class, 'solicitarReapertura']);
            Route::post('/verificar-reapertura',  [CierreRegistrosBeneficiariosController::class, 'verificarReapertura']);
        });

        // ─── Biblioteca Constructiva (Sub-fase B) ────────────────────────────────
        Route::prefix('biblioteca-constructiva')->group(function () {
            // Categorías constructivas
            Route::get('/categorias',       [BibliotecaConstructivaController::class, 'categorias']);
            Route::post('/categorias',      [BibliotecaConstructivaController::class, 'crearCategoria']);
            Route::put('/categorias/{id}',  [BibliotecaConstructivaController::class, 'actualizarCategoria']);
            Route::delete('/categorias/{id}', [BibliotecaConstructivaController::class, 'eliminarCategoria']);

            // Ítems constructivos
            Route::get('/',                 [BibliotecaConstructivaController::class, 'index']);
            Route::post('/',                [BibliotecaConstructivaController::class, 'store']);
            Route::get('/{id}',             [BibliotecaConstructivaController::class, 'show']);
            Route::put('/{id}',             [BibliotecaConstructivaController::class, 'update']);
            Route::patch('/{id}/estado',    [BibliotecaConstructivaController::class, 'cambiarEstado']);
            Route::delete('/{id}',          [BibliotecaConstructivaController::class, 'destroy']);

            // Importador Excel
            Route::get('/importar/plantilla-excel', [BibliotecaConstructivaController::class, 'descargarPlantillaExcel']);
            Route::post('/importar/excel',          [BibliotecaConstructivaController::class, 'importarExcel']);
        });

        // Plantillas constructivas (Sub-fase B)
        Route::prefix('plantillas-constructivas')->group(function () {
            Route::get('/',                [PlantillaConstructivaController::class, 'index']);
            Route::post('/',               [PlantillaConstructivaController::class, 'store']);
            Route::get('/{id}',            [PlantillaConstructivaController::class, 'show']);
            Route::put('/{id}',            [PlantillaConstructivaController::class, 'update']);
            Route::delete('/{id}',         [PlantillaConstructivaController::class, 'destroy']);
            Route::patch('/{id}/estado',   [PlantillaConstructivaController::class, 'cambiarEstado']);
            Route::post('/{id}/duplicar',  [PlantillaConstructivaController::class, 'duplicar']);
        });

        // Presupuesto automático por proyecto (Sub-fase B)
        Route::prefix('proyectos/{proyectoId}/presupuesto-items')->group(function () {
            Route::get('/',                     [PresupuestoItemsProyectoController::class, 'items']);
            Route::get('/consolidado',          [PresupuestoItemsProyectoController::class, 'consolidado']);
            Route::post('/generar',             [PresupuestoItemsProyectoController::class, 'generarDesde']);
            Route::post('/generar-social',      [PresupuestoItemsProyectoController::class, 'generarDesdePlantillaSocial']);
            Route::post('/generar-privado',     [PresupuestoItemsProyectoController::class, 'generarDesdePlantillaPrivado']);
            Route::post('/recalcular',          [PresupuestoItemsProyectoController::class, 'recalcular']);
            Route::post('/bloquear',            [PresupuestoItemsProyectoController::class, 'bloquear']);
        });
        Route::post('/presupuesto-items/{presupuestoItemId}/override', [PresupuestoItemsProyectoController::class, 'aplicarOverride']);
        // Standalone: usado por EntregaSocialModal (?proyecto_id, ?beneficiario_id, ?por_entregar)
        Route::get('/presupuesto-items-proyecto', [PresupuestoItemsProyectoController::class, 'porBeneficiario']);

        // Configuración de porcentajes presupuestales (Rediseño Proyectos)
        Route::prefix('configuracion/porcentajes-presupuesto')->group(function () {
            Route::get('/', [ConfiguracionPorcentajesController::class, 'index']);
            Route::put('/{tipo}', [ConfiguracionPorcentajesController::class, 'update']);
        });

        // Plantillas de checklist (Sub-fase F)
        Route::prefix('plantillas-checklist')->group(function () {
            Route::get('/',                [PlantillaChecklistController::class, 'index']);
            Route::post('/',               [PlantillaChecklistController::class, 'store']);
            Route::get('/{id}',            [PlantillaChecklistController::class, 'show']);
            Route::put('/{id}',            [PlantillaChecklistController::class, 'update']);
            Route::delete('/{id}',         [PlantillaChecklistController::class, 'destroy']);
            Route::patch('/{id}/toggle-activo', [PlantillaChecklistController::class, 'toggleActivo']);
            Route::put('/{id}/reordenar',  [PlantillaChecklistController::class, 'reordenar']);
            Route::post('/{id}/items',     [PlantillaChecklistController::class, 'storeItem']);
            Route::put('/{id}/items/{itemId}',    [PlantillaChecklistController::class, 'updateItem']);
            Route::delete('/{id}/items/{itemId}', [PlantillaChecklistController::class, 'destroyItem']);
            Route::post('/{id}/aplicar-a-proyecto/{proyectoId}', [PlantillaChecklistController::class, 'aplicarAProyecto']);
        });

    }); // fin ForzarCambioPassword
}); // fin auth:sanctum
