<?php

namespace App\Services\Proyectos;

use App\Models\ConfiguracionPorcentajesPresupuesto;
use App\Models\Proyecto;
use App\Models\TipoProyecto;
use App\Models\User;
use App\Services\NotificacionService;
use App\Services\Proyectos\CascadaProyectoService;
use App\Services\Proyectos\CalculadoraAvanceService;
use App\Exceptions\Proyectos\TransicionEstadoNoPermitidaException;
use App\Exceptions\Proyectos\ProyectoConDependenciasException;
use App\Exceptions\Proyectos\ProyectoEnEstadoNoModificableException;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;
use Carbon\Carbon;

class ProyectoService
{
    protected NotificacionService $notificacion;
    protected CalculoAvanceService $calculoAvance;
    protected CascadaProyectoService $cascada;
    protected CalculadoraAvanceService $calculadora;

    public function __construct(
        NotificacionService $notificacion,
        CalculoAvanceService $calculoAvance,
        CascadaProyectoService $cascada,
        CalculadoraAvanceService $calculadora
    ) {
        $this->notificacion  = $notificacion;
        $this->calculoAvance = $calculoAvance;
        $this->cascada       = $cascada;
        $this->calculadora   = $calculadora;
    }

    public function listarConFiltros(array $filtros, int $perPage = 20): LengthAwarePaginator
    {
        $query = Proyecto::with(['tipoProyecto', 'cliente', 'entidadEstatal', 'zona', 'responsable']);

        if (!empty($filtros['busqueda'])) {
            $query->buscar($filtros['busqueda']);
        }
        if (!empty($filtros['estado']) && $filtros['estado'] !== 'todos') {
            $query->porEstado($filtros['estado']);
        }
        if (!empty($filtros['categoria']) && $filtros['categoria'] !== 'todos') {
            $query->where('categoria', $filtros['categoria']);
        }
        if (!empty($filtros['prioridad']) && $filtros['prioridad'] !== 'todos') {
            $query->where('prioridad', $filtros['prioridad']);
        }
        if (!empty($filtros['tipo_proyecto_id'])) {
            $query->where('tipo_proyecto_id', $filtros['tipo_proyecto_id']);
        }
        if (!empty($filtros['zona_id'])) {
            $query->where('zona_id', $filtros['zona_id']);
        }
        if (!empty($filtros['responsable_id'])) {
            $query->where('responsable_id', $filtros['responsable_id']);
        }
        if (!empty($filtros['cliente_id'])) {
            $query->where('cliente_id', $filtros['cliente_id']);
        }
        if (!empty($filtros['entidad_estatal_id'])) {
            $query->where('entidad_estatal_id', $filtros['entidad_estatal_id']);
        }
        if (!empty($filtros['fecha_desde'])) {
            $query->whereDate('fecha_inicio_planificada', '>=', $filtros['fecha_desde']);
        }
        if (!empty($filtros['fecha_hasta'])) {
            $query->whereDate('fecha_fin_planificada', '<=', $filtros['fecha_hasta']);
        }

        $allowedSorts = ['codigo', 'nombre', 'created_at', 'estado', 'avance_fisico', 'presupuesto_referencial', 'fecha_inicio_planificada'];
        $ordenarPor = in_array($filtros['ordenar_por'] ?? '', $allowedSorts) ? $filtros['ordenar_por'] : 'created_at';
        $direccion = in_array(strtolower($filtros['direccion'] ?? ''), ['asc', 'desc']) ? strtolower($filtros['direccion']) : 'desc';

        $query->orderBy($ordenarPor, $direccion);
        return $query->paginate($perPage);
    }

    public function obtenerCompleto(int $id): array
    {
        $proyecto = Proyecto::with([
            'tipoProyecto', 'cliente', 'entidadEstatal', 'zona',
            'responsable', 'creadoPor',
            'beneficiarios',
            'fasesProyecto' => fn($q) => $q->orderBy('orden'),
        ])->findOrFail($id);

        // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
        // $auditoria = Auditoria::with('actor:id,nombre,apellido_paterno')
        //     ->where('tabla_afectada', 'proyectos')
        //     ->where('registro_id', $id)
        //     ->orderBy('created_at', 'desc')
        //     ->limit(20)
        //     ->get();
        $auditoria = [];

        $estadisticas = $this->obtenerEstadisticasProyecto($proyecto);

        return [
            'proyecto'               => $proyecto,
            'auditoria'              => $auditoria,
            'estadisticas'           => $estadisticas,
            'transiciones_permitidas' => $proyecto->getTransicionesPermitidas(),
        ];
    }

