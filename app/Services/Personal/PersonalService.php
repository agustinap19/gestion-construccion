<?php

namespace App\Services\Personal;

use App\Models\Personal;
use App\Models\User;
use App\Services\AuditoriaService;
use App\Services\NotificacionService;
use App\Services\UsuarioService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Exception;

class PersonalService
{
    public function __construct(
        protected AuditoriaService $auditoriaService,
        protected NotificacionService $notificacionService,
        protected UsuarioService $usuarioService
    ) {}

    /**
     * Lista personal con filtros avanzados y paginación.
     */
    public function listarConFiltros(array $filtros, int $perPage = 15): LengthAwarePaginator
    {
        $query = Personal::with('usuario.rol', 'competencias');

        if (!empty($filtros['busqueda'])) {
            $b = $filtros['busqueda'];
            $query->where(function ($q) use ($b) {
                $q->where('nombre', 'like', "%{$b}%")
                  ->orWhere('apellido_paterno', 'like', "%{$b}%")
                  ->orWhere('apellido_materno', 'like', "%{$b}%")
                  ->orWhere('ci', 'like', "%{$b}%")
                  ->orWhere('codigo_empleado', 'like', "%{$b}%");
            });
        }

        if (!empty($filtros['tipo']) && $filtros['tipo'] !== 'todos') {
            $query->where('tipo', $filtros['tipo']);
        }

        if (!empty($filtros['estado_laboral']) && $filtros['estado_laboral'] !== 'todos') {
            $query->where('estado_laboral', $filtros['estado_laboral']);
        }

        if (!empty($filtros['tipo_contrato']) && $filtros['tipo_contrato'] !== 'todos') {
            $query->where('tipo_contrato', $filtros['tipo_contrato']);
        }

        if (isset($filtros['tiene_usuario'])) {
            $tiene = filter_var($filtros['tiene_usuario'], FILTER_VALIDATE_BOOLEAN);
            $tiene ? $query->conUsuario() : $query->sinUsuario();
        }

        if (!empty($filtros['especialidad'])) {
            $query->where('especialidad', 'like', "%{$filtros['especialidad']}%");
        }

        if (!empty($filtros['competencia_id'])) {
            $query->whereHas('competencias', fn ($q) =>
                $q->where('competencias.id', $filtros['competencia_id'])
            );
        }

        if (!empty($filtros['competencias_vencidas'])) {
            $query->whereHas('competencias', fn ($q) =>
                $q->wherePivot('estado', 'vencida')
            );
        }

        if (!empty($filtros['proximas_a_vencer_dias'])) {
            $dias = (int) $filtros['proximas_a_vencer_dias'];
            $query->whereHas('competencias', fn ($q) =>
                $q->wherePivot('estado', 'vigente')
                  ->wherePivotBetween('fecha_vencimiento', [now(), now()->addDays($dias)])
            );
        }

        $ordenar = $filtros['ordenar_por'] ?? 'created_at';
        $dir = $filtros['direccion'] ?? 'desc';
        $columnasValidas = ['nombre', 'codigo_empleado', 'fecha_contratacion', 'salario_base', 'created_at'];
        if (in_array($ordenar, $columnasValidas)) {
            $query->orderBy($ordenar, $dir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        return $query->paginate($perPage);
    }

    /**
     * Obtiene un registro de personal completo con datos relacionados.
     */
    public function obtenerCompleto(int $id): array
    {
        $personal = Personal::with('usuario.rol', 'competencias')->findOrFail($id);

        // Estadísticas de competencias
        $competenciasStats = [
            'total_competencias' => $personal->competencias->count(),
            'competencias_vigentes' => $personal->competencias->where('pivot.estado', 'vigente')->count(),
            'competencias_vencidas' => $personal->competencias->where('pivot.estado', 'vencida')->count(),
            'competencias_proximas_vencer' => $personal->competencias
                ->where('pivot.estado', 'vigente')
                ->filter(fn ($c) =>
                    $c->pivot->fecha_vencimiento &&
                    $c->pivot->fecha_vencimiento >= now() &&
                    $c->pivot->fecha_vencimiento <= now()->addDays(30)
                )->count(),
        ];

        // Auditoría
        $auditoria = $this->auditoriaService->obtenerPorTabla('personal', $personal->id);

        return [
            'personal' => $personal,
            'estadisticas_competencias' => $competenciasStats,
            'auditoria' => $auditoria,
        ];
    }

    /**
     * Genera el siguiente código de empleado auto-incremental.
     */
    public function generarCodigoEmpleado(): string
    {
        $ultimo = Personal::withTrashed()
            ->where('codigo_empleado', 'like', 'EMP%')
            ->orderByRaw("CAST(SUBSTRING(codigo_empleado, 4) AS UNSIGNED) DESC")
            ->value('codigo_empleado');

        if ($ultimo) {
            $numero = (int) substr($ultimo, 3);
            return 'EMP' . str_pad($numero + 1, 3, '0', STR_PAD_LEFT);
        }

        return 'EMP001';
    }

    /**
     * Crea un nuevo registro de personal con vinculación de usuario opcional.
     */
    public function crear(array $datos, int $actorId): Personal
    {
        return DB::transaction(function () use ($datos, $actorId) {
            // Auto-generar código si no se envía
            if (empty($datos['codigo_empleado'])) {
                $datos['codigo_empleado'] = $this->generarCodigoEmpleado();
            }

            $usuarioId = null;

            // Crear usuario vinculado si se solicita
            if (!empty($datos['crear_usuario_vinculado']) && !empty($datos['usuario_data'])) {
                $datosUsuario = array_merge($datos['usuario_data'], [
                    'nombre' => $datos['nombre'],
                    'apellido_paterno' => $datos['apellido_paterno'],
                    'apellido_materno' => $datos['apellido_materno'] ?? null,
                    'ci' => $datos['ci'],
                    'ci_complemento' => $datos['ci_complemento'] ?? null,
                    'telefono' => $datos['telefono'] ?? null,
                    'direccion' => $datos['direccion'] ?? null,
                    'fecha_nacimiento' => $datos['fecha_nacimiento'] ?? null,
                ]);
                $usuario = $this->usuarioService->crear($datosUsuario, $actorId);
                $usuarioId = $usuario->id;
            }

            // Vincular con usuario existente
            if (!empty($datos['vincular_usuario_existente_id'])) {
                $uid = $datos['vincular_usuario_existente_id'];
                $yaVinculado = Personal::where('usuario_id', $uid)->exists();
                if ($yaVinculado) {
                    throw new Exception('El usuario seleccionado ya está vinculado a otro registro de personal.');
                }
                $usuarioId = $uid;
            }

            $personal = Personal::create([
                'usuario_id' => $usuarioId,
                'codigo_empleado' => $datos['codigo_empleado'],
                'nombre' => $datos['nombre'],
                'apellido_paterno' => $datos['apellido_paterno'],
                'apellido_materno' => $datos['apellido_materno'] ?? null,
                'ci' => $datos['ci'],
                'ci_complemento' => $datos['ci_complemento'] ?? null,
                'telefono' => $datos['telefono'] ?? null,
                'direccion' => $datos['direccion'] ?? null,
                'fecha_nacimiento' => $datos['fecha_nacimiento'] ?? null,
                'tipo' => $datos['tipo'],
                'especialidad' => $datos['especialidad'] ?? null,
                'categoria' => $datos['categoria'] ?? null,
                'fecha_contratacion' => $datos['fecha_contratacion'],
                'tipo_contrato' => $datos['tipo_contrato'],
                'salario_base' => $datos['salario_base'],
                'frecuencia_pago' => $datos['frecuencia_pago'],
                'banco' => $datos['banco'] ?? null,
                'numero_cuenta' => $datos['numero_cuenta'] ?? null,
                'tipo_cuenta' => $datos['tipo_cuenta'] ?? null,
                'estado_laboral' => $datos['estado_laboral'] ?? 'activo',
            ]);

            $this->auditoriaService->registrar('personal.creado', 'personal', $personal->id, [
                'datos_nuevos' => [
                    'nombre' => $personal->nombre_completo,
                    'codigo' => $personal->codigo_empleado,
                    'tipo' => $personal->tipo,
                    'con_usuario' => $personal->tieneUsuario(),
                ],
            ]);

            return $personal->load('usuario.rol', 'competencias');
        });
    }

    /**
     * Actualiza datos de un personal existente.
     */
    public function actualizar(int $id, array $datos, int $actorId): Personal
    {
        $personal = Personal::findOrFail($id);

        // No permitir cambiar codigo_empleado ni usuario_id desde aquí
        unset($datos['codigo_empleado'], $datos['usuario_id']);

        $camposActualizables = [
            'nombre', 'apellido_paterno', 'apellido_materno', 'ci', 'ci_complemento',
            'telefono', 'direccion', 'fecha_nacimiento', 'tipo', 'especialidad', 'categoria',
            'fecha_contratacion', 'tipo_contrato', 'salario_base', 'frecuencia_pago',
            'banco', 'numero_cuenta', 'tipo_cuenta',
        ];

        $datosAnteriores = $personal->only($camposActualizables);
        $datosUpdate = [];

        foreach ($camposActualizables as $campo) {
            if (array_key_exists($campo, $datos)) {
                $datosUpdate[$campo] = $datos[$campo];
            }
        }

        if (empty($datosUpdate)) {
            return $personal->load('usuario.rol', 'competencias');
        }

        // Detectar cambios críticos para auditoría específica
        $cambioSalario = isset($datosUpdate['salario_base']) && $datosUpdate['salario_base'] != $personal->salario_base;
        $cambioContrato = isset($datosUpdate['tipo_contrato']) && $datosUpdate['tipo_contrato'] !== $personal->tipo_contrato;

        $personal->update($datosUpdate);

        $datosNuevos = $personal->only($camposActualizables);

        if ($datosAnteriores != $datosNuevos) {
            $this->auditoriaService->registrar('personal.actualizado', 'personal', $personal->id, [
                'datos_anteriores' => $datosAnteriores,
                'datos_nuevos' => $datosNuevos,
            ]);
        }

        if ($cambioSalario) {
            $this->auditoriaService->registrar('personal.salario_cambiado', 'personal', $personal->id, [
                'datos_anteriores' => ['salario_base' => $datosAnteriores['salario_base']],
                'datos_nuevos' => ['salario_base' => $datosUpdate['salario_base']],
            ]);
        }

        if ($cambioContrato) {
            $this->auditoriaService->registrar('personal.contrato_cambiado', 'personal', $personal->id, [
                'datos_anteriores' => ['tipo_contrato' => $datosAnteriores['tipo_contrato']],
                'datos_nuevos' => ['tipo_contrato' => $datosUpdate['tipo_contrato']],
            ]);
        }

        if ($personal->tieneUsuario()) {
            $this->notificacionService->enviarA($personal->usuario_id, [
                'tipo' => 'info',
                'titulo' => 'Datos actualizados',
                'mensaje' => 'Un administrador ha actualizado tus datos laborales.',
                'icono' => 'briefcase',
            ]);
        }

        return $personal->load('usuario.rol', 'competencias');
    }

    /**
     * Cambia el estado laboral de un personal con reglas de negocio.
     */
    public function cambiarEstadoLaboral(int $id, string $nuevoEstado, ?string $razon, int $actorId): Personal
    {
        $personal = Personal::findOrFail($id);
        $estadoAnterior = $personal->estado_laboral;

        if ($estadoAnterior === $nuevoEstado) {
            throw new Exception("El personal ya se encuentra en estado '{$nuevoEstado}'.");
        }

        $actualizacion = ['estado_laboral' => $nuevoEstado];

        if ($nuevoEstado === 'desvinculado') {
            $actualizacion['fecha_desvinculacion'] = now();

            // Suspender usuario vinculado y cerrar sesiones
            if ($personal->tieneUsuario()) {
                $this->usuarioService->cambiarEstado(
                    $personal->usuario_id,
                    'suspendido',
                    "Desvinculación laboral: {$razon}",
                    $actorId
                );
            }
        }

        $personal->update($actualizacion);

        $this->auditoriaService->registrar('personal.estado_laboral_cambiado', 'personal', $personal->id, [
            'datos_anteriores' => ['estado_laboral' => $estadoAnterior],
            'datos_nuevos' => ['estado_laboral' => $nuevoEstado],
            'razon' => $razon,
        ]);

        if ($personal->tieneUsuario()) {
            $this->notificacionService->enviarA($personal->usuario_id, [
                'tipo' => $nuevoEstado === 'desvinculado' ? 'danger' : 'warning',
                'titulo' => 'Cambio de estado laboral',
                'mensaje' => "Tu estado laboral ha cambiado a \"{$nuevoEstado}\"." . ($razon ? " Razón: {$razon}" : ''),
                'icono' => 'briefcase',
            ]);
        }

        return $personal->load('usuario.rol');
    }

    /**
     * Vincula un usuario existente a un personal.
     */
    public function vincularUsuario(int $personalId, int $usuarioId, int $actorId): Personal
    {
        $personal = Personal::findOrFail($personalId);

        if ($personal->tieneUsuario()) {
            throw new Exception('Este personal ya tiene un usuario vinculado. Desvincule primero.');
        }

        $yaVinculado = Personal::where('usuario_id', $usuarioId)->exists();
        if ($yaVinculado) {
            throw new Exception('El usuario seleccionado ya está vinculado a otro registro de personal.');
        }

        $usuario = User::findOrFail($usuarioId);
        $personal->update(['usuario_id' => $usuarioId]);

        $this->auditoriaService->registrar('personal.usuario_vinculado', 'personal', $personal->id, [
            'datos_nuevos' => [
                'usuario_id' => $usuarioId,
                'usuario_email' => $usuario->email,
            ],
        ]);

        return $personal->load('usuario.rol');
    }

    /**
     * Desvincula el usuario de un personal (sin eliminar el usuario).
     */
    public function desvincularUsuario(int $personalId, int $actorId): Personal
    {
        $personal = Personal::with('usuario')->findOrFail($personalId);

        if (!$personal->tieneUsuario()) {
            throw new Exception('Este personal no tiene usuario vinculado.');
        }

        $usuarioAnterior = $personal->usuario;
        $personal->update(['usuario_id' => null]);

        $this->auditoriaService->registrar('personal.usuario_desvinculado', 'personal', $personal->id, [
            'datos_anteriores' => [
                'usuario_id' => $usuarioAnterior->id,
                'usuario_email' => $usuarioAnterior->email,
            ],
        ]);

        return $personal->load('usuario.rol');
    }

    /**
     * Crea un nuevo usuario del sistema para un personal existente.
     */
    public function crearUsuarioParaPersonal(int $personalId, array $datosUsuario, int $actorId): Personal
    {
        $personal = Personal::findOrFail($personalId);

        if ($personal->tieneUsuario()) {
            throw new Exception('Este personal ya tiene un usuario vinculado.');
        }

        $datosCompletos = array_merge($datosUsuario, [
            'nombre' => $personal->nombre,
            'apellido_paterno' => $personal->apellido_paterno,
            'apellido_materno' => $personal->apellido_materno,
            'ci' => $personal->ci,
            'ci_complemento' => $personal->ci_complemento,
            'telefono' => $personal->telefono,
            'direccion' => $personal->direccion,
            'fecha_nacimiento' => $personal->fecha_nacimiento?->format('Y-m-d'),
        ]);

        $usuario = $this->usuarioService->crear($datosCompletos, $actorId);
        $personal->update(['usuario_id' => $usuario->id]);

        $this->auditoriaService->registrar('personal.usuario_creado', 'personal', $personal->id, [
            'datos_nuevos' => [
                'usuario_id' => $usuario->id,
                'email' => $usuario->email,
                'rol' => $usuario->rol->nombre_visible ?? '',
            ],
        ]);

        return $personal->load('usuario.rol', 'competencias');
    }

    /**
     * Soft delete de un personal.
     */
    public function eliminar(int $id, int $actorId, ?string $razon): bool
    {
        $personal = Personal::findOrFail($id);

        $this->auditoriaService->registrar('personal.eliminado', 'personal', $personal->id, [
            'datos_anteriores' => [
                'nombre' => $personal->nombre_completo,
                'codigo' => $personal->codigo_empleado,
                'tiene_usuario' => $personal->tieneUsuario(),
            ],
            'razon' => $razon,
        ]);

        return $personal->delete();
    }

    /**
     * Restaura un personal soft-deleted con estado desvinculado.
     */
    public function restaurar(int $id, int $actorId): Personal
    {
        $personal = Personal::withTrashed()->findOrFail($id);
        $personal->restore();
        $personal->update(['estado_laboral' => 'desvinculado']);

        $this->auditoriaService->registrar('personal.restaurado', 'personal', $personal->id, [
            'datos_nuevos' => ['estado_laboral' => 'desvinculado'],
        ]);

        return $personal->load('usuario.rol', 'competencias');
    }

    /**
     * Obtiene estadísticas generales del personal.
     */
    public function obtenerEstadisticasGenerales(): array
    {
        $counts = Personal::selectRaw("
            COUNT(CASE WHEN estado_laboral = 'activo' THEN 1 END) as total_activos,
            COUNT(CASE WHEN estado_laboral = 'vacaciones' THEN 1 END) as total_vacaciones,
            COUNT(CASE WHEN estado_laboral = 'licencia' THEN 1 END) as total_licencia,
            COUNT(CASE WHEN estado_laboral = 'desvinculado' THEN 1 END) as total_desvinculados,
            COUNT(CASE WHEN usuario_id IS NOT NULL THEN 1 END) as con_usuario_count,
            COUNT(CASE WHEN usuario_id IS NULL THEN 1 END) as sin_usuario_count
        ")->first();

        $distribucionTipo = Personal::where('estado_laboral', '!=', 'desvinculado')
            ->selectRaw('tipo, COUNT(*) as total')
            ->groupBy('tipo')
            ->pluck('total', 'tipo')
            ->toArray();

        $competenciasVencidas = DB::table('personal_competencia')
            ->where('estado', 'vencida')
            ->count();

        $competenciasProximas = DB::table('personal_competencia')
            ->where('estado', 'vigente')
            ->whereBetween('fecha_vencimiento', [now(), now()->addDays(30)])
            ->count();

        $antiguedad = Personal::where('estado_laboral', '!=', 'desvinculado')
            ->selectRaw('AVG(DATEDIFF(NOW(), fecha_contratacion)) as promedio_dias')
            ->value('promedio_dias');

        return [
            'total_activos' => $counts->total_activos ?? 0,
            'total_vacaciones' => $counts->total_vacaciones ?? 0,
            'total_licencia' => $counts->total_licencia ?? 0,
            'total_desvinculados' => $counts->total_desvinculados ?? 0,
            'con_usuario_count' => $counts->con_usuario_count ?? 0,
            'sin_usuario_count' => $counts->sin_usuario_count ?? 0,
            'distribucion_por_tipo' => $distribucionTipo,
            'competencias_vencidas_total' => $competenciasVencidas,
            'competencias_proximas_vencer_total' => $competenciasProximas,
            'antiguedad_promedio_meses' => round(($antiguedad ?? 0) / 30, 1),
        ];
    }
}
