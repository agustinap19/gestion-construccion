<?php

namespace Database\Seeders;

// use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolSeeder::class,
            PermisoSeeder::class,
            RolPermisoSeeder::class,
            UsuarioSeeder::class,
            PermisosBloque3Seeder::class,
            ZonaGeograficaSeeder::class,
            ClienteSeeder::class,
            EntidadEstatalSeeder::class,
            CompetenciaSeeder::class,
            PersonalSeeder::class,
            PersonalCompetenciaSeeder::class,
            PlanillaPagoSeeder::class,
            DetallePlanillaSeeder::class,
            PermisosBloque4Seeder::class,
            TipoProyectoSeeder::class,
            TipoViviendaSeeder::class,
            ProyectoSeeder::class,
            BeneficiarioSeeder::class,
            VisitaDomiciliariaSeeder::class,
        ]);
    }
}
