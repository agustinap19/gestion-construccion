<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proyectos', function (Blueprint $table) {
            $table->string('salud_financiera')->nullable()->after('justificacion_rentabilidad_baja');
        });
    }

    public function down(): void
    {
        Schema::table('proyectos', function (Blueprint $table) {
            $table->dropColumn('salud_financiera');
        });
    }
};
