<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Proyecto;
use App\Models\TipoProyecto;
use App\Models\EntidadEstatal;
use App\Models\Cliente;
use App\Models\ZonaGeografica;
use App\Models\User;

class ProyectoSeeder extends Seeder
{
    public function run(): void
    {
        $gerente = User::whereHas('rol', fn($q) => $q->where('nombre', 'gerente'))->first();
        $adminId = $gerente ? $gerente->id : 1;

        $tipoSocialUrbano = TipoProyecto::where('nombre', 'Vivienda Social Urbana')->first();
        $tipoPrivadoCasa = TipoProyecto::where('nombre', 'Casa Privada Individual')->first();

        $entidadAE = EntidadEstatal::where('sigla', 'AEVivienda')->first() ?? EntidadEstatal::first();
        $entidadFPS = EntidadEstatal::where('sigla', 'FPS')->first() ?? EntidadEstatal::first();
        
        $clientePrivado = Cliente::first();
        $zonaElAlto = ZonaGeografica::where('municipio', 'El Alto')->first() ?? ZonaGeografica::first();
        $zonaSantaCruz = ZonaGeografica::where('municipio', 'Santa Cruz de la Sierra')->first() ?? ZonaGeografica::first();

        $proyectos = [
            [
                'codigo' => 'PRJ-2026-0001',
                'nombre' => 'Construcción Viviendas FASE IV - El Alto Sur',
                'descripcion' => 'Proyecto de construcción de 25 viviendas sociales para familias de escasos recursos en el Distrito 8 de El Alto.',
                'categoria' => 'social',
                'estado' => 'en_ejecucion',
                'tipo_proyecto_id' => $tipoSocialUrbano?->id,
                'entidad_estatal_id' => $entidadAE?->id,
                'zona_id' => $zonaElAlto?->id,
                'administrador_id' => $adminId,
                'usuario_creador_id' => $adminId,
                'presupuesto_total' => 2500000.00,
                'presupuesto_ejecutado' => 1250000.00,
                'cantidad_unidades' => 25,
                'porcentaje_avance' => 45.5,
                'fecha_inicio_planificada' => '2026-01-10',
                'fecha_fin_planificada' => '2026-11-30',
                'fecha_inicio_real' => '2026-01-15',
                'latitud' => -16.540123,
                'longitud' => -68.182456,
                'direccion' => 'Zona Senkata, Distrito 8'
            ],
            [
                'codigo' => 'PRJ-2026-0002',
                'nombre' => 'Programa Solidario Santa Cruz - Plan 3000',
                'descripcion' => '40 viviendas tipo B para el programa solidario del FPS.',
                'categoria' => 'social',
                'estado' => 'planificacion',
                'tipo_proyecto_id' => $tipoSocialUrbano?->id,
                'entidad_estatal_id' => $entidadFPS?->id,
                'zona_id' => $zonaSantaCruz?->id,
                'administrador_id' => $adminId,
                'usuario_creador_id' => $adminId,
                'presupuesto_total' => 3800000.00,
                'cantidad_unidades' => 40,
                'porcentaje_avance' => 0,
                'fecha_inicio_planificada' => '2026-06-01',
                'fecha_fin_planificada' => '2027-04-30',
                'latitud' => -17.821345,
                'longitud' => -63.142567,
                'direccion' => 'Plan 3000, Barrio Nuevo'
            ],
            [
                'codigo' => 'PRJ-2026-0003',
                'nombre' => 'Casa Minimalista Familia Rojas',
                'descripcion' => 'Diseño y construcción de vivienda unifamiliar de 2 pisos con acabados de lujo.',
                'categoria' => 'privado',
                'estado' => 'en_ejecucion',
                'tipo_proyecto_id' => $tipoPrivadoCasa?->id,
                'cliente_id' => $clientePrivado?->id,
                'zona_id' => $zonaElAlto?->id,
                'administrador_id' => $adminId,
                'usuario_creador_id' => $adminId,
                'presupuesto_total' => 450000.00,
                'cantidad_unidades' => 1,
                'porcentaje_avance' => 15.0,
                'fecha_inicio_planificada' => '2026-04-01',
                'fecha_fin_planificada' => '2026-09-30',
                'latitud' => -16.510000,
                'longitud' => -68.120000,
                'direccion' => 'Achumani, Calle 15'
            ]
        ];

        foreach ($proyectos as $p) {
            Proyecto::firstOrCreate(['codigo' => $p['codigo']], $p);
        }
    }
}
