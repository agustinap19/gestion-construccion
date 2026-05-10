<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->boolean('es_admin_central')->default(false)->after('estado')
                  ->comment('Usuario administrador central que no puede ser eliminado ni inactivado');
        });

        // Agregar softDeletes a asignaciones_personal si no existe
        if (!Schema::hasColumn('asignaciones_personal', 'deleted_at')) {
            Schema::table('asignaciones_personal', function (Blueprint $table) {
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropColumn('es_admin_central');
        });

        if (Schema::hasColumn('asignaciones_personal', 'deleted_at')) {
            Schema::table('asignaciones_personal', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
    }
};
