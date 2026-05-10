<?php

namespace App\Services\Proyectos;

use App\Models\Proyecto;
use App\Models\TipoProyecto;
use App\Models\User;
use App\Models\Auditoria;
use App\Services\AuditoriaService;
use App\Services\NotificacionService;
use App\Exceptions\Proyectos\TransicionEstadoNoPermitidaException;
use App\Exceptions\Proyectos\CategoriaProyectoIncompatibleException;
use App\Exceptions\Proyectos\ProyectoConDependenciasException;
use App\Exceptions\Proyectos\ProyectoEnEstadoNoModificableException;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;
use Carbon\Carbon;

class ProyectoService
{
    protected AuditoriaService $auditoria;
    protected NotificacionService $notificacion;
    protected CalculoAvanceService $calculoAvance;

    public function __construct(
        AuditoriaService $auditoria,
        NotificacionService $notificacion,
        CalculoAvanceService $calculoAvance
    ) {
        $this->auditoria = $auditoria;
        $this->notificacion = $notificacion;
        $this->calculoAvance = $calculoAvance;
    }

    public function listarConFiltros(array $filtros, int $perPage = 20): LengthAwarePaginator
    {
        $query = Proyecto::with(['tipoProyecto', 'cliente', 'entidadEstatal', 'zona', 'administrador']);

        if (!empty($filtros['busqueda'])) {
            $query->buscar($filtros['busqueda']);
        }
        if (!empty($filtros['categoria']) && $filtros['categoria'] !== 'todos') {
            $query->porCategoria($filtros['categoria']);
        }
        if (!empty($filtros['estado']) && $filtros['estado'] !== 'todos') {
            $query->porEstado($filtros['estado']);
        }
        if (!empty($filtros['tipo_proyecto_id'])) {
            $query->where('tipo_proyecto_id', $filtros['tipo_proyecto_id']);
        }
        if (!empty($filtros['zona_id'])) {
            $query->where('zona_id', $filtros['zona_id']);
        }
        if (!empty($filtros['administrador_id'])) {
            $query->where('administrador_id', $filtros['administrador_id']);
        }
        if (!empty($filtros['cliente_id'])) {
            $query->where('cliente_id', $filtros['cliente_id']);
        }
        if (!empty($filtros['entidad_estatal_id'])) {
            $query->where('entidad_estatal_id', $filtros['entidad_estatal_id']);
        }
        if (!empty($filtros['prioridad']) && $filtros['prioridad'] !== 'todos') {
            $query->where('prioridad', $filtros['prioridad']);
        }
        if (!empty($filtros['fecha_desde'])) {
            $query->whereDate('fecha_inicio_planificada', '>=', $filtros['fecha_desde']);
        }
        if (!empty($filtros['fecha_hasta'])) {
            $query->whereDate('fecha_fin_planificada', '<=', $filtros['fecha_hasta']);
        }

        $allowedSorts = ['codigo', 'nombre', 'created_at', 'estado', 'porcentaje_avance', 'presupuesto_total', 'fecha_inicio_planificada'];
        $ordenarPor = in_array($filtros['ordenar_por'] ?? '', $allowedSorts) ? $filtros['ordenar_por'] : 'created_at';
        $direccion = in_array(strtolower($filtros['direccion'] ?? ''), ['asc', 'desc']) ? strtolower($filtros['direccion']) : 'desc';

        $query->orderBy($ordenarPor, $direccion);
        return $query->paginate($perPage);
    }

    public function obtenerCompleto(int $id): array
    {
        $proyecto = Proyecto::with([
            'tipoProyecto', 'cliente', 'entidadEstatal', 'zona',
            'administrador', 'creador',
            'viviendas' => fn($q) => $q->with('beneficiario', 'tipoVivienda'),
            'fasesProyecto' => fn($q) => $q->orderBy('orden'),
            'asignacionesPersonal' => fn($q) => $q->with('personal')->where('estado', 'activa'),
        ])->findOrFail($id);

        $auditoria = Auditoria::with('actor:id,nombre,apellido_paterno,foto_url')
            ->where('tabla_afectada', 'proyectos')
            ->where('registro_id', $id)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        $estadisticas = $this->obtenerEstadisticasProyecto($proyecto);

        return [
            'proyecto' => $proyecto,
            'auditoria' => $auditoria,
            'estadisticas' => $estadisticas,
            'transiciones_permitidas' => $proyecto->getTransicionesPermitidas(),
        ];
    }

