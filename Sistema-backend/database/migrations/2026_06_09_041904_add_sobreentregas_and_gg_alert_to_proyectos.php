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
        Schema::table('proyectos', function (Blueprint $table) {
            $table->decimal('sobreentregas_materiales', 14, 2)->default(0)->after('presupuesto_materiales');
            $table->boolean('alerta_gg_bajo')->default(false)->after('sobreentregas_materiales');
        });

        Schema::table('configuracion_porcentajes_presupuesto', function (Blueprint $table) {
            $table->decimal('umbral_gg_minimo', 5, 2)->default(3.00)->after('umbral_rentabilidad_minima');
        });
    }

    public function down(): void
    {
        Schema::table('proyectos', function (Blueprint $table) {
            $table->dropColumn(['sobreentregas_materiales', 'alerta_gg_bajo']);
        });
        Schema::table('configuracion_porcentajes_presupuesto', function (Blueprint $table) {
            $table->dropColumn('umbral_gg_minimo');
        });
    }
};
