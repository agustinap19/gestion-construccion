<?php

namespace App\Services\Beneficiarios;

use App\Models\Beneficiario;
use App\Models\Proyecto;
use App\Services\AuditoriaService;
use App\Services\NotificacionService;
use App\Exceptions\Beneficiarios\BeneficiarioDuplicadoException;
use App\Exceptions\Beneficiarios\ProyectoNoSocialException;
use App\Exceptions\Beneficiarios\ProyectoNoActivoException;
use App\Exceptions\Beneficiarios\TransicionEstadoNoPermitidaException;
use App\Exceptions\Beneficiarios\BeneficiarioConViviendaEnProcesoException;
use App\Exceptions\Beneficiarios\OperacionRequiereGerenteException;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;
use Carbon\Carbon;

class BeneficiarioService
{
    protected AuditoriaService $auditoria;
    protected NotificacionService $notificacion;

    public function __construct(AuditoriaService $auditoria, NotificacionService $notificacion)
    {
        $this->auditoria = $auditoria;
        $this->notificacion = $notificacion;
    }

    public function listarConFiltros(array $filtros, int $perPage = 20): LengthAwarePaginator
    {
        $query = Beneficiario::with(['proyecto.entidadEstatal', 'tipoVivienda', 'registrador']);

        if (!empty($filtros['busqueda'])) {
            $query->buscar($filtros['busqueda']);
        }

        if (!empty($filtros['proyecto_id'])) {
            $query->delProyecto($filtros['proyecto_id']);
        }

        if (!empty($filtros['estado_seleccion']) && $filtros['estado_seleccion'] !== 'todos') {
            $query->where('estado_seleccion', $filtros['estado_seleccion']);
        }

        if (!empty($filtros['tipo_vivienda_id'])) {
            $query->where('tipo_vivienda_id', $filtros['tipo_vivienda_id']);
        }

        if (!empty($filtros['genero'])) {
            $query->where('genero', $filtros['genero']);
        }

        if (isset($filtros['cantidad_familiares_min'])) {
            $query->where('cantidad_familiares', '>=', $filtros['cantidad_familiares_min']);
        }

        if (isset($filtros['cantidad_familiares_max'])) {
            $query->where('cantidad_familiares', '<=', $filtros['cantidad_familiares_max']);
        }

        if (isset($filtros['tiene_documento_propiedad']) && $filtros['tiene_documento_propiedad']) {
            $query->whereNotNull('documento_propiedad_terreno_url');
        }

        if (isset($filtros['tiene_foto']) && $filtros['tiene_foto']) {
            $query->whereNotNull('foto_titular_url');
        }

        if (isset($filtros['con_visitas_pendientes']) && $filtros['con_visitas_pendientes']) {
            $query->whereHas('visitasDomiciliarias', function($q) {
                $q->pendientes();
            });
        }

        if (!empty($filtros['creado_desde'])) {
            $query->whereDate('created_at', '>=', $filtros['creado_desde']);
        }

        if (!empty($filtros['creado_hasta'])) {
            $query->whereDate('created_at', '<=', $filtros['creado_hasta']);
        }

        $ordenarPor = $filtros['ordenar_por'] ?? 'created_at';
        $orden = $filtros['orden'] ?? 'desc';
        
        // Mapeo simple de ordenamiento
        $columnaOrden = match($ordenarPor) {
            'nombre' => 'nombre',
            'ci' => 'ci',
            'fecha_aceptacion' => 'fecha_aceptacion',
            'codigo_beneficiario' => 'codigo_beneficiario',
            default => 'created_at'
        };

        $query->orderBy($columnaOrden, $orden);

        return $query->paginate($perPage);
    }