    public function crear(array $datos, int $actorId): Proyecto
    {
        // Si viene tipo_proyecto_id, inferir categoría
        if (!empty($datos['tipo_proyecto_id'])) {
            $tipoProyecto = TipoProyecto::findOrFail($datos['tipo_proyecto_id']);
            $datos['categoria'] = $tipoProyecto->categoria;
        } else {
            // Si viene categoría pero no tipo_proyecto_id, asignar el primero disponible
            $categoria = $datos['categoria'] ?? 'social';
            $tipoProyecto = TipoProyecto::where('categoria', $categoria)->first();
            if ($tipoProyecto) {
                $datos['tipo_proyecto_id'] = $tipoProyecto->id;
            }
            $datos['categoria'] = $categoria;
        }

        // Reglas 5-6: Validar contraparte según categoría
        if ($datos['categoria'] === 'social') {
            if (!empty($datos['cliente_id'])) {
                throw new CategoriaProyectoIncompatibleException('Un proyecto social no puede tener un cliente privado.');
            }
            if (empty($datos['entidad_estatal_id'])) {
                throw ValidationException::withMessages(['entidad_estatal_id' => 'Los proyectos sociales requieren una entidad estatal.']);
            }
        } else {
            if (!empty($datos['entidad_estatal_id'])) {
                throw new CategoriaProyectoIncompatibleException('Un proyecto privado no puede tener una entidad estatal.');
            }
            if (empty($datos['cliente_id'])) {
                throw ValidationException::withMessages(['cliente_id' => 'Los proyectos privados requieren un cliente.']);
            }
            // Regla 17: monto_garantia solo aplica a sociales
            $datos['monto_garantia'] = null;
        }

        // Regla 18: monto_garantia <= 30% presupuesto (sociales)
        if ($datos['categoria'] === 'social' && !empty($datos['monto_garantia'])) {
            $limite = $datos['presupuesto_total'] * 0.30;
            if ($datos['monto_garantia'] > $limite) {
                throw ValidationException::withMessages([
                    'monto_garantia' => "El monto de garantía no puede superar el 30% del presupuesto (Bs. " . number_format($limite, 2) . ")."
                ]);
            }
        }

        // Regla 23: Validar administrador
        if (!empty($datos['administrador_id'])) {
            $admin = User::with('rol')->find($datos['administrador_id']);
            if (!$admin || $admin->estado !== 'activo') {
                throw ValidationException::withMessages(['administrador_id' => 'El administrador debe ser un usuario activo.']);
            }
            $rolesPermitidos = ['gerente', 'administrador_proyecto'];
            if (!$admin->rol || !in_array($admin->rol->nombre, $rolesPermitidos)) {
                throw ValidationException::withMessages(['administrador_id' => 'El administrador debe tener rol de gerente o administrador de proyecto.']);
            }
        }

        return DB::transaction(function () use ($datos, $actorId) {
            // Regla 1-2: Generar código PRJ-{año}-{secuencial 4 dígitos}
            $anio = date('Y');
            $ultimo = Proyecto::withTrashed()
                ->where('codigo', 'LIKE', "PRJ-{$anio}-%")
                ->count();
            $datos['codigo'] = 'PRJ-' . $anio . '-' . str_pad($ultimo + 1, 4, '0', STR_PAD_LEFT);

            $datos['usuario_creador_id'] = $actorId;
            if (empty($datos['estado'])) {
                $datos['estado'] = 'borrador';
            }

            // Regla 22: Calcular duración planificada
            if (!empty($datos['fecha_inicio_planificada']) && !empty($datos['fecha_fin_planificada'])) {
                $inicio = Carbon::parse($datos['fecha_inicio_planificada']);
                $fin = Carbon::parse($datos['fecha_fin_planificada']);
                $datos['duracion_dias_planificada'] = $inicio->diffInDays($fin);
            }

            $proyecto = Proyecto::create($datos);

            $this->auditoria->registrarCreacion('proyecto.creado', 'proyectos', $proyecto->id, $proyecto->toArray());

            return $proyecto->load(['tipoProyecto', 'cliente', 'entidadEstatal', 'zona', 'administrador']);
        });
    }