    public function obtenerDashboard(int $id): array
    {
        $proyecto = Proyecto::with([
            'tipoProyecto:id,nombre',
            'cliente:id,nombre_completo',
            'entidadEstatal:id,nombre',
            'zona:id,nombre',
            'responsable:id,nombre,apellido_paterno,foto_url',
            'almacen',
            'hitosCobro',
        ])->findOrFail($id);

        $dashData = $this->calculadora->calcularDashboard($proyecto);

        $hitoCobros = $proyecto->hitosCobro->map(fn($h) => [
            'id'                  => $h->id,
            'nombre'              => $h->nombre,
            'porcentaje_contrato' => (float) $h->porcentaje_contrato,
            'monto_calculado'     => (float) $h->monto_calculado,
            'fecha_planificada'   => $h->fecha_planificada?->format('Y-m-d'),
            'fecha_cobrado'       => $h->fecha_cobrado?->format('Y-m-d'),
            'tipo'                => $h->tipo,
            'estado'              => $h->estado,
        ])->values();

        return array_merge(
            [
                'proyecto'               => $proyecto,
                'transiciones_permitidas' => $proyecto->getTransicionesPermitidas(),
                'hitos_cobro'            => $hitoCobros,
            ],
            $dashData
        );
    }

    public function crear(array $datos, int $actorId): Proyecto
    {
        // Validar contraparte por categoría
        if ($datos['categoria'] === 'social' && empty($datos['entidad_estatal_id'])) {
            throw ValidationException::withMessages(['entidad_estatal_id' => 'Los proyectos sociales requieren una entidad estatal contratante.']);
        }
        if ($datos['categoria'] === 'privado' && empty($datos['cliente_id'])) {
            throw ValidationException::withMessages(['cliente_id' => 'Los proyectos privados requieren un cliente.']);
        }

        // Validar fases privado
        $fasesConfig = $datos['fases_config'] ?? [];
        if (!empty($fasesConfig)) {
            $suma = array_sum(array_column($fasesConfig, 'porcentaje'));
            if (abs($suma - 100) > 0.01) {
                throw ValidationException::withMessages(['fases_config' => "La suma de porcentajes de fases debe ser 100% (actual: {$suma}%)."]);
            }
        }

        // Validar hitos de cobro (acepta tanto 'hitos_cobro' como 'productos_contractuales' por legado)
        $hitosDesdeNuevoApi = isset($datos['hitos_cobro']);
        $hitosData = $datos['hitos_cobro'] ?? $datos['productos_contractuales'] ?? [];
        // Clave de error para compatibilidad con tests legacy
        $hitosErrorKey = $hitosDesdeNuevoApi ? 'hitos_cobro' : 'productos_contractuales';

        if (!empty($hitosData)) {
            $suma = array_sum(array_column($hitosData, 'porcentaje'));
            if (abs($suma - 100) > 0.01) {
                throw ValidationException::withMessages([$hitosErrorKey => "La suma de porcentajes de hitos debe ser 100% (actual: {$suma}%)."]);
            }

            $inicio = $datos['fecha_inicio_planificada'] ?? null;
            $fin    = $datos['fecha_fin_planificada'] ?? null;
            if ($inicio && $fin) {
                foreach ($hitosData as $idx => $hito) {
                    $fecha = $hito['fecha_planificada'] ?? $hito['fecha_planificada_cobro'] ?? null;
                    if ($fecha && ($fecha < $inicio || $fecha > $fin)) {
                        throw ValidationException::withMessages(["{$hitosErrorKey}.{$idx}.fecha_planificada" => "La fecha del hito '{$hito['nombre']}' debe estar dentro del rango del proyecto."]);
                    }
                }
            }
        }

        // Cargar set de porcentajes del tipo de proyecto
        $categoria  = $datos['categoria'] ?? 'social';
        $configSet  = ConfiguracionPorcentajesPresupuesto::paraProyecto($categoria);
        $contractual = (float) ($datos['monto_contractual'] ?? $datos['monto_contrato'] ?? $datos['presupuesto_referencial'] ?? 0);

        // Snapshot de porcentajes: copiar del set al proyecto
        $porMO   = (float) ($datos['porcentaje_mano_obra']        ?? $configSet->porcentaje_mano_obra);
        $porGG   = (float) ($datos['porcentaje_gastos_generales'] ?? $configSet->porcentaje_gastos_generales);
        $porUtil = (float) ($datos['porcentaje_utilidad_esperada'] ?? $configSet->porcentaje_utilidad_esperada);
        $umbral  = (float) $configSet->umbral_rentabilidad_minima;

        $usaFijoMO   = (bool) ($datos['usa_monto_fijo_mo']  ?? false);
        $usaFijoGG   = (bool) ($datos['usa_monto_fijo_gg']  ?? false);
        $usaFijoUtil = (bool) ($datos['usa_monto_fijo_util'] ?? false);

        // Calcular componentes
        $presupMO   = $usaFijoMO   ? (float) ($datos['presupuesto_mano_obra']        ?? 0) : $contractual * $porMO   / 100;
        $presupGG   = $usaFijoGG   ? (float) ($datos['presupuesto_gastos_generales'] ?? 0) : $contractual * $porGG   / 100;
        $presupUtil = $usaFijoUtil  ? (float) ($datos['presupuesto_utilidad_esperada'] ?? 0) : $contractual * $porUtil / 100;
        // presupuesto_materiales: use explicit override if sent, otherwise compute as residual
        $presupMat  = (isset($datos['presupuesto_materiales']) && $datos['presupuesto_materiales'] !== null)
            ? (float) $datos['presupuesto_materiales']
            : max(0.0, $contractual - $presupMO - $presupGG - $presupUtil);

        // Calcular rentabilidad estimada
        $costos       = $presupMat + $presupMO + $presupGG;
        $rentabilidad = $contractual - $costos;
        $pctUtil      = $contractual > 0 ? ($rentabilidad / $contractual) * 100 : 0;

        // Si rentabilidad < umbral, exigir justificación
        if ($contractual > 0 && $pctUtil < $umbral) {
            $justificacion = trim($datos['justificacion_rentabilidad_baja'] ?? '');
            if (empty($justificacion)) {
                throw ValidationException::withMessages([
                    'justificacion_rentabilidad_baja' => "La rentabilidad estimada ({$pctUtil}%) está bajo el umbral mínimo ({$umbral}%). Debes proporcionar una justificación.",
                ]);
            }
        }

        // Separar opciones de cascada
        $opcionesCascada = [
            'cantidad_fases'         => $datos['cantidad_fases'] ?? 1,
            'fases_config'           => $fasesConfig,
            'cantidad_beneficiarios' => $datos['cantidad_beneficiarios'] ?? 0,
            'hitos_cobro'            => $hitosData,
        ];

        $camposProyecto = array_diff_key($datos, array_flip([
            'cantidad_fases', 'fases_config', 'hitos_cobro', 'productos_contractuales',
        ]));

        // Añadir campos financieros calculados
        $camposProyecto['monto_contractual']             = $contractual ?: null;
        $camposProyecto['porcentaje_mano_obra']          = $porMO;
        $camposProyecto['porcentaje_gastos_generales']   = $porGG;
        $camposProyecto['porcentaje_utilidad_esperada']  = $porUtil;
        $camposProyecto['presupuesto_materiales']        = $presupMat;
        $camposProyecto['presupuesto_mano_obra']         = $presupMO;
        $camposProyecto['presupuesto_gastos_generales']  = $presupGG;
        $camposProyecto['presupuesto_utilidad_esperada'] = $presupUtil;
        $camposProyecto['salud_financiera']              = $contractual > 0
            ? ($pctUtil >= $umbral + 5 ? 'saludable' : ($pctUtil >= $umbral ? 'atencion' : 'critico'))
            : null;
        $camposProyecto['usa_monto_fijo_mo']             = $usaFijoMO;
        $camposProyecto['usa_monto_fijo_gg']             = $usaFijoGG;
        $camposProyecto['usa_monto_fijo_util']           = $usaFijoUtil;

        // Para proyectos sociales, retención siempre activa
        if ($categoria === 'social') {
            $camposProyecto['aplica_retencion_7_porciento'] = true;
        }

        return DB::transaction(function () use ($camposProyecto, $actorId, $opcionesCascada) {
            $anio   = date('Y');
            $ultimo = Proyecto::withTrashed()->where('codigo', 'LIKE', "PRJ-{$anio}-%")->count();
            $camposProyecto['codigo']        = 'PRJ-' . $anio . '-' . str_pad($ultimo + 1, 4, '0', STR_PAD_LEFT);
            $camposProyecto['creado_por_id'] = $actorId;
            $camposProyecto['estado']        = 'formulacion';

            if (!empty($camposProyecto['fecha_inicio_planificada']) && !empty($camposProyecto['fecha_fin_planificada'])) {
                $ini = \Carbon\Carbon::parse($camposProyecto['fecha_inicio_planificada']);
                $fin = \Carbon\Carbon::parse($camposProyecto['fecha_fin_planificada']);
                $camposProyecto['plazo_dias'] = $ini->diffInDays($fin);
            }

            $proyecto = Proyecto::create($camposProyecto);

            $this->cascada->ejecutar($proyecto, $opcionesCascada);

            return $proyecto->load(['tipoProyecto', 'cliente', 'entidadEstatal', 'zona', 'responsable', 'almacen', 'hitosCobro']);
        });
    }

