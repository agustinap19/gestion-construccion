<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proyectos', function (Blueprint $table) {
            $table->string('contrato_url')->nullable()->after('monto_contrato');
            $table->integer('cantidad_beneficiarios')->nullable()->after('cantidad_unidades');
            $table->string('tipo_obra')->nullable()->after('tipo_proyecto_id');
            $table->integer('plazo_dias')->nullable()->after('fecha_fin_planificada');
        });
    }

    public function down(): void
    {
        Schema::table('proyectos', function (Blueprint $table) {
            $table->dropColumn(['contrato_url', 'cantidad_beneficiarios', 'tipo_obra', 'plazo_dias']);
        });
    }
};