    public function actualizar(int $id, array $datos, int $actorId): Proyecto
    {
        $proyecto = Proyecto::findOrFail($id);

        // Regla 25: No modificar si finalizado o cancelado (excepto reactivar cancelado por gerente)
        if (in_array($proyecto->estado, ['finalizado'])) {
            throw new ProyectoEnEstadoNoModificableException("No se puede modificar un proyecto finalizado.");
        }

        // Proteger campos inmutables
        unset($datos['codigo'], $datos['categoria'], $datos['usuario_creador_id'], $datos['estado']);

        // Regla 18: Validar garantía si cambia
        if (isset($datos['monto_garantia']) && $proyecto->es_social) {
            $presupuesto = $datos['presupuesto_total'] ?? $proyecto->presupuesto_total;
            $limite = $presupuesto * 0.30;
            if ($datos['monto_garantia'] > $limite) {
                throw ValidationException::withMessages([
                    'monto_garantia' => "El monto de garantía no puede superar el 30% del presupuesto."
                ]);
            }
        }

        // Recalcular duración si cambian fechas
        $fechaInicio = $datos['fecha_inicio_planificada'] ?? $proyecto->fecha_inicio_planificada;
        $fechaFin = $datos['fecha_fin_planificada'] ?? $proyecto->fecha_fin_planificada;
        if ($fechaInicio && $fechaFin) {
            $datos['duracion_dias_planificada'] = Carbon::parse($fechaInicio)->diffInDays(Carbon::parse($fechaFin));
        }

        $datosAnteriores = $proyecto->toArray();
        $proyecto->fill($datos);

        $cambiosReales = [];
        $nuevosReales = [];
        foreach ($proyecto->getDirty() as $atributo => $valorNuevo) {
            $cambiosReales[$atributo] = $datosAnteriores[$atributo] ?? null;
            $nuevosReales[$atributo] = $valorNuevo;
        }

        if (empty($cambiosReales)) {
            return $proyecto;
        }

        return DB::transaction(function () use ($proyecto, $cambiosReales, $nuevosReales) {
            $proyecto->save();

            // Auditoría especial para presupuesto y garantía
            $evento = 'proyecto.actualizado';
            if (isset($cambiosReales['presupuesto_total']) || isset($cambiosReales['monto_garantia'])) {
                $evento = 'proyecto.presupuesto_modificado';
            }

            $this->auditoria->registrarActualizacion($evento, 'proyectos', $proyecto->id, $cambiosReales, $nuevosReales);

            return $proyecto->load(['tipoProyecto', 'cliente', 'entidadEstatal', 'zona', 'administrador']);
        });
    }

