<?php

namespace App\Services\Proyectos;

use App\Models\Almacen;
use App\Models\FaseProyecto;
use App\Models\Hito;
use App\Models\HitoCobro;
use App\Models\ItemChecklist;
use App\Models\PlantillaChecklist;
use App\Models\ProductoContractual;
use App\Models\Proyecto;
use App\Models\Vivienda;
use Carbon\Carbon;

class CascadaProyectoService
{
    public function ejecutar(Proyecto $proyecto, array $opciones): void
    {
        $this->crearAlmacen($proyecto);
        $this->crearHitosCronograma($proyecto);

        if ($proyecto->categoria === 'privado') {
            $this->crearFasesPrivado($proyecto, $opciones);
            $this->crearHitosCobro($proyecto, $opciones['hitos_cobro'] ?? [], 'hito_negociado');
        } else {
            $this->crearViviendasSocial($proyecto, $opciones);
            $hitosData = $opciones['hitos_cobro'] ?? $opciones['productos_contractuales'] ?? [];
            if (empty($hitosData)) {
                // Proyectos sociales sin hitos explícitos: 4 productos SICOOES equitativos por defecto
                $hitosData = [
                    ['nombre' => 'Producto 1', 'porcentaje' => 25],
                    ['nombre' => 'Producto 2', 'porcentaje' => 25],
                    ['nombre' => 'Producto 3', 'porcentaje' => 25],
                    ['nombre' => 'Producto 4', 'porcentaje' => 25],
                ];
            }
            $this->crearHitosCobro($proyecto, $hitosData, 'producto_sicooes');
        }
    }

    private function crearAlmacen(Proyecto $proyecto): void
    {
        $anio = date('Y');
        $contador = Almacen::withTrashed()
            ->where('codigo', 'LIKE', "ALM-{$anio}-%")
            ->count();
        $codigo = 'ALM-' . $anio . '-' . str_pad($contador + 1, 4, '0', STR_PAD_LEFT);

        Almacen::create([
            'codigo'      => $codigo,
            'nombre'      => 'Almacén — ' . $proyecto->nombre,
            'descripcion' => 'Almacén principal del proyecto ' . $proyecto->codigo,
            'proyecto_id' => $proyecto->id,
            'tipo'        => 'obra',
            'estado'      => 'activo',
            'ubicacion'   => $proyecto->direccion_obra,
            'latitud'     => $proyecto->latitud,
            'longitud'    => $proyecto->longitud,
        ]);
    }

    private function crearHitosCronograma(Proyecto $proyecto): void
    {
        // Hito de inicio del proyecto
        Hito::create([
            'proyecto_id'      => $proyecto->id,
            'nombre'           => 'Inicio de Proyecto — ' . $proyecto->nombre,
            'fecha_planificada' => $proyecto->fecha_inicio_planificada,
            'tipo'             => 'otro',
            'es_critico'       => true,
            'estado'           => 'pendiente',
        ]);

        // Hito de fin del proyecto
        Hito::create([
            'proyecto_id'      => $proyecto->id,
            'nombre'           => 'Finalización de Proyecto — ' . $proyecto->nombre,
            'fecha_planificada' => $proyecto->fecha_fin_planificada,
            'tipo'             => 'entrega_final',
            'es_critico'       => true,
            'estado'           => 'pendiente',
        ]);
    }

    private function crearFasesPrivado(Proyecto $proyecto, array $opciones): void
    {
        $cantidadFases = max(1, (int) ($opciones['cantidad_fases'] ?? 1));
        $fasesConfig   = $opciones['fases_config'] ?? [];
        $tipoObra      = $proyecto->tipo_obra ?? 'otro';

        $plantilla = PlantillaChecklist::paraObraTipo($tipoObra);
        $itemsPlantilla = $plantilla ? $plantilla->items()->get() : collect();

        $inicio = Carbon::parse($proyecto->fecha_inicio_planificada);
        $fin    = Carbon::parse($proyecto->fecha_fin_planificada);
        $totalDias = $inicio->diffInDays($fin);
        $diasPorFase = $totalDias > 0 ? floor($totalDias / $cantidadFases) : 0;

        $presupuestoPorFase = $proyecto->presupuesto_referencial
            ? (float) $proyecto->presupuesto_referencial / $cantidadFases
            : 0;

        for ($i = 0; $i < $cantidadFases; $i++) {
            $numFase = $i + 1;
            $configFase = $fasesConfig[$i] ?? [];

            $porcentajeFase = isset($configFase['porcentaje'])
                ? (float) $configFase['porcentaje']
                : round(100 / $cantidadFases, 2);

            $presupuestoFase = isset($configFase['porcentaje'])
                ? (float) $proyecto->presupuesto_referencial * ($configFase['porcentaje'] / 100)
                : $presupuestoPorFase;

            $inicioFase = $inicio->copy()->addDays($i * $diasPorFase);
            $finFase    = $i === $cantidadFases - 1
                ? $fin->copy()
                : $inicio->copy()->addDays(($i + 1) * $diasPorFase - 1);

            $fase = FaseProyecto::create([
                'proyecto_id'             => $proyecto->id,
                'nombre'                  => $configFase['nombre'] ?? "Fase {$numFase}",
                'descripcion'             => null,
                'orden'                   => $numFase,
                'fecha_inicio_planificada' => $inicioFase->toDateString(),
                'fecha_fin_planificada'    => $finFase->toDateString(),
                'avance_porcentaje'       => 0,
                'estado'                  => 'pendiente',
            ]);

            $this->crearItemsChecklistPorFase($fase->id, $itemsPlantilla);
        }
    }