    public function obtenerCompleto(int $id, int $actorId, bool $puedeVerDatosSensibles): array
    {
        $beneficiario = Beneficiario::with([
            'proyecto.entidadEstatal', 'tipoVivienda', 'registrador',
            'visitasDomiciliarias' => function($q) {
                $q->orderBy('fecha_visita', 'desc')->orderBy('hora_visita', 'desc');
            },
            'visitasDomiciliarias.visitador'
        ])->findOrFail($id);

        $visitas = $beneficiario->visitasDomiciliarias;
        
        $stats = [
            'total_visitas' => $visitas->count(),
            'visitas_exitosas' => $visitas->where('resultado', 'exitosa')->count(),
            'visitas_no_encontrado' => $visitas->where('resultado', 'no_encontrado')->count(),
            'monto_total_transporte' => $visitas->sum('gasto_transporte'),
        ];

        // Ocultar datos sensibles si no tiene permiso
        if (!$puedeVerDatosSensibles) {
            $beneficiario->ingreso_mensual_familiar = null;
            $beneficiario->ingreso_mensual_familiar_oculto = '***';
        }

        return [
            'beneficiario' => $beneficiario,
            'estadisticas' => $stats,
            'transiciones_permitidas' => $beneficiario->getTransicionesPermitidas(),
        ];
    }

    public function crear(array $datos, int $actorId): Beneficiario
    {
        return DB::transaction(function () use ($datos, $actorId) {
            $proyecto = Proyecto::with('tipoProyecto')->findOrFail($datos['proyecto_id']);

            if (!$proyecto->es_social) {
                throw new ProyectoNoSocialException("Solo los proyectos sociales pueden tener beneficiarios.");
            }

            if (!$proyecto->tipoProyecto->requiere_beneficiarios) {
                throw new ProyectoNoSocialException("Este tipo de proyecto social no requiere beneficiarios según su configuración.");
            }

            if (in_array($proyecto->estado, ['cancelado', 'finalizado'])) {
                throw new ProyectoNoActivoException("El proyecto {$proyecto->codigo} no permite agregar beneficiarios en su estado actual ({$proyecto->estado}).");
            }

            // Validar unicidad del CI en el MISMO proyecto (incluso softdeleted para evitar choques si se restaura, o solo activos)
            $ciExiste = Beneficiario::where('proyecto_id', $proyecto->id)
                ->where('ci', $datos['ci'])
                ->exists();

            if ($ciExiste) {
                throw new BeneficiarioDuplicadoException("El CI {$datos['ci']} ya está registrado en este proyecto.");
            }

            // Generar Código Beneficiario: BNF-{año}-{codigo_proyecto_4digitos}-{secuencia_3digitos}
            $anio = date('Y');
            $codigoProyectoPuro = substr($proyecto->codigo, strrpos($proyecto->codigo, '-') + 1);
            
            // Contar totales en el proyecto
            $cantidadActual = Beneficiario::withTrashed()->where('proyecto_id', $proyecto->id)->count();
            $secuencia = str_pad($cantidadActual + 1, 3, '0', STR_PAD_LEFT);
            $datos['codigo_beneficiario'] = "BNF-{$anio}-{$codigoProyectoPuro}-{$secuencia}";
            
            $datos['usuario_registrador_id'] = $actorId;

            if (!isset($datos['estado_seleccion'])) {
                $datos['estado_seleccion'] = 'aceptado';
            }

            if ($datos['estado_seleccion'] === 'aceptado' && empty($datos['fecha_aceptacion'])) {
                $datos['fecha_aceptacion'] = now()->toDateString();
            }

            $beneficiario = Beneficiario::create($datos);

            // Auditoría
            $datosAuditoria = $datos;
            if (isset($datosAuditoria['ingreso_mensual_familiar'])) {
                $datosAuditoria['ingreso_mensual_familiar'] = '***'; // Ofuscar en log
            }

            $this->auditoria->registrarCreacion(
                'beneficiario.creado',
                'beneficiarios',
                $beneficiario->id,
                $datosAuditoria
            );

            return $beneficiario->load('proyecto', 'tipoVivienda');
        });
    }

