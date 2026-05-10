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
            if (Schema::hasColumn('proyectos', 'direccion_obra') && !Schema::hasColumn('proyectos', 'direccion')) {
                $table->renameColumn('direccion_obra', 'direccion');
            }
            if (!Schema::hasColumn('proyectos', 'presupuesto_ejecutado')) {
                $table->decimal('presupuesto_ejecutado', 14, 2)->default(0)->after('presupuesto_total');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('proyectos', function (Blueprint $table) {
            if (Schema::hasColumn('proyectos', 'direccion')) {
                $table->renameColumn('direccion', 'direccion_obra');
            }
            if (Schema::hasColumn('proyectos', 'presupuesto_ejecutado')) {
                $table->dropColumn('presupuesto_ejecutado');
            }
        });
    }
};
