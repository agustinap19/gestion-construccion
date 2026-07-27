<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AsignacionPersonal;
use App\Models\DispositivoMovil;
use App\Models\HistorialCambioItem;
use App\Models\PresupuestoItemProyecto;
use App\Models\Proyecto;
use App\Models\ReporteAvance;
use App\Models\Vivienda;
use App\Services\Proyectos\AvanceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MobileSyncController extends Controller
{
    public function __construct(private AvanceService $avance) {}

    // ── Ping ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/movil/v1/ping
     * Sin auth. La app la usa para detectar si hay internet/servidor.
     */
    public function ping(): JsonResponse
    {
        return response()->json([
            'ok'        => true,
            'timestamp' => now()->toIso8601String(),
            'version'   => '1.0',
        ]);
    }

    // ── Pull ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/movil/v1/sync/pull
     * Devuelve todos los datos del servidor para la app.
     * Con ?ultimo_sync=ISO8601 solo devuelve registros modificados desde ese timestamp.
     */
    public function pull(Request $request): JsonResponse
    {
        $user       = $request->user();
        $ultimoSync = $request->query('ultimo_sync');
        $desde      = $ultimoSync ? Carbon::parse($ultimoSync) : null;

        // Proyectos asignados al usuario
        $proyectoIds = $this->obtenerProyectosDelUsuario($user);

        if (empty($proyectoIds)) {
            return response()->json([
                'timestamp_servidor' => now()->toIso8601String(),
                'proyectos'          => [],
                'viviendas'          => [],
                'items'              => [],
                'reportes'           => [],
            ]);
        }

        // Proyectos
        $proyectosQuery = Proyecto::whereIn('id', $proyectoIds);
        if ($desde) {
            $proyectosQuery->where('updated_at', '>', $desde);
        }
        $proyectos = $proyectosQuery->get()->map(fn ($p) => [
            'id'          => $p->id,
            'codigo'      => $p->codigo,
            'nombre'      => $p->nombre,
            'avance_real' => (float) $p->avance_fisico,
            'estado'      => $p->estado,
            'fecha_inicio' => $p->fecha_inicio_planificada?->toDateString(),
            'fecha_fin'    => $p->fecha_fin_planificada?->toDateString(),
        ]);

        // Viviendas con beneficiario embebido
        $viviendasQuery = Vivienda::with('beneficiario:id,nombre,apellido_paterno,ci,latitud_terreno,longitud_terreno')
            ->whereIn('proyecto_id', $proyectoIds);
        if ($desde) {
            $viviendasQuery->where('updated_at', '>', $desde);
        }
        $viviendas = $viviendasQuery->get();

        // Items count por vivienda (para el campo items_count)
        $viviendasIds = $viviendas->pluck('id')->toArray();
        $itemsCounts  = PresupuestoItemProyecto::whereIn('vivienda_id', $viviendasIds)
            ->groupBy('vivienda_id')
            ->selectRaw('vivienda_id, COUNT(*) as total')
            ->pluck('total', 'vivienda_id');

        $viviendasMapeadas = $viviendas->map(fn ($v) => [
            'id'                => $v->id,
            'proyecto_id'       => $v->proyecto_id,
            'codigo'            => $v->codigo,
            'beneficiario_nombre' => $v->beneficiario
                ? trim($v->beneficiario->nombre . ' ' . $v->beneficiario->apellido_paterno)
                : null,
            'beneficiario_ci'   => $v->beneficiario?->ci,
            'latitud'           => $v->beneficiario?->latitud_terreno ? (float) $v->beneficiario->latitud_terreno : null,
            'longitud'          => $v->beneficiario?->longitud_terreno ? (float) $v->beneficiario->longitud_terreno : null,
            'avance_fisico'     => (float) $v->porcentaje_avance,
            'estado'            => $v->estado,
            'items_count'       => (int) ($itemsCounts[$v->id] ?? 0),
        ]);

        // Items (presupuesto_items_proyecto join items_constructivos)
        $itemsQuery = PresupuestoItemProyecto::with('itemConstructivo:id,codigo,nombre,descripcion,unidad_base')
            ->whereIn('proyecto_id', $proyectoIds)
            ->whereNotNull('vivienda_id');
        if ($desde) {
            $itemsQuery->where('presupuesto_items_proyecto.updated_at', '>', $desde);
        }
        $items = $itemsQuery->get()->map(fn ($pip) => [
            'id'           => $pip->id,
            'vivienda_id'  => $pip->vivienda_id,
            'codigo'       => $pip->itemConstructivo?->codigo,
            'nombre'       => $pip->itemConstructivo?->nombre,
            'descripcion'  => $pip->itemConstructivo?->descripcion,
            'unidad'       => $pip->itemConstructivo?->unidad_base,
            'cantidad'     => (float) $pip->cantidad_planificada,
            'ponderacion'  => (float) $pip->ponderacion_avance,
            'avance_actual' => (float) $pip->porcentaje_avance,
            'estado'       => $pip->estado_ejecucion,
        ]);

        // Reportes
        $allViviendasIds = Vivienda::whereIn('proyecto_id', $proyectoIds)->pluck('id');
        $reportesQuery   = ReporteAvance::with('tecnico:id,nombre,apellido_paterno')
            ->whereIn('vivienda_id', $allViviendasIds);
        if ($desde) {
            $reportesQuery->where('created_at', '>', $desde);
        }
        $reportes = $reportesQuery->get()->map(fn ($r) => [
            'id'               => $r->id,
            'item_id'          => $r->presupuesto_item_proyecto_id,
            'vivienda_id'      => $r->vivienda_id,
            'avance_registrado' => (float) $r->porcentaje_avance,
            'observacion'      => $r->observacion,
            'foto_url'         => $r->foto_path,
            'latitud'          => $r->latitud ? (float) $r->latitud : null,
            'longitud'         => $r->longitud ? (float) $r->longitud : null,
            'registrado_por'   => $r->tecnico
                ? trim($r->tecnico->nombre . ' ' . $r->tecnico->apellido_paterno)
                : null,
            'created_at'       => $r->created_at?->toIso8601String(),
        ]);

        return response()->json([
            'timestamp_servidor' => now()->toIso8601String(),
            'proyectos'          => $proyectos->values(),
            'viviendas'          => $viviendasMapeadas->values(),
            'items'              => $items->values(),
            'reportes'           => $reportes->values(),
        ]);
    }

    // ── Push ─────────────────────────────────────────────────────────────────

    /**
     * POST /api/movil/v1/sync/push
     * Recibe un array de reportes desde la app y los procesa.
     * Valida foto, GPS, deduplicación, retroceso y geo-distancia.
     */
    public function push(Request $request): JsonResponse
    {
        $request->validate([
            'reportes'   => 'required|array|min:1',
            'reportes.*' => 'array',
        ]);

        $user      = $request->user();
        $reportes  = $request->input('reportes');
        $procesados = 0;
        $errores    = 0;
        $detalle    = [];

        foreach ($reportes as $index => $datos) {
            $resultado = $this->procesarReporte($datos, $user, $index);
            if (in_array($resultado['estado'], ['ok', 'duplicado'], true)) {
                $procesados++;
            } else {
                $errores++;
            }
            $detalle[] = $resultado;
        }

        // Actualizar ultimo_sync del dispositivo si viene device_id en headers
        $deviceId = $request->header('X-Device-Id');
        if ($deviceId) {
            DispositivoMovil::where('usuario_id', $user->id)
                ->where('device_id', $deviceId)
                ->update(['ultimo_sync' => now()]);
        }

        return response()->json([
            'procesados' => $procesados,
            'errores'    => $errores,
            'detalle'    => $detalle,
        ], $errores > 0 && $procesados === 0 ? 422 : 200);
    }

    // ── Privados ─────────────────────────────────────────────────────────────

    private function procesarReporte(array $datos, $user, int $index): array
    {
        $uuidLocal = $datos['uuid_local'] ?? null;

        try {
            // Validación de campos requeridos
            $faltantes = $this->validarCamposRequeridos($datos);
            if (! empty($faltantes)) {
                return [
                    'uuid_local'  => $uuidLocal,
                    'id_servidor' => null,
                    'estado'      => 'error',
                    'mensaje'     => 'Campos requeridos faltantes: ' . implode(', ', $faltantes),
                ];
            }

            // Validar foto
            $foto       = $datos['foto_base64'] ?? null;
            $tieneArchivo = isset($datos['foto_base64']) && ! empty($datos['foto_base64']);
            if (! $tieneArchivo) {
                return [
                    'uuid_local'  => $uuidLocal,
                    'id_servidor' => null,
                    'estado'      => 'error',
                    'mensaje'     => 'La foto es obligatoria.',
                ];
            }

            // Deduplicación por uuid_local
            if ($uuidLocal) {
                $existente = ReporteAvance::where('uuid_local', $uuidLocal)->first();
                if ($existente) {
                    return [
                        'uuid_local'  => $uuidLocal,
                        'id_servidor' => $existente->id,
                        'estado'      => 'duplicado',
                        'mensaje'     => 'Reporte ya procesado anteriormente.',
                    ];
                }
            }

            $pipId            = (int) ($datos['item_id'] ?? 0);
            $viviendaId       = (int) ($datos['vivienda_id'] ?? 0);
            $avanceRegistrado = (float) ($datos['avance_registrado'] ?? 0);
            $latitud          = (float) $datos['latitud'];
            $longitud         = (float) $datos['longitud'];
            $observacion      = $datos['observacion'] ?? null;
            $timestampLocal   = $datos['timestamp_local'] ?? now()->toIso8601String();

            $pip = PresupuestoItemProyecto::where('id', $pipId)
                ->where('vivienda_id', $viviendaId)
                ->first();

            if (! $pip) {
                return [
                    'uuid_local'  => $uuidLocal,
                    'id_servidor' => null,
                    'estado'      => 'error',
                    'mensaje'     => "Ítem #{$pipId} no encontrado para vivienda #{$viviendaId}.",
                ];
            }

            // Validación de retroceso de avance
            $avanceActual = (float) $pip->porcentaje_avance;
            if ($avanceRegistrado < $avanceActual && empty($observacion)) {
                return [
                    'uuid_local'  => $uuidLocal,
                    'id_servidor' => null,
                    'estado'      => 'error',
                    'mensaje'     => 'El avance retrocede. La observación es obligatoria cuando se reduce el avance.',
                ];
            }

            // Geo-validación: distancia al terreno del beneficiario (máx 100 metros = 0.1 km)
            $fueraDeRango = false;
            $beneficiario = $pip->vivienda?->beneficiario;
            
            if ($beneficiario && $beneficiario->latitud_terreno && $beneficiario->longitud_terreno) {
                $distancia = $this->avance->distanciaKm(
                    $latitud, $longitud,
                    (float) $beneficiario->latitud_terreno, (float) $beneficiario->longitud_terreno
                );
                
                if ($distancia > 0.100) {
                    return [
                        'uuid_local'  => $uuidLocal,
                        'id_servidor' => null,
                        'estado'      => 'error',
                        'mensaje'     => 'Las coordenadas de la foto están a más de 100 metros del terreno del beneficiario (' . round($distancia * 1000) . 'm).',
                    ];
                }
            } else {
                // Si no tiene coordenadas registradas, se le permite pero se puede flaggear
                $fueraDeRango = false;
            }

            // Guardar foto
            $fotoPath = $this->guardarFotoBase64(
                $datos['foto_base64'],
                $pip->proyecto_id,
                $viviendaId,
                $uuidLocal ?? Str::uuid()->toString()
            );

            // Detectar conflicto: otro técnico registró avance en este ítem en los últimos 10 min
            $hayConflicto = ReporteAvance::where('presupuesto_item_proyecto_id', $pip->id)
                ->where('tecnico_id', '!=', $user->id)
                ->where('created_at', '>=', now()->subMinutes(10))
                ->exists();

            // Si hay conflicto → el reporte se crea pero queda pendiente de revisión por admin
            $estadoReporte = $hayConflicto ? 'pendiente_revision' : 'aprobado';

            // Crear reporte + cascada en transacción
            $reporte = null;
            DB::transaction(function () use (
                $pip, $user, $uuidLocal, $avanceRegistrado, $avanceActual,
                $observacion, $fotoPath, $latitud, $longitud, $fueraDeRango,
                $timestampLocal, $estadoReporte, &$reporte
            ) {
                $reporte = ReporteAvance::create([
                    'uuid_local'                   => $uuidLocal,
                    'proyecto_id'                  => $pip->proyecto_id,
                    'vivienda_id'                  => $pip->vivienda_id,
                    'presupuesto_item_proyecto_id' => $pip->id,
                    'tecnico_id'                   => $user->id,
                    'porcentaje_avance'            => $avanceRegistrado,
                    'porcentaje_anterior'          => $avanceActual,
                    'observacion'                  => $observacion,
                    'foto_path'                    => $fotoPath,
                    'coordenadas_gps'              => "{$latitud},{$longitud}",
                    'latitud'                      => $latitud,
                    'longitud'                     => $longitud,
                    'fuera_de_rango'               => $fueraDeRango,
                    'fecha_reporte'                => Carbon::parse($timestampLocal),
                    'estado'                       => $estadoReporte,
                ]);

                // Auditoría
                HistorialCambioItem::create([
                    'proyecto_id'     => $pip->proyecto_id,
                    'usuario_id'      => $user->id,
                    'tipo_cambio'     => 'avance_reporte',
                    'pip_id'          => $pip->id,
                    'vivienda_id'     => $pip->vivienda_id,
                    'valores_antes'   => ['porcentaje_avance' => $avanceActual],
                    'valores_despues' => ['porcentaje_avance' => $avanceRegistrado, 'reporte_id' => $reporte->id],
                    'descripcion'     => $observacion,
                ]);

                // Cascada: ítem → vivienda → proyecto (solo si el reporte fue aprobado)
                if ($estadoReporte === 'aprobado') {
                    $this->avance->recalcularCascada($reporte);
                }
            });

            return [
                'uuid_local'     => $uuidLocal,
                'id_servidor'    => $reporte->id,
                'estado'         => 'ok',
                'fuera_de_rango' => $fueraDeRango,
                'conflicto'      => $hayConflicto,  // La app puede informar al técnico
            ];
        } catch (\Throwable $e) {
            Log::error("SyncMovilController::procesarReporte error [{$uuidLocal}]: " . $e->getMessage());

            return [
                'uuid_local'  => $uuidLocal,
                'id_servidor' => null,
                'estado'      => 'error',
                'mensaje'     => 'Error interno al procesar el reporte.',
            ];
        }
    }

    private function validarCamposRequeridos(array $datos): array
    {
        $faltantes = [];
        $requeridos = ['uuid_local', 'item_id', 'vivienda_id', 'avance_registrado', 'latitud', 'longitud', 'timestamp_local'];
        foreach ($requeridos as $campo) {
            if (! isset($datos[$campo]) || $datos[$campo] === '' || $datos[$campo] === null) {
                $faltantes[] = $campo;
            }
        }
        return $faltantes;
    }

    /**
     * Decodifica y guarda una foto en base64.
     * Comprime con GD si supera 2MB.
     */
    private function guardarFotoBase64(string $base64, int $proyectoId, int $viviendaId, string $nombre): string
    {
        $data    = preg_replace('/^data:image\/\w+;base64,/', '', $base64);
        $decoded = base64_decode($data, true);

        if ($decoded === false) {
            throw new \InvalidArgumentException('Foto base64 inválida.');
        }

        $ym  = now()->format('Y-m');
        $dir = "reportes/{$proyectoId}/{$viviendaId}/{$ym}";
        $filename = "{$nombre}.jpg";

        // Comprimir si supera 2 MB y GD está disponible
        if (strlen($decoded) > 2 * 1024 * 1024 && extension_loaded('gd')) {
            $src = @imagecreatefromstring($decoded);
            if ($src) {
                ob_start();
                imagejpeg($src, null, 75);
                $decoded = ob_get_clean();
                imagedestroy($src);
            }
        }

        $path = "{$dir}/{$filename}";
        Storage::disk('public')->put($path, $decoded);

        return Storage::url($path);
    }

    private function obtenerProyectosDelUsuario($user): array
    {
        $ids = [];

        // Técnico: proyectos donde está asignado como personal (estado correcto: 'activa')
        if ($user->personal) {
            $ids = array_merge($ids,
                AsignacionPersonal::where('personal_id', $user->personal->id)
                    ->where('estado', 'activa')   // Fix: era 'activo', debe ser 'activa'
                    ->pluck('proyecto_id')
                    ->toArray()
            );
        }

        // Admin/Responsable: proyectos donde es responsable_id directo
        $ids = array_merge($ids,
            Proyecto::where('responsable_id', $user->id)->pluck('id')->toArray()
        );

        return array_unique(array_filter($ids));
    }
}