    public function actualizar(int $id, array $datos, int $actorId): Beneficiario
    {
        return DB::transaction(function () use ($id, $datos, $actorId) {
            $beneficiario = Beneficiario::findOrFail($id);

            // Evitar modificar campos inmutables desde aquí
            unset($datos['proyecto_id'], $datos['codigo_beneficiario'], $datos['estado_seleccion']);

            if (isset($datos['ci']) && $datos['ci'] !== $beneficiario->ci) {
                $ciExiste = Beneficiario::where('proyecto_id', $beneficiario->proyecto_id)
                    ->where('ci', $datos['ci'])
                    ->where('id', '!=', $beneficiario->id)
                    ->exists();

                if ($ciExiste) {
                    throw new BeneficiarioDuplicadoException("El CI {$datos['ci']} ya está registrado en este proyecto para otro beneficiario.");
                }
            }

            $datosAnteriores = $beneficiario->getOriginal();
            $beneficiario->update($datos);
            $cambios = $beneficiario->getChanges();

            if (!empty($cambios)) {
                $this->auditoria->registrarActualizacion(
                    'beneficiario.actualizado',
                    'beneficiarios',
                    $beneficiario->id,
                    $datosAnteriores,
                    $cambios
                );
            }

            return $beneficiario;
        });
    }

    public function cambiarEstado(int $id, string $nuevoEstado, ?string $razon, int $actorId, bool $esGerente): Beneficiario
    {
        return DB::transaction(function () use ($id, $nuevoEstado, $razon, $actorId, $esGerente) {
            $beneficiario = Beneficiario::findOrFail($id);
            $estadoAnterior = $beneficiario->estado_seleccion;

            if (!$beneficiario->puedeTransicionarA($nuevoEstado)) {
                $permitidos = implode(', ', $beneficiario->getTransicionesPermitidas());
                throw new TransicionEstadoNoPermitidaException("No se puede pasar de '{$estadoAnterior}' a '{$nuevoEstado}'. Estados permitidos: {$permitidos}");
            }

            if (in_array($nuevoEstado, ['retirado', 'rechazado']) && empty(trim($razon))) {
                throw new TransicionEstadoNoPermitidaException("Se requiere una razón obligatoria para el estado '{$nuevoEstado}'.");
            }

            if ($estadoAnterior === 'retirado' && $nuevoEstado === 'aceptado' && !$esGerente) {
                throw new OperacionRequiereGerenteException("Solo un usuario con rol de Gerente puede reactivar a un beneficiario retirado.");
            }

            $beneficiario->estado_seleccion = $nuevoEstado;

            if ($nuevoEstado === 'aceptado' && !$beneficiario->fecha_aceptacion) {
                $beneficiario->fecha_aceptacion = now()->toDateString();
            }

            if ($nuevoEstado === 'vivienda_entregada') {
                if (!$beneficiario->fecha_entrega_vivienda) {
                    $beneficiario->fecha_entrega_vivienda = now()->toDateString();
                }
                // Notificar al gerente
                $this->notificacion->enviarAGerente(
                    "Vivienda Entregada",
                    "Se ha registrado la entrega de vivienda al beneficiario {$beneficiario->codigo_beneficiario}.",
                    'success',
                    "/dashboard/beneficiarios/{$beneficiario->id}"
                );
            }

            if (in_array($nuevoEstado, ['retirado', 'rechazado'])) {
                $observacionesPrevias = $beneficiario->observaciones ? $beneficiario->observaciones . "\n\n" : "";
                $beneficiario->observaciones = $observacionesPrevias . "[Razón {$nuevoEstado} - " . date('Y-m-d') . "]: {$razon}";
            }

            $beneficiario->save();

            $this->auditoria->registrar(
                'beneficiario.estado_cambiado',
                'beneficiarios',
                $beneficiario->id,
                [
                    'datos_anteriores' => ['estado' => $estadoAnterior],
                    'datos_nuevos'     => [
                        'estado'       => $nuevoEstado,
                        'razon'        => $razon,
                        'fecha_efecto' => now()->toDateTimeString(),
                    ],
                ]
            );

            return $beneficiario;
        });
    }

