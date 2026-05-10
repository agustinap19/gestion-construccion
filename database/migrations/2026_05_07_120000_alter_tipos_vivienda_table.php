<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tipos_vivienda', function (Blueprint $table) {
            // Renombrar columnas existentes si el motor lo soporta fácilmente o eliminarlas y crearlas
            // Para simplificar, vamos a eliminar y recrear si no contienen datos vitales, pero como 
            // DB::statement es mejor, usaremos renameColumn donde sea seguro.
            
            if (Schema::hasColumn('tipos_vivienda', 'metraje')) {
                $table->renameColumn('metraje', 'metros_cuadrados');
            }
            if (Schema::hasColumn('tipos_vivienda', 'especificaciones')) {
                $table->renameColumn('especificaciones', 'especificaciones_tecnicas');
            }
            
            // Agregar nuevas columnas
            if (!Schema::hasColumn('tipos_vivienda', 'cantidad_dormitorios')) {
                $table->integer('cantidad_dormitorios')->default(0)->after('descripcion');
            }
            if (!Schema::hasColumn('tipos_vivienda', 'cantidad_banos')) {
                $table->integer('cantidad_banos')->default(0)->after('cantidad_dormitorios');
            }
            if (!Schema::hasColumn('tipos_vivienda', 'tiene_cocina')) {
                $table->boolean('tiene_cocina')->default(false)->after('cantidad_banos');
            }
            if (!Schema::hasColumn('tipos_vivienda', 'tiene_sala_comedor')) {
                $table->boolean('tiene_sala_comedor')->default(false)->after('tiene_cocina');
            }
            if (!Schema::hasColumn('tipos_vivienda', 'tiene_patio')) {
                $table->boolean('tiene_patio')->default(false)->after('tiene_sala_comedor');
            }
            if (!Schema::hasColumn('tipos_vivienda', 'tiene_lavanderia')) {
                $table->boolean('tiene_lavanderia')->default(false)->after('tiene_patio');
            }
            if (!Schema::hasColumn('tipos_vivienda', 'plano_url')) {
                $table->string('plano_url')->nullable();
            }
            if (!Schema::hasColumn('tipos_vivienda', 'costo_estimado')) {
                $table->decimal('costo_estimado', 10, 2)->nullable();
            }
            if (!Schema::hasColumn('tipos_vivienda', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tipos_vivienda', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn([
                'cantidad_dormitorios', 'cantidad_banos', 'tiene_cocina', 'tiene_sala_comedor',
                'tiene_patio', 'tiene_lavanderia', 'plano_url', 'costo_estimado'
            ]);
            $table->renameColumn('metros_cuadrados', 'metraje');
            $table->renameColumn('especificaciones_tecnicas', 'especificaciones');
        });
    }
};
