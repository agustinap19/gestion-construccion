<?php

namespace App\Services;

use App\Mail\EstadoCuentaMail;
use App\Mail\RolCambiadoMail;
use App\Mail\UsuarioCreadoMail;
use App\Models\DispositivoConfiable;
use App\Models\Personal;
use App\Models\Permiso;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Exception;

class UsuarioService
{
    private const PERMISOS_CRITICOS = [
        'roles.crear', 'roles.eliminar', 'usuarios.crear', 'usuarios.eliminar',
    ];

    public function __construct(
        protected AuditoriaService $auditoriaService,
        protected NotificacionService $notificacionService
    ) {}

    /**
     * Lista usuarios con filtros avanzados y paginación.
     */
    public function listarConFiltros(array $filtros, int $perPage = 15): LengthAwarePaginator
    {
        $query = User::with('rol.permisos');

        if (!empty($filtros['busqueda'])) {
            $b = $filtros['busqueda'];
            $query->where(function ($q) use ($b) {
                $q->where('nombre', 'like', "%{$b}%")
                  ->orWhere('apellido_paterno', 'like', "%{$b}%")
                  ->orWhere('apellido_materno', 'like', "%{$b}%")
                  ->orWhere('email', 'like', "%{$b}%")
                  ->orWhere('ci', 'like', "%{$b}%");
            });
        }

        if (!empty($filtros['rol_id'])) {
            $query->where('rol_id', $filtros['rol_id']);
        }

        if (!empty($filtros['estado']) && $filtros['estado'] !== 'todos') {
            $query->where('estado', $filtros['estado']);
        }

        if (isset($filtros['tiene_2fa'])) {
            $query->where('rostro_registrado', filter_var($filtros['tiene_2fa'], FILTER_VALIDATE_BOOLEAN));
        }

        if (isset($filtros['con_password_temporal']) && $filtros['con_password_temporal']) {
            $query->where('debe_cambiar_password', true);
        }

        if (isset($filtros['bloqueado']) && $filtros['bloqueado']) {
            $query->where('bloqueado_hasta', '>', now());
        }

        if (!empty($filtros['ultimo_acceso_dias'])) {
            $query->where('ultimo_acceso', '>=', now()->subDays((int)$filtros['ultimo_acceso_dias']));
        }

        $ordenar = $filtros['ordenar_por'] ?? 'created_at';
        $dir = $filtros['direccion'] ?? 'desc';
        $columnasValidas = ['nombre', 'ultimo_acceso', 'created_at', 'intentos_fallidos'];
        if (in_array($ordenar, $columnasValidas)) {
            $query->orderBy($ordenar, $dir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        return $query->paginate($perPage);
    }

    /**
     * Obtiene un usuario completo con datos relacionados, sesiones, dispositivos, actividad y auditoría.
     */
    public function obtenerCompleto(int $id): array
    {
        $usuario = User::with('rol.permisos')->findOrFail($id);

        // Sesiones activas
        $sesiones = DB::table('personal_access_tokens')
            ->where('tokenable_id', $usuario->id)
            ->where('tokenable_type', User::class)
            ->select('id', 'name', 'created_at', 'last_used_at')
            ->orderByDesc('last_used_at')
            ->get();

        // Dispositivos confiables
        $dispositivos = DispositivoConfiable::where('usuario_id', $usuario->id)
            ->orderByDesc('ultimo_uso')
            ->get();

        // Últimos 20 intentos de acceso
        $intentosAcceso = DB::table('intentos_acceso')
            ->where('email', $usuario->email)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        // Estadísticas últimos 30 días
        $hace30d = now()->subDays(30);
        $estadisticas = [
            'total_logins_exitosos_30d' => DB::table('intentos_acceso')
                ->where('email', $usuario->email)
                ->where('exitoso', true)
                ->where('created_at', '>=', $hace30d)
                ->count(),
            'total_logins_fallidos_30d' => DB::table('intentos_acceso')
                ->where('email', $usuario->email)
                ->where('exitoso', false)
                ->where('created_at', '>=', $hace30d)
                ->count(),
            'ultimo_login_exitoso' => DB::table('intentos_acceso')
                ->where('email', $usuario->email)
                ->where('exitoso', true)
                ->orderByDesc('created_at')
                ->value('created_at'),
            'ultimo_login_fallido' => DB::table('intentos_acceso')
                ->where('email', $usuario->email)
                ->where('exitoso', false)
                ->orderByDesc('created_at')
                ->value('created_at'),
            'dispositivos_activos_count' => $dispositivos->where('activo', true)->count(),
            'sesiones_activas_count' => $sesiones->count(),
        ];

        // Auditoría (últimos 10 eventos donde el usuario es objetivo)
        $auditoria = $this->auditoriaService->obtenerPorTabla('usuarios', $usuario->id);

        return [
            'usuario' => $usuario,
            'sesiones' => $sesiones,
            'dispositivos' => $dispositivos,
            'intentos_acceso' => $intentosAcceso,
            'estadisticas' => $estadisticas,
            'auditoria' => $auditoria,
        ];
    }

    /**
     * Crea un nuevo usuario con todas las reglas de negocio.
     */
    public function crear(array $datos, int $actorId): User
    {
        // Validar permisos críticos si el rol los tiene
        if (!empty($datos['rol_id'])) {
            $this->validarRolCritico($datos['rol_id'], $actorId);
        }

        return DB::transaction(function () use ($datos, $actorId) {
            $passwordTemporal = Str::password(12, true, true, true, false);

            $usuario = User::create([
                'nombre' => $datos['nombre'],
                'apellido_paterno' => $datos['apellido_paterno'],
                'apellido_materno' => $datos['apellido_materno'] ?? null,
                'ci' => $datos['ci'],
                'ci_complemento' => $datos['ci_complemento'] ?? null,
                'email' => $datos['email'],
                'telefono' => $datos['telefono'] ?? null,
                'fecha_nacimiento' => $datos['fecha_nacimiento'] ?? null,
                'direccion' => $datos['direccion'] ?? null,
                'rol_id' => $datos['rol_id'],
                'estado' => $datos['estado'] ?? 'activo',
                'password' => Hash::make($passwordTemporal),
                'debe_cambiar_password' => true,
                'rostro_registrado' => false,
            ]);

            // Crear personal vinculado si se solicita
            if (!empty($datos['crear_personal_vinculado']) && !empty($datos['personal_data'])) {
                $pd = $datos['personal_data'];
                Personal::create([
                    'usuario_id' => $usuario->id,
                    'codigo_empleado' => 'EMP-' . str_pad($usuario->id, 4, '0', STR_PAD_LEFT),
                    'nombre' => $usuario->nombre,
                    'apellido_paterno' => $usuario->apellido_paterno,
                    'apellido_materno' => $usuario->apellido_materno,
                    'ci' => $usuario->ci,
                    'ci_complemento' => $usuario->ci_complemento,
                    'telefono' => $usuario->telefono,
                    'direccion' => $usuario->direccion,
                    'fecha_nacimiento' => $usuario->fecha_nacimiento,
                    'tipo' => $pd['tipo'],
                    'especialidad' => $pd['especialidad'] ?? null,
                    'categoria' => $pd['categoria'] ?? null,
                    'fecha_contratacion' => $pd['fecha_contratacion'],
                    'tipo_contrato' => $pd['tipo_contrato'],
                    'salario_base' => $pd['salario_base'],
                    'frecuencia_pago' => $pd['frecuencia_pago'],
                    'banco' => $pd['banco'] ?? null,
                    'numero_cuenta' => $pd['numero_cuenta'] ?? null,
                    'tipo_cuenta' => $pd['tipo_cuenta'] ?? null,
                    'estado_laboral' => 'activo',
                ]);
            }

            // Enviar correo con credenciales
            Mail::to($usuario->email)->send(new UsuarioCreadoMail($usuario, $passwordTemporal));

            // Auditoría
            $this->auditoriaService->registrar('usuario.creado', 'usuarios', $usuario->id, [
                'datos_nuevos' => [
                    'nombre' => $usuario->nombre . ' ' . $usuario->apellido_paterno,
                    'email' => $usuario->email,
                    'rol_id' => $usuario->rol_id,
                    'personal_vinculado' => !empty($datos['crear_personal_vinculado']),
                ],
            ]);

            return $usuario->load('rol');
        });
    }

    /**
     * Actualiza datos básicos de un usuario (sin password ni email).
     */
    public function actualizar(int $id, array $datos, int $actorId): User
    {
        $usuario = User::findOrFail($id);

        // No permitir cambiar password desde aquí
        unset($datos['password'], $datos['email']);

        // Si cambia rol, validar
        if (!empty($datos['rol_id']) && $datos['rol_id'] != $usuario->rol_id) {
            $this->validarRolCritico($datos['rol_id'], $actorId);
        }

        $datosAnteriores = $usuario->only(['nombre', 'apellido_paterno', 'apellido_materno', 'ci', 'telefono', 'direccion', 'fecha_nacimiento', 'rol_id']);

        $camposActualizables = ['nombre', 'apellido_paterno', 'apellido_materno', 'ci', 'ci_complemento', 'telefono', 'fecha_nacimiento', 'direccion', 'rol_id'];
        $datosUpdate = [];
        foreach ($camposActualizables as $campo) {
            if (array_key_exists($campo, $datos)) {
                $datosUpdate[$campo] = $datos[$campo];
            }
        }

        if (!empty($datosUpdate)) {
            $usuario->update($datosUpdate);
        }

        $datosNuevos = $usuario->only(['nombre', 'apellido_paterno', 'apellido_materno', 'ci', 'telefono', 'direccion', 'fecha_nacimiento', 'rol_id']);

        if ($datosAnteriores != $datosNuevos) {
            $this->auditoriaService->registrar('usuario.actualizado', 'usuarios', $usuario->id, [
                'datos_anteriores' => $datosAnteriores,
                'datos_nuevos' => $datosNuevos,
            ]);

            // Notificar al usuario
            $this->notificacionService->enviarA($usuario->id, [
                'tipo' => 'info',
                'titulo' => 'Datos actualizados',
                'mensaje' => 'Un administrador ha actualizado tus datos personales.',
                'icono' => 'user',
            ]);
        }

        // Si cambió estado a suspendido/inactivo, cerrar sesiones
        if (!empty($datos['estado']) && in_array($datos['estado'], ['suspendido', 'inactivo'])) {
            $this->cerrarTodasLasSesiones($usuario->id, $actorId);
        }

        return $usuario->load('rol');
    }

    /**
     * Cambia el rol de un usuario con auditoría y notificación.
     */
    public function cambiarRol(int $usuarioId, int $nuevoRolId, ?string $razon, int $actorId): User
    {
        $usuario = User::with('rol')->findOrFail($usuarioId);
        $this->validarRolCritico($nuevoRolId, $actorId);

        $rolAnterior = $usuario->rol;
        $rolNuevo = Rol::findOrFail($nuevoRolId);

        $usuario->update(['rol_id' => $nuevoRolId]);

        $this->auditoriaService->registrar('usuario.rol_cambiado', 'usuarios', $usuario->id, [
            'datos_anteriores' => ['rol' => $rolAnterior->nombre_visible, 'rol_id' => $rolAnterior->id],
            'datos_nuevos' => ['rol' => $rolNuevo->nombre_visible, 'rol_id' => $rolNuevo->id],
            'razon' => $razon,
        ]);

        $this->notificacionService->enviarA($usuario->id, [
            'tipo' => 'warning',
            'titulo' => 'Cambio de rol',
            'mensaje' => "Tu rol ha sido cambiado de \"{$rolAnterior->nombre_visible}\" a \"{$rolNuevo->nombre_visible}\".",
            'icono' => 'shield',
        ]);

        // Enviar correo
        try {
            $actor = User::find($actorId);
            Mail::to($usuario->email)->send(new RolCambiadoMail($usuario, $rolAnterior, $rolNuevo, $razon, $actor));
        } catch (\Exception $e) {
            // No abortar si falla el correo
        }

        return $usuario->load('rol');
    }

    /**
     * Cambia el estado de un usuario con todas las reglas de negocio.
     */
    public function cambiarEstado(int $usuarioId, string $nuevoEstado, ?string $razon, int $actorId): User
    {
        $usuario = User::findOrFail($usuarioId);
        $estadoAnterior = $usuario->estado;

        // Proteger admin central
        if ($usuario->esAdminCentral() && in_array($nuevoEstado, ['inactivo', 'suspendido'])) {
            throw new Exception('Este usuario es el administrador central del sistema y no puede ser desactivado ni suspendido.');
        }

        if ($estadoAnterior === $nuevoEstado) {
            throw new Exception("El usuario ya se encuentra en estado '{$nuevoEstado}'.");
        }

        $usuario->update(['estado' => $nuevoEstado]);

        // Si pasa a suspendido o inactivo: cerrar sesiones
        if (in_array($nuevoEstado, ['suspendido', 'inactivo'])) {
            DB::table('personal_access_tokens')
                ->where('tokenable_id', $usuario->id)
                ->where('tokenable_type', User::class)
                ->delete();
        }

        // Si pasa a activo desde suspendido: resetear bloqueo
        if ($nuevoEstado === 'activo' && $estadoAnterior === 'suspendido') {
            $usuario->update([
                'intentos_fallidos' => 0,
                'bloqueado_hasta' => null,
            ]);
        }

        $this->auditoriaService->registrar('usuario.estado_cambiado', 'usuarios', $usuario->id, [
            'datos_anteriores' => ['estado' => $estadoAnterior],
            'datos_nuevos' => ['estado' => $nuevoEstado],
            'razon' => $razon,
        ]);

        $this->notificacionService->enviarA($usuario->id, [
            'tipo' => $nuevoEstado === 'activo' ? 'success' : ($nuevoEstado === 'suspendido' ? 'error' : 'warning'),
            'titulo' => 'Estado de cuenta modificado',
            'mensaje' => "Tu cuenta ha sido cambiada a estado: {$nuevoEstado}." . ($razon ? " Razón: {$razon}" : ''),
            'icono' => 'shield',
        ]);

        // Enviar correo
        try {
            Mail::to($usuario->email)->send(new EstadoCuentaMail($usuario, $estadoAnterior, $nuevoEstado, $razon));
        } catch (\Exception $e) {}

        return $usuario->load('rol');
    }

    /**
     * Desbloquea la cuenta de un usuario.
     */
    public function desbloquearCuenta(int $usuarioId, int $actorId): User
    {
        $usuario = User::findOrFail($usuarioId);

        $usuario->update([
            'intentos_fallidos' => 0,
            'bloqueado_hasta' => null,
        ]);

        // Si estaba suspendido, pasar a inactivo
        if ($usuario->estado === 'suspendido') {
            $usuario->update(['estado' => 'inactivo']);
        }

        $this->auditoriaService->registrar('usuario.desbloqueado', 'usuarios', $usuario->id, [
            'datos_nuevos' => ['intentos_fallidos' => 0, 'bloqueado_hasta' => null],
        ]);

        $this->notificacionService->enviarA($usuario->id, [
            'tipo' => 'success',
            'titulo' => 'Cuenta desbloqueada',
            'mensaje' => 'Tu cuenta ha sido desbloqueada por un administrador.',
            'icono' => 'unlock',
        ]);

        return $usuario->load('rol');
    }

    /**
     * Reenvía contraseña temporal a un usuario.
     */
    public function reenviarPasswordTemporal(int $id, int $actorId): User
    {
        $usuario = User::findOrFail($id);
        $passwordTemporal = Str::password(12, true, true, true, false);

        $usuario->update([
            'password' => Hash::make($passwordTemporal),
            'debe_cambiar_password' => true,
            'intentos_fallidos' => 0,
        ]);

        // Cerrar todas las sesiones
        DB::table('personal_access_tokens')
            ->where('tokenable_id', $usuario->id)
            ->where('tokenable_type', User::class)
            ->delete();

        Mail::to($usuario->email)->send(new UsuarioCreadoMail($usuario, $passwordTemporal));

        $this->auditoriaService->registrar('usuario.reenvio_password', 'usuarios', $usuario->id, [
            'datos_nuevos' => ['motivo' => 'reenvio_password_admin'],
        ]);

        return $usuario->load('rol');
    }

    /**
     * Cierra una sesión específica de un usuario.
     */
    public function cerrarSesion(int $usuarioId, int $tokenId, int $actorId): bool
    {
        $deleted = DB::table('personal_access_tokens')
            ->where('id', $tokenId)
            ->where('tokenable_id', $usuarioId)
            ->where('tokenable_type', User::class)
            ->delete();

        if ($deleted) {
            $this->auditoriaService->registrar('usuario.sesion_cerrada', 'usuarios', $usuarioId, [
                'datos_nuevos' => ['token_id' => $tokenId],
            ]);

            $this->notificacionService->enviarA($usuarioId, [
                'tipo' => 'warning',
                'titulo' => 'Sesión cerrada',
                'mensaje' => 'Un administrador ha cerrado una de tus sesiones activas.',
                'icono' => 'logout',
            ]);
        }

        return (bool) $deleted;
    }

    /**
     * Cierra todas las sesiones de un usuario.
     */
    public function cerrarTodasLasSesiones(int $usuarioId, int $actorId): int
    {
        $count = DB::table('personal_access_tokens')
            ->where('tokenable_id', $usuarioId)
            ->where('tokenable_type', User::class)
            ->delete();

        if ($count > 0) {
            $this->auditoriaService->registrar('usuario.sesiones_cerradas', 'usuarios', $usuarioId, [
                'datos_nuevos' => ['sesiones_cerradas' => $count],
            ]);

            $this->notificacionService->enviarA($usuarioId, [
                'tipo' => 'warning',
                'titulo' => 'Todas las sesiones cerradas',
                'mensaje' => "Un administrador ha cerrado todas tus sesiones activas ({$count}).",
                'icono' => 'logout',
            ]);
        }

        return $count;
    }

    /**
     * Revoca un dispositivo confiable.
     */
    public function revocarDispositivo(int $usuarioId, int $dispositivoId, int $actorId): bool
    {
        $dispositivo = DispositivoConfiable::where('id', $dispositivoId)
            ->where('usuario_id', $usuarioId)
            ->firstOrFail();

        $dispositivo->update(['activo' => false]);

        $this->auditoriaService->registrar('usuario.dispositivo_revocado', 'usuarios', $usuarioId, [
            'datos_nuevos' => ['dispositivo_id' => $dispositivoId, 'nombre' => $dispositivo->nombre_dispositivo],
        ]);

        $this->notificacionService->enviarA($usuarioId, [
            'tipo' => 'warning',
            'titulo' => 'Dispositivo revocado',
            'mensaje' => "Se ha revocado el acceso desde \"{$dispositivo->nombre_dispositivo}\".",
            'icono' => 'device',
        ]);

        return true;
    }

    /**
     * Revoca todos los dispositivos confiables de un usuario.
     */
    public function revocarTodosDispositivos(int $usuarioId, int $actorId): int
    {
        $count = DispositivoConfiable::where('usuario_id', $usuarioId)
            ->where('activo', true)
            ->update(['activo' => false]);

        if ($count > 0) {
            $this->auditoriaService->registrar('usuario.dispositivos_revocados', 'usuarios', $usuarioId, [
                'datos_nuevos' => ['dispositivos_revocados' => $count],
            ]);
        }

        return $count;
    }

    /**
     * Soft delete de un usuario.
     */
    public function eliminar(int $id, int $actorId, ?string $razon = null): bool
    {
        $usuario = User::findOrFail($id);

        // Proteger admin central
        if ($usuario->esAdminCentral()) {
            throw new Exception('Este usuario es el administrador central del sistema y no puede ser eliminado.');
        }

        // Cerrar sesiones
        DB::table('personal_access_tokens')
            ->where('tokenable_id', $usuario->id)
            ->where('tokenable_type', User::class)
            ->delete();

        // Revocar dispositivos
        DispositivoConfiable::where('usuario_id', $usuario->id)->update(['activo' => false]);

        $this->auditoriaService->registrar('usuario.eliminado', 'usuarios', $usuario->id, [
            'datos_anteriores' => [
                'nombre' => $usuario->nombre . ' ' . $usuario->apellido_paterno,
                'email' => $usuario->email,
            ],
            'razon' => $razon,
        ]);

        return $usuario->delete();
    }

    /**
     * Restaura un usuario eliminado.
     */
    public function restaurar(int $id, int $actorId): User
    {
        $usuario = User::withTrashed()->findOrFail($id);
        $usuario->restore();
        $usuario->update(['estado' => 'inactivo']);

        $this->auditoriaService->registrar('usuario.restaurado', 'usuarios', $usuario->id, [
            'datos_nuevos' => ['estado' => 'inactivo'],
        ]);

        return $usuario->load('rol');
    }

    /**
     * Ejecuta acciones masivas sobre múltiples usuarios.
     */
    public function accionMasiva(string $accion, array $usuarioIds, ?string $razon, int $actorId): array
    {
        $exitosos = [];
        $fallidos = [];

        foreach ($usuarioIds as $uid) {
            try {
                switch ($accion) {
                    case 'activar':
                        $this->cambiarEstado($uid, 'activo', $razon, $actorId);
                        break;
                    case 'desactivar':
                        $this->cambiarEstado($uid, 'inactivo', $razon, $actorId);
                        break;
                    case 'suspender':
                        $this->cambiarEstado($uid, 'suspendido', $razon, $actorId);
                        break;
                    case 'reenviar_password':
                        $this->reenviarPasswordTemporal($uid, $actorId);
                        break;
                    case 'cerrar_sesiones':
                        $this->cerrarTodasLasSesiones($uid, $actorId);
                        break;
                    case 'revocar_dispositivos':
                        $this->revocarTodosDispositivos($uid, $actorId);
                        break;
                    case 'eliminar':
                        $this->eliminar($uid, $actorId, $razon);
                        break;
                    default:
                        throw new Exception("Acción '{$accion}' no reconocida.");
                }
                $exitosos[] = $uid;
            } catch (Exception $e) {
                $fallidos[] = ['id' => $uid, 'error' => $e->getMessage()];
            }
        }

        return ['exitosos' => $exitosos, 'fallidos' => $fallidos];
    }

    /**
     * Verifica si un rol tiene permisos críticos y si el actor es gerente.
     */
    private function validarRolCritico(int $rolId, int $actorId): void
    {
        $rol = Rol::with('permisos')->find($rolId);
        if (!$rol) return;

        $codigosRol = $rol->permisos->pluck('codigo')->toArray();
        $tienePermisosCriticos = !empty(array_intersect($codigosRol, self::PERMISOS_CRITICOS));

        if ($tienePermisosCriticos) {
            $actor = User::with('rol')->find($actorId);
            if (!$actor || $actor->rol->nombre !== 'gerente') {
                throw new Exception('Solo el gerente puede asignar roles con permisos administrativos críticos.');
            }
        }
    }
}