    public function cambiarEstado(int $id, string $nuevoEstado, ?string $razon, int $actorId, bool $esGerente): Proyecto
    {
        return DB::transaction(function () use ($id, $nuevoEstado, $razon, $actorId, $esGerente) {
            $proyecto = Proyecto::with(['beneficiarios', 'viviendas', 'fasesProyecto'])->findOrFail($id);
            $estadoAnterior = $proyecto->estado;

            if (!$proyecto->puedeTransicionarA($nuevoEstado)) {
                $permitidos = implode(', ', $proyecto->getTransicionesPermitidas());
                throw new TransicionEstadoNoPermitidaException(
                    "No se puede pasar de '{$estadoAnterior}' a '{$nuevoEstado}'. Permitidos: {$permitidos}"
                );
            }

            // Regla: cancelado → planificacion solo por gerente
            if ($estadoAnterior === 'cancelado' && !$esGerente) {
                throw new TransicionEstadoNoPermitidaException('Solo el gerente puede reactivar un proyecto cancelado.');
            }

            // Regla 12: Cancelado o pausado requiere razón
            if (in_array($nuevoEstado, ['cancelado', 'pausado']) && empty(trim($razon ?? ''))) {
                throw ValidationException::withMessages(['razon' => "Se requiere una razón para cambiar a '{$nuevoEstado}'."]);
            }

            // Regla 9: borrador → planificacion: campos mínimos
            if ($estadoAnterior === 'borrador' && $nuevoEstado === 'planificacion') {
                $errores = [];
                if (!$proyecto->tipo_proyecto_id) $errores[] = 'tipo de proyecto';
                if (!$proyecto->fecha_inicio_planificada) $errores[] = 'fecha inicio planificada';
                if (!$proyecto->fecha_fin_planificada) $errores[] = 'fecha fin planificada';
                if ($proyecto->presupuesto_total <= 0) $errores[] = 'presupuesto mayor a 0';
                $contraparte = $proyecto->es_social ? $proyecto->entidad_estatal_id : $proyecto->cliente_id;
                if (!$contraparte) $errores[] = 'contraparte (cliente o entidad estatal)';
                if (!empty($errores)) {
                    throw ValidationException::withMessages([
                        'requisitos' => 'Faltan campos obligatorios: ' . implode(', ', $errores)
                    ]);
                }
            }

            // Regla 10: planificacion → en_ejecucion
            if ($estadoAnterior === 'planificacion' && $nuevoEstado === 'en_ejecucion') {
                if ($proyecto->es_social && $proyecto->beneficiarios->where('estado_seleccion', 'aceptado')->count() === 0) {
                    throw new TransicionEstadoNoPermitidaException('El proyecto social debe tener al menos 1 beneficiario aceptado.');
                }
                if ($proyecto->es_privado && $proyecto->fasesProyecto->count() === 0) {
                    throw new TransicionEstadoNoPermitidaException('El proyecto privado debe tener al menos 1 fase definida.');
                }
            }

            // Regla 11: → finalizado: avance=100% y viviendas entregadas / fases completadas
            if ($nuevoEstado === 'finalizado') {
                if ($proyecto->es_social) {
                    $noEntregadas = $proyecto->viviendas->where('estado', '!=', 'entregada')->count();
                    if ($noEntregadas > 0) {
                        throw new TransicionEstadoNoPermitidaException("Quedan {$noEntregadas} viviendas sin entregar.");
                    }
                } else {
                    $noCompletadas = $proyecto->fasesProyecto->whereNotIn('estado', ['completada', 'cancelada'])->count();
                    if ($noCompletadas > 0) {
                        throw new TransicionEstadoNoPermitidaException("Quedan {$noCompletadas} fases sin completar.");
                    }
                }
                if ($proyecto->porcentaje_avance < 100) {
                    throw new TransicionEstadoNoPermitidaException("El avance debe ser 100% para finalizar (actual: {$proyecto->porcentaje_avance}%).");
                }
            }

            $proyecto->estado = $nuevoEstado;

            // Regla 20: fecha_inicio_real al pasar a en_ejecucion
            if ($nuevoEstado === 'en_ejecucion' && !$proyecto->fecha_inicio_real) {
                $proyecto->fecha_inicio_real = now()->toDateString();
            }
            // Regla 21: fecha_fin_real al finalizar
            if ($nuevoEstado === 'finalizado' && !$proyecto->fecha_fin_real) {
                $proyecto->fecha_fin_real = now()->toDateString();
            }

            // Guardar razón en observaciones
            if (in_array($nuevoEstado, ['cancelado', 'pausado']) && $razon) {
                $obs = $proyecto->observaciones ? $proyecto->observaciones . "\n\n" : "";
                $proyecto->observaciones = $obs . "[{$nuevoEstado} - " . date('Y-m-d') . "]: {$razon}";
            }

            $proyecto->save();

            $this->auditoria->registrarCambioEstado('proyecto.estado_cambiado', 'proyectos', $proyecto->id, $estadoAnterior, $nuevoEstado, $razon);

            // Notificar gerente en cambios críticos
            if (in_array($nuevoEstado, ['cancelado', 'finalizado'])) {
                $this->notificacion->enviarAGerente(
                    "Proyecto {$nuevoEstado}: {$proyecto->codigo}",
                    "El proyecto '{$proyecto->nombre}' cambió a estado {$nuevoEstado}.",
                    $nuevoEstado === 'cancelado' ? 'warning' : 'success',
                    "/dashboard/proyectos/{$proyecto->id}"
                );
            }

            return $proyecto;
        });
    }

    public function cambiarAdministrador(int $id, int $nuevoAdminId, int $actorId): Proyecto
    {
        $proyecto = Proyecto::findOrFail($id);
        $admin = User::with('rol')->findOrFail($nuevoAdminId);

        if ($admin->estado !== 'activo') {
            throw ValidationException::withMessages(['administrador_id' => 'El usuario debe estar activo.']);
        }
        $rolesPermitidos = ['gerente', 'administrador_proyecto'];
        if (!$admin->rol || !in_array($admin->rol->nombre, $rolesPermitidos)) {
            throw ValidationException::withMessages(['administrador_id' => 'El usuario debe tener rol de gerente o administrador de proyecto.']);
        }

        $anteriorId = $proyecto->administrador_id;
        $proyecto->administrador_id = $nuevoAdminId;
        $proyecto->save();

        $this->auditoria->registrarActualizacion('proyecto.administrador_cambiado', 'proyectos', $proyecto->id, ['administrador_id' => $anteriorId], ['administrador_id' => $nuevoAdminId]);

        return $proyecto->load('administrador');
    }

