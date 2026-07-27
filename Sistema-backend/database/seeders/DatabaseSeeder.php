<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            // Base: roles, permisos, usuarios
            RolSeeder::class,
            PermisoSeeder::class,
            PermisosBloque3Seeder::class,
            PermisosBloque4Seeder::class,
            PermisosProyectoSeeder::class,
            PermisoAlmacenesSeeder::class,
            PermisoBibliotecaSeeder::class,
            PermisoActivosSeeder::class,
            PermisoActasSeeder::class,
            RolPermisoSeeder::class,
            UserSeeder::class,

            // Catálogos geográficos y de cliente
            ZonaGeograficaSeeder::class,
            ClienteSeeder::class,
            EntidadEstatalSeeder::class,

            // Personal
            CompetenciaSeeder::class,
            PersonalSeeder::class,
            PersonalCompetenciaSeeder::class,

            // Catálogos de proyectos
            TipoProyectoSeeder::class,
            PlantillaChecklistSeeder::class,

            // Configuración del sistema
            ConfiguracionSistemaSeeder::class,
            ConfiguracionPorcentajesPresupuestoSeeder::class,

            // Almacenes y Materiales
            MaterialSeeder::class,
            AlmacenCentralSeeder::class,

            // Biblioteca Constructiva (Sub-fase B)
            CategoriasConstructivasSeeder::class,
            ItemsConstructivosSeeder::class,
            PlantillasConstructivasSeeder::class,

            // TipoVivienda después de plantillas: requiere plantilla_constructiva_id resuelto
            TipoViviendaSeeder::class,

            // Datos demo — proyectos, beneficiarios, viviendas
            ProyectoSeeder::class,
            BeneficiarioSeeder::class,
            ViviendaSeeder::class,

            // Activos: maquinaria, equipo, herramienta y vehículos
            // (después de ProyectoSeeder: requiere almacenes tipo 'obra' ya creados)
            ActivoSeeder::class,

            // Módulos en pausa — no sembrar datos de:
            // FaseProyectoSeeder, PlanillaPagoSeeder, DetallePlanillaSeeder
        ]);
    }
}
