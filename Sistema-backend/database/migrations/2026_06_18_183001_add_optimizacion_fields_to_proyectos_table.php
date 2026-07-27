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
            // % de avance que debería tener el proyecto a la fecha según cronograma.
            // Manual por ahora (sin curva automática) — usado por el motor de optimización
            // para calcular atraso = avance_esperado - avance_fisico.
            $table->decimal('avance_esperado', 5, 2)->nullable()->after('avance_fisico');
            // Penalidad contractual en Bs por día de atraso. Usado por el Simplex de proyectos.
            $table->decimal('penalidad_diaria', 12, 2)->nullable()->after('avance_esperado');
            // Días estimados que el activo necesita trabajar en este proyecto.
            $table->integer('dias_estimados_activo')->nullable()->after('penalidad_diaria');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('proyectos', function (Blueprint $table) {
            $table->dropColumn(['avance_esperado', 'penalidad_diaria', 'dias_estimados_activo']);
        });
    }
};
