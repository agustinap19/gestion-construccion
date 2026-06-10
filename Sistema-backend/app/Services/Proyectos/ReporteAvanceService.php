<?php

namespace App\Services\Proyectos;

use App\Models\HistorialCambioItem;
use App\Models\PresupuestoItemProyecto;
use App\Models\ProductoContractual;
use App\Models\Proyecto;
use App\Models\ReporteAvance;
use App\Models\User;
use App\Models\Vivienda;
use App\Services\NotificacionService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ReporteAvanceService
{
    public function __construct(
        private CalculadoraAvanceService $calculadora,
        private NotificacionService $notificacion,
    ) {}

    // ── Listar ────────────────────────────────────────────────────────────────

    public function listarPorVivienda(int $viviendaId, ?int $pipId = null): \Illuminate\Support\Collection
    {
        return ReporteAvance::with([
            'tecnico:id,nombre,apellido_paterno',
            'pip.itemConstructivo:id,codigo,nombre',
        ])
        ->where('vivienda_id', $viviendaId)
        ->when($pipId, fn($q) => $q->where('presupuesto_item_proyecto_id', $pipId))
        ->orderByDesc('fecha_reporte')
        ->get()
        ->map(fn($r) => $this->formatearReporte($r));
    }

    public function contarPorItem(array $pipIds): array
    {
        return ReporteAvance::whereIn('presupuesto_item_proyecto_id', $pipIds)
            ->selectRaw('presupuesto_item_proyecto_id as pip_id, COUNT(*) as total')
            ->groupBy('presupuesto_item_proyecto_id')
            ->pluck('total', 'pip_id')
            ->toArray();
    }

    // ── Crear ─────────────────────────────────────────────────────────────────

    /**
     * Registra un reporte de avance y dispara la cascada completa:
     * item → vivienda → proyecto → producto contractual
     */
    public function registrar(int $viviendaId, array $datos, UploadedFile $foto, User $tecnico): array
    {
        $pip = PresupuestoItemProyecto::where('vivienda_id', $viviendaId)
            ->findOrFail($datos['presupuesto_item_proyecto_id']);

        $pctAnterior = (float) $pip->porcentaje_avance;
        $pctNuevo    = (float) $datos['porcentaje_avance'];

        // Validación: retrogradar requiere observación
        if ($pctNuevo < $pctAnterior && empty($datos['observacion'])) {
            throw new \InvalidArgumentException(
                'Para reducir el avance es obligatorio incluir una observación.'
            );
        }

        // Validación 100m
        $beneficiario = $pip->vivienda?->beneficiario;
        if ($beneficiario && $beneficiario->latitud_terreno && $beneficiario->longitud_terreno && !empty($datos['coordenadas_gps'])) {
            $coords = explode(',', $datos['coordenadas_gps']);
            if (count($coords) === 2) {
                $lat = (float) trim($coords[0]);
                $lng = (float) trim($coords[1]);
                $distancia = $this->distanciaKm($lat, $lng, (float)$beneficiario->latitud_terreno, (float)$beneficiario->longitud_terreno);
                if ($distancia > 0.100) {
                    throw new \InvalidArgumentException('Las coordenadas de la foto están a más de 100 metros del terreno del beneficiario (' . round($distancia * 1000) . 'm).');
                }
            }
        }

        // Subir foto
        [$fotoPath, $thumbPath] = $this->subirFoto($foto, $pip->proyecto_id, $viviendaId);

        $productoListoParaCobro = false;
        $reporte = null;

        DB::transaction(function () use (
            $pip, $pctAnterior, $pctNuevo, $datos, $tecnico,
            $fotoPath, $thumbPath, $viviendaId, &$reporte, &$productoListoParaCobro
        ) {
            $estadoNuevo = match(true) {
                $pctNuevo >= 100 => 'terminado',
                $pctNuevo > 0    => 'en_proceso',
                default          => 'pendiente',
            };

            // 1. Crear reporte
            $reporte = ReporteAvance::create([
                'proyecto_id'                  => $pip->proyecto_id,
                'vivienda_id'                  => $viviendaId,
                'presupuesto_item_proyecto_id' => $pip->id,
                'tecnico_id'                   => $tecnico->id,
                'porcentaje_avance'            => $pctNuevo,
                'porcentaje_anterior'          => $pctAnterior,
                'observacion'                  => $datos['observacion'] ?? null,
                'foto_path'                    => $fotoPath,
                'foto_thumbnail_path'          => $thumbPath,
                'coordenadas_gps'              => $datos['coordenadas_gps'] ?? null,
                'fecha_reporte'                => now(),
                'estado'                       => 'aprobado',
            ]);

            // 2. Actualizar PIP
            $pip->porcentaje_avance = $pctNuevo;
            $pip->estado_ejecucion  = $estadoNuevo;
            $pip->save();

            // 3. Auditoría
            HistorialCambioItem::create([
                'proyecto_id'     => $pip->proyecto_id,
                'usuario_id'      => $tecnico->id,
                'tipo_cambio'     => 'avance_reporte',
                'pip_id'          => $pip->id,
                'vivienda_id'     => $viviendaId,
                'valores_antes'   => ['porcentaje_avance' => $pctAnterior],
                'valores_despues' => ['porcentaje_avance' => $pctNuevo, 'reporte_id' => $reporte->id],
                'descripcion'     => $datos['observacion'] ?? null,
            ]);

            // 4. Recalcular avance vivienda
            $avanceVivienda = $this->recalcularVivienda($viviendaId);

            // 5. Recalcular avance proyecto
            $this->calculadora->recalcularAvanceProyecto($pip->proyecto_id);

            // 6. Verificar si el producto contractual está listo
            if ($pip->producto_contractual_id && $pctNuevo >= 100) {
                $productoListoParaCobro = $this->verificarProductoListo(
                    $pip->producto_contractual_id,
                    $pip->proyecto_id
                );
            }

            // 7. Notificaciones
            $this->enviarNotificaciones($pip, $tecnico, $productoListoParaCobro);
        });

        $reporte->load(['tecnico:id,nombre,apellido_paterno', 'pip.itemConstructivo:id,codigo,nombre']);
        $viviendaFresh  = Vivienda::find($viviendaId);
        $proyectoFresh  = Proyecto::find($pip->proyecto_id);

        return [
            'reporte'           => $this->formatearReporte($reporte),
            'item_actualizado'  => [
                'id'                => $pip->id,
                'porcentaje_avance' => (float) $pip->porcentaje_avance,
                'estado_ejecucion'  => $pip->estado_ejecucion,
            ],
            'avance_vivienda'             => (float) $viviendaFresh->porcentaje_avance,
            'avance_proyecto'             => (float) $proyectoFresh->avance_fisico,
            'producto_listo_para_cobro'   => $productoListoParaCobro,
        ];
    }

    /**
     * Registra múltiples reportes de avance simultáneamente compartiendo la misma evidencia.
     */
    public function registrarMulti(int $viviendaId, array $itemsData, array $metaDatos, UploadedFile $foto, User $tecnico): array
    {
        if (empty($itemsData)) throw new \InvalidArgumentException("No hay items para registrar.");

        $primerPipId = $itemsData[0]['presupuesto_item_proyecto_id'];
        $primerPip = PresupuestoItemProyecto::where('vivienda_id', $viviendaId)
            ->with('vivienda.beneficiario')
            ->findOrFail($primerPipId);
        $proyectoId = $primerPip->proyecto_id;

        // Validar GPS y retrogradar antes de subir la foto para evitar archivos huérfanos
        $beneficiario = $primerPip->vivienda?->beneficiario;
        if ($beneficiario && $beneficiario->latitud_terreno && $beneficiario->longitud_terreno && !empty($metaDatos['coordenadas_gps'])) {
            $coords = explode(',', $metaDatos['coordenadas_gps']);
            if (count($coords) === 2) {
                $lat = (float) trim($coords[0]);
                $lng = (float) trim($coords[1]);
                $distancia = $this->distanciaKm($lat, $lng, (float)$beneficiario->latitud_terreno, (float)$beneficiario->longitud_terreno);
                if ($distancia > 0.100) {
                    throw new \InvalidArgumentException('Las coordenadas de la foto están a más de 100 metros del terreno del beneficiario (' . round($distancia * 1000) . 'm).');
                }
            }
        }

        foreach ($itemsData as $datos) {
            $pctAnterior = (float) PresupuestoItemProyecto::where('vivienda_id', $viviendaId)
                ->where('id', $datos['presupuesto_item_proyecto_id'])
                ->value('porcentaje_avance');
            if ((float) $datos['porcentaje_avance'] < $pctAnterior && empty($metaDatos['observacion'])) {
                throw new \InvalidArgumentException('Para reducir el avance es obligatorio incluir una observación.');
            }
        }

        // Subir foto solo después de que todas las validaciones pasaron
        [$fotoPath, $thumbPath] = $this->subirFoto($foto, $proyectoId, $viviendaId);

        $reportesGenerados = [];
        $itemsActualizados = [];
        $productosListos = [];

        DB::transaction(function () use (
            $viviendaId, $itemsData, $metaDatos, $tecnico, $proyectoId,
            $fotoPath, $thumbPath, &$reportesGenerados, &$itemsActualizados, &$productosListos
        ) {
            foreach ($itemsData as $datos) {
                $pip = PresupuestoItemProyecto::where('vivienda_id', $viviendaId)
                    ->findOrFail($datos['presupuesto_item_proyecto_id']);

                $pctAnterior = (float) $pip->porcentaje_avance;
                $pctNuevo    = (float) $datos['porcentaje_avance'];

                $estadoNuevo = match(true) {
                    $pctNuevo >= 100 => 'terminado',
                    $pctNuevo > 0    => 'en_proceso',
                    default          => 'pendiente',
                };

                // 1. Crear reporte
                $reporte = ReporteAvance::create([
                    'proyecto_id'                  => $proyectoId,
                    'vivienda_id'                  => $viviendaId,
                    'presupuesto_item_proyecto_id' => $pip->id,
                    'tecnico_id'                   => $tecnico->id,
                    'porcentaje_avance'            => $pctNuevo,
                    'porcentaje_anterior'          => $pctAnterior,
                    'observacion'                  => $metaDatos['observacion'] ?? null,
                    'foto_path'                    => $fotoPath,
                    'foto_thumbnail_path'          => $thumbPath,
                    'coordenadas_gps'              => $metaDatos['coordenadas_gps'] ?? null,
                    'fecha_reporte'                => now(),
                    'estado'                       => 'aprobado',
                ]);

                // 2. Actualizar PIP
                $pip->porcentaje_avance = $pctNuevo;
                $pip->estado_ejecucion  = $estadoNuevo;
                $pip->save();

                // 3. Auditoría
                HistorialCambioItem::create([
                    'proyecto_id'     => $proyectoId,
                    'usuario_id'      => $tecnico->id,
                    'tipo_cambio'     => 'avance_reporte',
                    'pip_id'          => $pip->id,
                    'vivienda_id'     => $viviendaId,
                    'valores_antes'   => ['porcentaje_avance' => $pctAnterior],
                    'valores_despues' => ['porcentaje_avance' => $pctNuevo, 'reporte_id' => $reporte->id],
                    'descripcion'     => $metaDatos['observacion'] ?? null,
                ]);

                // 4. Verificar si el producto contractual está listo
                $productoListoParaCobro = false;
                if ($pip->producto_contractual_id && $pctNuevo >= 100) {
                    $productoListoParaCobro = $this->verificarProductoListo(
                        $pip->producto_contractual_id,
                        $proyectoId
                    );
                    if ($productoListoParaCobro) {
                        $productosListos[] = true;
                    }
                }

                // 5. Notificaciones (individual por item)
                $this->enviarNotificaciones($pip, $tecnico, $productoListoParaCobro);

                $reporte->load(['tecnico:id,nombre,apellido_paterno', 'pip.itemConstructivo:id,codigo,nombre']);
                $reportesGenerados[] = $this->formatearReporte($reporte);
                $itemsActualizados[] = [
                    'id'                => $pip->id,
                    'porcentaje_avance' => (float) $pip->porcentaje_avance,
                    'estado_ejecucion'  => $pip->estado_ejecucion,
                ];
            }

            // 6. Recalcular avance vivienda y proyecto solo UNA VEZ al final
            $this->recalcularVivienda($viviendaId);
            $this->calculadora->recalcularAvanceProyecto($proyectoId);
        });

        $viviendaFresh  = Vivienda::find($viviendaId);
        $proyectoFresh  = Proyecto::find($proyectoId);

        return [
            'reportes'                    => $reportesGenerados,
            'items_actualizados'          => $itemsActualizados,
            'avance_vivienda'             => (float) $viviendaFresh->porcentaje_avance,
            'avance_proyecto'             => (float) $proyectoFresh->avance_fisico,
            'producto_listo_para_cobro'   => count($productosListos) > 0,
        ];
    }

    // ── Privados ──────────────────────────────────────────────────────────────
    
    private function distanciaKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371; // km
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earthRadius * $c;
    }

    private function subirFoto(UploadedFile $foto, int $proyectoId, int $viviendaId): array
    {
        $ext  = strtolower($foto->getClientOriginalExtension());
        $uuid = Str::uuid();
        $ym   = now()->format('Y-m');
        $dir  = "reportes/{$proyectoId}/{$viviendaId}/{$ym}";

        $pathOrig = $foto->storeAs($dir, "{$uuid}.{$ext}", 'public');

        $pathThumb = null;
        if (extension_loaded('gd')) {
            $pathThumb = $dir . "/{$uuid}_thumb.jpg";
            $absOrig   = Storage::disk('public')->path($pathOrig);
            $absThumb  = Storage::disk('public')->path($pathThumb);

            $src = match ($ext) {
                'png'  => @imagecreatefrompng($absOrig),
                'webp' => @imagecreatefromwebp($absOrig),
                default => @imagecreatefromjpeg($absOrig),
            };

            if ($src) {
                $srcW  = imagesx($src);
                $srcH  = imagesy($src);
                $side  = min($srcW, $srcH);
                $thumb = imagecreatetruecolor(300, 300);
                imagecopyresampled($thumb, $src, 0, 0, (int)(($srcW-$side)/2), (int)(($srcH-$side)/2), 300, 300, $side, $side);
                imagejpeg($thumb, $absThumb, 85);
                imagedestroy($src);
                imagedestroy($thumb);
            }
        }

        return [Storage::url($pathOrig), $pathThumb ? Storage::url($pathThumb) : null];
    }

    private function recalcularVivienda(int $viviendaId): float
    {
        $pips  = PresupuestoItemProyecto::where('vivienda_id', $viviendaId)->get();
        if ($pips->isEmpty()) return 0.0;

        $totalPond = (float) $pips->sum('ponderacion_avance');
        $avance = $totalPond > 0
            ? $pips->sum(fn($p) => (float)$p->porcentaje_avance * (float)$p->ponderacion_avance) / $totalPond
            : (float)($pips->avg('porcentaje_avance') ?? 0.0);

        $avance = round($avance, 2);
        $vivienda = Vivienda::findOrFail($viviendaId);
        $vivienda->porcentaje_avance = $avance;

        if ($vivienda->estado !== 'con_observaciones') {
            $vivienda->estado = match(true) {
                $avance >= 100 => 'entregada',
                $avance >= 90  => 'acabados',
                $avance >= 75  => 'obra_fina',
                $avance >= 50  => 'obra_gruesa',
                $avance >= 25  => 'cimentacion',
                $avance > 0    => 'terreno_preparado',
                default        => 'planificada',
            };
        }
        $vivienda->save();

        return $avance;
    }

    private function verificarProductoListo(int $productoId, int $proyectoId): bool
    {
        // Todos los PIPs del producto deben estar al 100%
        $total = PresupuestoItemProyecto::where('producto_contractual_id', $productoId)
            ->where('proyecto_id', $proyectoId)
            ->count();

        if ($total === 0) return false;

        $terminados = PresupuestoItemProyecto::where('producto_contractual_id', $productoId)
            ->where('proyecto_id', $proyectoId)
            ->where('porcentaje_avance', '>=', 100)
            ->count();

        if ($terminados < $total) return false;

        ProductoContractual::where('id', $productoId)
            ->where('estado', '!=', 'listo_para_cobro')
            ->update(['estado' => 'listo_para_cobro']);

        return true;
    }

    private function enviarNotificaciones(PresupuestoItemProyecto $pip, User $tecnico, bool $productoListo): void
    {
        $proyecto = Proyecto::find($pip->proyecto_id);
        if (!$proyecto?->responsable_id) return;

        $nombreItem = $pip->itemConstructivo?->nombre ?? "Item #{$pip->id}";

        $this->notificacion->enviarA($proyecto->responsable_id, [
            'tipo'       => 'info',
            'titulo'     => 'Reporte de avance registrado',
            'mensaje'    => "Se registró avance de \"{$nombreItem}\" en {$proyecto->codigo}.",
            'url_accion' => "/dashboard/proyectos/{$proyecto->id}",
        ]);

        if ($productoListo) {
            $this->notificacion->enviarA($proyecto->responsable_id, [
                'tipo'       => 'exito',
                'titulo'     => 'Producto listo para cobro',
                'mensaje'    => "Todos los items del producto contractual están terminados en {$proyecto->codigo}.",
                'url_accion' => "/dashboard/proyectos/{$proyecto->id}",
            ]);
        }
    }

    private function formatearReporte(ReporteAvance $r): array
    {
        return [
            'id'                            => $r->id,
            'fecha_reporte'                 => $r->fecha_reporte?->toIso8601String(),
            'porcentaje_avance'             => (float) $r->porcentaje_avance,
            'porcentaje_anterior'           => (float) $r->porcentaje_anterior,
            'observacion'                   => $r->observacion,
            'foto_url'                      => $r->foto_path,
            'foto_thumbnail_url'            => $r->foto_thumbnail_path,
            'coordenadas_gps'               => $r->coordenadas_gps,
            'estado'                        => $r->estado,
            'presupuesto_item_proyecto_id'  => $r->presupuesto_item_proyecto_id,
            'item_codigo'                   => $r->pip?->itemConstructivo?->codigo,
            'item_nombre'                   => $r->pip?->itemConstructivo?->nombre,
            'tecnico'                       => $r->tecnico
                ? trim($r->tecnico->nombre . ' ' . $r->tecnico->apellido_paterno)
                : null,
        ];
    }
}
