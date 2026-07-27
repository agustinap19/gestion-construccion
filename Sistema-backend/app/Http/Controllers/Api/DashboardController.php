<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Proyecto;
use App\Models\Personal;
use App\Models\Almacen;
use App\Models\Activo;
use App\Models\AsignacionActivo;
use App\Models\Vivienda;

class DashboardController extends Controller
{
    public function general()
    {
        // 1. Proyectos
        // Estados reales: formulacion, licitacion, adjudicado, en_ejecucion, pausado, finalizado, cancelado
        $proyectosActivos = Proyecto::whereIn('estado', ['en_ejecucion', 'adjudicado', 'pausado'])->count();
        $proyectosCompletados = Proyecto::where('estado', 'finalizado')->count();
        $totalProyectos = Proyecto::count();
        
        // Sumar montos contractuales (usando el accessor o columna directa si existe)
        // Ya que getMontoContractualEfectivoAttribute es al vuelo, usamos un sum simple de las columnas base para rapidez en DB
        $presupuestoTotal = Proyecto::sum('monto_contractual') + Proyecto::whereNull('monto_contractual')->sum('monto_contrato');
        
        $proyectosRecientes = Proyecto::orderBy('created_at', 'desc')->take(5)->get(['id', 'nombre', 'estado', 'avance_fisico']);

        // Data para Torta de Proyectos
        $distribucionProyectos = [
            ['name' => 'En Ejecución', 'value' => Proyecto::where('estado', 'en_ejecucion')->count()],
            ['name' => 'Adjudicados', 'value' => Proyecto::where('estado', 'adjudicado')->count()],
            ['name' => 'Pausados', 'value' => Proyecto::where('estado', 'pausado')->count()],
            ['name' => 'Formulación', 'value' => Proyecto::whereIn('estado', ['formulacion', 'licitacion'])->count()],
            ['name' => 'Finalizados', 'value' => Proyecto::where('estado', 'finalizado')->count()],
        ];

        // 2. Personal
        $personalActivo = Personal::where('estado_laboral', 'activo')->count();
        $personalVacaciones = Personal::where('estado_laboral', 'vacaciones')->count();
        
        // 3. Almacenes & Materiales
        $totalAlmacenes = Almacen::where('estado', 'activo')->count();
        
        // 4. Activos / Maquinaria
        $activosDisponibles = Activo::where('estado', 'disponible')->count();
        $activosEnUso = Activo::where('estado', 'en_uso')->count();
        $activosMantenimiento = Activo::where('estado', 'mantenimiento')->count();

        // Data para Torta de Activos
        $distribucionActivos = [
            ['name' => 'Disponibles', 'value' => $activosDisponibles],
            ['name' => 'En Uso', 'value' => $activosEnUso],
            ['name' => 'En Mantenimiento', 'value' => $activosMantenimiento],
        ];

        // 5. Viviendas (Avance General)
        $totalViviendas = Vivienda::count();
        $viviendasCompletadas = Vivienda::where('estado', 'entregada')->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'kpis' => [
                    'proyectos' => [
                        'activos' => $proyectosActivos,
                        'completados' => $proyectosCompletados,
                        'total' => $totalProyectos,
                        'presupuesto_total' => $presupuestoTotal
                    ],
                    'personal' => [
                        'activo' => $personalActivo,
                        'vacaciones' => $personalVacaciones
                    ],
                    'almacenes' => [
                        'total' => $totalAlmacenes
                    ],
                    'activos' => [
                        'disponibles' => $activosDisponibles,
                        'en_uso' => $activosEnUso,
                        'mantenimiento' => $activosMantenimiento
                    ],
                    'viviendas' => [
                        'total' => $totalViviendas,
                        'completadas' => $viviendasCompletadas
                    ]
                ],
                'charts' => [
                    'proyectos_pie' => array_values(array_filter($distribucionProyectos, fn($item) => $item['value'] > 0)),
                    'activos_pie' => array_values(array_filter($distribucionActivos, fn($item) => $item['value'] > 0)),
                ],
                'map_markers' => Proyecto::whereNotNull('latitud')
                                    ->whereNotNull('longitud')
                                    ->whereIn('estado', ['en_ejecucion', 'adjudicado', 'pausado'])
                                    ->get(['id', 'nombre', 'estado', 'avance_fisico', 'latitud', 'longitud']),
                'proyectos_recientes' => $proyectosRecientes,
                'tendencia_financiera' => $this->generarTendenciaSimulada()
            ]
        ]);
    }

    private function generarTendenciaSimulada()
    {
        // En una app real, esto vendría de movimientos históricos
        $meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        $datos = [];
        $mesActual = (int) date('n');
        
        for ($i = max(0, $mesActual - 6); $i < $mesActual; $i++) {
            $datos[] = [
                'mes' => $meses[$i],
                'planificado' => rand(100000, 500000),
                'ejecutado' => rand(90000, 520000)
            ];
        }
        
        return $datos;
    }
}