    public function actualizar(int $id, array $datos, int $actorId): Proyecto
    {
        $proyecto = Proyecto::findOrFail($id);

        if (in_array($proyecto->estado, ['finalizado'])) {
            throw new ProyectoEnEstadoNoModificableException("No se puede modificar un proyecto finalizado.");
        }

        // Proteger campos inmutables
        unset($datos['codigo'], $datos['creado_por_id'], $datos['estado']);

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

            $evento = 'proyecto.actualizado';
            if (isset($cambiosReales['presupuesto_referencial']) || isset($cambiosReales['monto_contrato'])) {
                $evento = 'proyecto.presupuesto_modificado';
            }

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarActualizacion($evento, 'proyectos', $proyecto->id, $cambiosReales, $nuevosReales);

            return $proyecto->load(['tipoProyecto', 'cliente', 'entidadEstatal', 'zona', 'responsable']);
        });
    }

    public function cambiarEstado(int $id, string $nuevoEstado, ?string $razon, int $actorId, bool $esGerente): Proyecto
    {
        return DB::transaction(function () use ($id, $nuevoEstado, $razon, $actorId, $esGerente) {
            $proyecto = Proyecto::with(['beneficiarios', 'fasesProyecto'])->findOrFail($id);
            $estadoAnterior = $proyecto->estado;

            if (!$proyecto->puedeTransicionarA($nuevoEstado)) {
                $permitidos = implode(', ', $proyecto->getTransicionesPermitidas());
                throw new TransicionEstadoNoPermitidaException(
                    "No se puede pasar de '{$estadoAnterior}' a '{$nuevoEstado}'. Permitidos: {$permitidos}"
                );
            }

            // cancelado → formulacion solo por gerente
            if ($estadoAnterior === 'cancelado' && !$esGerente) {
                throw new TransicionEstadoNoPermitidaException('Solo el gerente puede reactivar un proyecto cancelado.');
            }

            // Cancelado o pausado requiere razón
            if (in_array($nuevoEstado, ['cancelado', 'pausado']) && empty(trim($razon ?? ''))) {
                throw ValidationException::withMessages(['razon' => "Se requiere una razón para cambiar a '{$nuevoEstado}'."]);
            }

            // adjudicado → en_ejecucion: debe tener al menos 1 fase definida
            if ($estadoAnterior === 'adjudicado' && $nuevoEstado === 'en_ejecucion') {
                if ($proyecto->fasesProyecto->count() === 0) {
                    throw new TransicionEstadoNoPermitidaException('El proyecto debe tener al menos 1 fase definida antes de iniciar ejecución.');
                }
            }

            // → finalizado: avance=100% y fases completadas
            if ($nuevoEstado === 'finalizado') {
                $noCompletadas = $proyecto->fasesProyecto->whereNotIn('estado', ['completada'])->count();
                if ($noCompletadas > 0) {
                    throw new TransicionEstadoNoPermitidaException("Quedan {$noCompletadas} fases sin completar.");
                }
                if ($proyecto->avance_fisico < 100) {
                    throw new TransicionEstadoNoPermitidaException("El avance físico debe ser 100% para finalizar (actual: {$proyecto->avance_fisico}%).");
                }
            }

            $proyecto->estado = $nuevoEstado;

            if ($nuevoEstado === 'en_ejecucion' && !$proyecto->fecha_inicio_real) {
                $proyecto->fecha_inicio_real = now()->toDateString();
            }
            if ($nuevoEstado === 'finalizado' && !$proyecto->fecha_fin_real) {
                $proyecto->fecha_fin_real = now()->toDateString();
            }

            if (in_array($nuevoEstado, ['cancelado', 'pausado']) && $razon) {
                $obs = $proyecto->observaciones ? $proyecto->observaciones . "\n\n" : "";
                $proyecto->observaciones = $obs . "[{$nuevoEstado} - " . date('Y-m-d') . "]: {$razon}";
            }

            $proyecto->save();

            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarCambioEstado('proyecto.estado_cambiado', 'proyectos', $proyecto->id, $estadoAnterior, $nuevoEstado, $razon);

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

    public function cambiarResponsable(int $id, int $nuevoResponsableId, int $actorId): Proyecto
    {
        $proyecto = Proyecto::findOrFail($id);
        $resp = User::with('rol')->findOrFail($nuevoResponsableId);

        if ($resp->estado !== 'activo') {
            throw ValidationException::withMessages(['responsable_id' => 'El usuario debe estar activo.']);
        }
        $rolesPermitidos = ['gerente', 'administrador_proyecto'];
        if (!$resp->rol || !in_array($resp->rol->nombre, $rolesPermitidos)) {
            throw ValidationException::withMessages(['responsable_id' => 'El usuario debe tener rol de gerente o administrador de proyecto.']);
        }

        $anteriorId = $proyecto->responsable_id;
        $proyecto->responsable_id = $nuevoResponsableId;
        $proyecto->save();

        // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
        // $this->auditoria->registrarActualizacion('proyecto.responsable_cambiado', 'proyectos', $proyecto->id, ['responsable_id' => $anteriorId], ['responsable_id' => $nuevoResponsableId]);

        return $proyecto->load('responsable');
    }

    public function eliminar(int $id, int $actorId, string $razon): bool
    {
        $proyecto = Proyecto::withCount(['fasesProyecto', 'beneficiarios'])->findOrFail($id);

        if (in_array($proyecto->estado, ['en_ejecucion', 'finalizado'])) {
            throw new ProyectoEnEstadoNoModificableException("No se puede eliminar un proyecto en estado '{$proyecto->estado}'.");
        }

        if ($proyecto->fases_proyecto_count > 0) {
            throw new ProyectoConDependenciasException("El proyecto tiene {$proyecto->fases_proyecto_count} fases. Elimínalas primero.", 'fases', $proyecto->fases_proyecto_count);
        }
        if ($proyecto->beneficiarios_count > 0) {
            throw new ProyectoConDependenciasException("El proyecto tiene {$proyecto->beneficiarios_count} beneficiarios. Elimínalos primero.", 'beneficiarios', $proyecto->beneficiarios_count);
        }

        return DB::transaction(function () use ($proyecto, $razon) {
            $proyecto->delete();
            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarEliminacion('proyecto.eliminado', 'proyectos', $proyecto->id, $proyecto->toArray(), $razon);
            $this->notificacion->enviarAGerente("Proyecto eliminado", "El proyecto {$proyecto->codigo} - {$proyecto->nombre} fue eliminado.", 'info');
            return true;
        });
    }

    public function restaurar(int $id, int $actorId): Proyecto
    {
        $proyecto = Proyecto::onlyTrashed()->findOrFail($id);

        return DB::transaction(function () use ($proyecto) {
            $proyecto->restore();
            // TODO: reactivar con owen-it/laravel-auditing en sprint de auditoría
            // $this->auditoria->registrarActualizacion('proyecto.restaurado', 'proyectos', $proyecto->id, ...);
            return $proyecto;
        });
    }

    public function cambiarAdministrador(int $id, int $administradorId, int $actorId): Proyecto
    {
        return $this->cambiarResponsable($id, $administradorId, $actorId);
    }

    public function obtenerEstadisticasGenerales(): array
    {
        return [
            'total'       => Proyecto::count(),
            'por_estado'  => [
                'formulacion'  => Proyecto::porEstado('formulacion')->count(),
                'licitacion'   => Proyecto::porEstado('licitacion')->count(),
                'adjudicado'   => Proyecto::porEstado('adjudicado')->count(),
                'en_ejecucion' => Proyecto::porEstado('en_ejecucion')->count(),
                'pausado'      => Proyecto::porEstado('pausado')->count(),
                'finalizado'   => Proyecto::porEstado('finalizado')->count(),
                'cancelado'    => Proyecto::porEstado('cancelado')->count(),
            ],
            'por_categoria' => [
                'social'  => Proyecto::where('categoria', 'social')->count(),
                'privado' => Proyecto::where('categoria', 'privado')->count(),
            ],
            'avance_promedio'          => round(Proyecto::activos()->avg('avance_fisico') ?? 0, 2),
            'presupuesto_total_activos' => Proyecto::activos()->sum('presupuesto_referencial'),
            'creados_ultimo_mes'       => Proyecto::where('created_at', '>=', now()->subMonth())->count(),
        ];
    }

    private function obtenerEstadisticasProyecto(Proyecto $proyecto): array
    {
        $stats = ['avance' => (float) $proyecto->avance_fisico];

        $stats['total_fases']      = $proyecto->fasesProyecto->count();
        $stats['fases_completadas'] = $proyecto->fasesProyecto->where('estado', 'completada')->count();
        $stats['fases_en_progreso'] = $proyecto->fasesProyecto->where('estado', 'en_progreso')->count();
        $stats['total_beneficiarios'] = $proyecto->beneficiarios->count();

        return $stats;
    }
}