    private function crearViviendasSocial(Proyecto $proyecto, array $opciones): void
    {
        $cantidadViviendas = max(1, (int) ($opciones['cantidad_beneficiarios'] ?? $proyecto->cantidad_beneficiarios ?? 1));
        $plantilla = PlantillaChecklist::paraObraTipo('vivienda_social');
        $itemsPlantilla = $plantilla ? $plantilla->items()->get() : collect();

        for ($i = 0; $i < $cantidadViviendas; $i++) {
            $secuencia = str_pad($i + 1, 3, '0', STR_PAD_LEFT);
            $codigo = "VIV-{$proyecto->codigo}-{$secuencia}";

            $vivienda = Vivienda::create([
                'proyecto_id'       => $proyecto->id,
                'codigo'            => $codigo,
                'estado'            => 'planificada',
                'porcentaje_avance' => 0,
                'tiene_observaciones_activas' => false,
            ]);

            $this->crearItemsChecklistPorVivienda($vivienda->id, $itemsPlantilla);
        }
    }

    private function crearHitosCobro(Proyecto $proyecto, array $hitosData, string $tipo): void
    {
        $contractual = (float) ($proyecto->monto_contractual
            ?? $proyecto->monto_contrato
            ?? $proyecto->presupuesto_referencial
            ?? 0);

        // Fallback date for hitos without an explicit date
        $fechaFin = $proyecto->fecha_fin_planificada instanceof \Carbon\Carbon
            ? $proyecto->fecha_fin_planificada->format('Y-m-d')
            : (string) $proyecto->fecha_fin_planificada;

        foreach ($hitosData as $idx => $hito) {
            $porcentaje = (float) ($hito['porcentaje'] ?? 0);
            $nombre     = $hito['nombre'] ?? ($tipo === 'producto_sicooes' ? "Producto " . ($idx + 1) : "Hito " . ($idx + 1));
            $fecha      = $hito['fecha_planificada'] ?? $hito['fecha_planificada_cobro'] ?? $fechaFin;

            HitoCobro::create([
                'proyecto_id'         => $proyecto->id,
                'orden'               => $idx + 1,
                'nombre'              => $nombre,
                'porcentaje_contrato' => $porcentaje,
                'monto_calculado'     => $contractual * ($porcentaje / 100),
                'fecha_planificada'   => $fecha,
                'tipo'                => $tipo,
                'estado'              => 'planificado',
                'vinculacion_fase_id' => $hito['vinculacion_fase_id'] ?? null,
            ]);

            // Hito de cronograma para visualización
            Hito::create([
                'proyecto_id'       => $proyecto->id,
                'nombre'            => 'Cobro: ' . $nombre,
                'fecha_planificada' => $fecha,
                'tipo'              => 'pago',
                'es_critico'        => true,
                'estado'            => 'pendiente',
            ]);
        }
    }

    /** @deprecated Mantener para compatibilidad con tests legacy */
    private function crearProductosContractuales(Proyecto $proyecto, array $productos): void
    {
        $this->crearHitosCobro($proyecto, $productos, 'producto_sicooes');
    }

    private function crearItemsChecklistPorFase(int $faseId, $itemsPlantilla): void
    {
        foreach ($itemsPlantilla as $item) {
            ItemChecklist::create([
                'fase_id'          => $faseId,
                'item_plantilla_id' => $item->id,
                'nombre'           => $item->nombre,
                'orden'            => $item->orden,
                'ponderacion'      => $item->ponderacion,
                'estado'           => 'pendiente',
            ]);
        }
    }

    private function crearItemsChecklistPorVivienda(int $viviendaId, $itemsPlantilla): void
    {
        foreach ($itemsPlantilla as $item) {
            ItemChecklist::create([
                'vivienda_id'      => $viviendaId,
                'item_plantilla_id' => $item->id,
                'nombre'           => $item->nombre,
                'orden'            => $item->orden,
                'ponderacion'      => $item->ponderacion,
                'estado'           => 'pendiente',
            ]);
        }
    }
}