    public function eliminar(int $id, int $actorId, string $razon): bool
    {
        $proyecto = Proyecto::withCount(['viviendas', 'fasesProyecto', 'beneficiarios'])->findOrFail($id);

        // Regla 25: No eliminar si en_ejecucion o finalizado
        if (in_array($proyecto->estado, ['en_ejecucion', 'finalizado'])) {
            throw new ProyectoEnEstadoNoModificableException("No se puede eliminar un proyecto en estado '{$proyecto->estado}'.");
        }

        // Regla 25: Verificar dependencias
        if ($proyecto->viviendas_count > 0) {
            throw new ProyectoConDependenciasException("El proyecto tiene {$proyecto->viviendas_count} viviendas. Elimínalas primero.", 'viviendas', $proyecto->viviendas_count);
        }
        if ($proyecto->fases_proyecto_count > 0) {
            throw new ProyectoConDependenciasException("El proyecto tiene {$proyecto->fases_proyecto_count} fases. Elimínalas primero.", 'fases', $proyecto->fases_proyecto_count);
        }
        if ($proyecto->beneficiarios_count > 0) {
            throw new ProyectoConDependenciasException("El proyecto tiene {$proyecto->beneficiarios_count} beneficiarios. Elimínalos primero.", 'beneficiarios', $proyecto->beneficiarios_count);
        }

        return DB::transaction(function () use ($proyecto, $razon) {
            $proyecto->delete();
            $this->auditoria->registrarEliminacion('proyecto.eliminado', 'proyectos', $proyecto->id, $proyecto->toArray(), $razon);
            $this->notificacion->enviarAGerente("Proyecto eliminado", "El proyecto {$proyecto->codigo} - {$proyecto->nombre} fue eliminado.", 'info');
            return true;
        });
    }

    public function restaurar(int $id, int $actorId): Proyecto
    {
        $proyecto = Proyecto::onlyTrashed()->findOrFail($id);

        return DB::transaction(function () use ($proyecto) {
            $proyecto->restore();
            $this->auditoria->registrarActualizacion('proyecto.restaurado', 'proyectos', $proyecto->id, ['deleted_at' => $proyecto->deleted_at], ['deleted_at' => null]);
            return $proyecto;
        });
    }

    public function obtenerEstadisticasGenerales(): array
    {
        return [
            'total' => Proyecto::count(),
            'por_categoria' => [
                'social' => Proyecto::sociales()->count(),
                'privado' => Proyecto::privados()->count(),
            ],
            'por_estado' => [
                'borrador' => Proyecto::porEstado('borrador')->count(),
                'planificacion' => Proyecto::porEstado('planificacion')->count(),
                'en_ejecucion' => Proyecto::porEstado('en_ejecucion')->count(),
                'pausado' => Proyecto::porEstado('pausado')->count(),
                'finalizado' => Proyecto::porEstado('finalizado')->count(),
                'cancelado' => Proyecto::porEstado('cancelado')->count(),
            ],
            'avance_promedio' => round(Proyecto::activos()->avg('porcentaje_avance') ?? 0, 2),
            'presupuesto_total_activos' => Proyecto::activos()->sum('presupuesto_total'),
            'creados_ultimo_mes' => Proyecto::where('created_at', '>=', now()->subMonth())->count(),
        ];
    }

    private function obtenerEstadisticasProyecto(Proyecto $proyecto): array
    {
        $stats = ['avance' => (float) $proyecto->porcentaje_avance];

        if ($proyecto->es_social) {
            $stats['total_viviendas'] = $proyecto->viviendas->count();
            $stats['viviendas_entregadas'] = $proyecto->viviendas->where('estado', 'entregada')->count();
            $stats['viviendas_con_observaciones'] = $proyecto->viviendas->where('tiene_observaciones_activas', true)->count();
            $stats['total_beneficiarios'] = $proyecto->beneficiarios->count() ?? 0;
        } else {
            $stats['total_fases'] = $proyecto->fasesProyecto->count();
            $stats['fases_completadas'] = $proyecto->fasesProyecto->where('estado', 'completada')->count();
            $stats['fases_en_proceso'] = $proyecto->fasesProyecto->where('estado', 'en_proceso')->count();
        }

        $stats['personal_asignado'] = $proyecto->asignacionesPersonal->count();
        return $stats;
    }
}