    public function asignarTipoVivienda(int $id, int $tipoViviendaId, int $actorId): Beneficiario
    {
        $beneficiario = Beneficiario::findOrFail($id);

        if ($beneficiario->estado_seleccion === 'vivienda_entregada') {
            throw new TransicionEstadoNoPermitidaException("No se puede cambiar el tipo de vivienda de un beneficiario con vivienda entregada.");
        }

        $anterior = $beneficiario->tipo_vivienda_id;
        $beneficiario->tipo_vivienda_id = $tipoViviendaId;
        $beneficiario->save();

        $this->auditoria->registrarActualizacion(
            'beneficiario.tipo_vivienda_asignado',
            'beneficiarios',
            $beneficiario->id,
            ['tipo_vivienda_id' => $anterior],
            ['tipo_vivienda_id' => $tipoViviendaId]
        );

        return $beneficiario->load('tipoVivienda');
    }

    public function eliminar(int $id, int $actorId, ?string $razon): bool
    {
        return DB::transaction(function () use ($id, $actorId, $razon) {
            $beneficiario = Beneficiario::findOrFail($id);

            if (in_array($beneficiario->estado_seleccion, ['en_construccion', 'vivienda_entregada'])) {
                throw new BeneficiarioConViviendaEnProcesoException("No se puede eliminar un beneficiario con vivienda en proceso o entregada.");
            }

            if (empty(trim($razon))) {
                throw new \Exception("La razón de eliminación es obligatoria.");
            }

            $beneficiario->delete();

            $this->auditoria->registrarEliminacion(
                'beneficiario.eliminado',
                'beneficiarios',
                $beneficiario->id,
                [],
                $razon
            );

            return true;
        });
    }

    public function obtenerEstadisticasProyecto(int $proyectoId, bool $puedeVerDatosSensibles)
    {
        $beneficiarios = Beneficiario::where('proyecto_id', $proyectoId)->get();

        $stats = [
            'total' => $beneficiarios->count(),
            'por_estado' => [
                'candidato' => $beneficiarios->where('estado_seleccion', 'candidato')->count(),
                'aceptado' => $beneficiarios->where('estado_seleccion', 'aceptado')->count(),
                'en_construccion' => $beneficiarios->where('estado_seleccion', 'en_construccion')->count(),
                'vivienda_entregada' => $beneficiarios->where('estado_seleccion', 'vivienda_entregada')->count(),
                'retirado' => $beneficiarios->where('estado_seleccion', 'retirado')->count(),
                'rechazado' => $beneficiarios->where('estado_seleccion', 'rechazado')->count(),
            ],
            'por_genero' => [
                'masculino' => $beneficiarios->where('genero', 'masculino')->count(),
                'femenino' => $beneficiarios->where('genero', 'femenino')->count(),
                'otro' => $beneficiarios->where('genero', 'otro')->count(),
            ],
            'promedio_familiares' => round($beneficiarios->avg('cantidad_familiares') ?? 0, 1),
            'total_dependientes' => $beneficiarios->sum('personas_dependientes'),
            'sin_documento' => $beneficiarios->whereNull('documento_propiedad_terreno_url')->count(),
        ];

        if ($puedeVerDatosSensibles) {
            $stats['ingreso_promedio'] = round($beneficiarios->avg('ingreso_mensual_familiar') ?? 0, 2);
            $stats['ingreso_total'] = $beneficiarios->sum('ingreso_mensual_familiar');
        }

        return $stats;
    }

    public function obtenerMapaProyecto(int $proyectoId)
    {
        return Beneficiario::with('tipoVivienda')
            ->where('proyecto_id', $proyectoId)
            ->whereNotNull('latitud_terreno')
            ->whereNotNull('longitud_terreno')
            ->get(['id', 'codigo_beneficiario', 'nombre', 'apellido_paterno', 'apellido_materno', 'latitud_terreno', 'longitud_terreno', 'estado_seleccion', 'tipo_vivienda_id'])
            ->map(function ($b) {
                return [
                    'id' => $b->id,
                    'codigo' => $b->codigo_beneficiario,
                    'nombre_completo' => $b->nombre_completo,
                    'latitud' => $b->latitud_terreno,
                    'longitud' => $b->longitud_terreno,
                    'estado' => $b->estado_seleccion,
                    'tipo_vivienda' => $b->tipoVivienda ? $b->tipoVivienda->nombre : 'No asignada'
                ];
            });
    }
}
