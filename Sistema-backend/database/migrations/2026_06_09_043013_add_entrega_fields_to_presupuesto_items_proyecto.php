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
        Schema::table('presupuesto_items_proyecto', function (Blueprint $table) {
            $table->timestamp('fecha_primera_entrega_material')->nullable()->after('tiene_override_receta');
            $table->boolean('alerta_sin_reporte')->default(false)->after('fecha_primera_entrega_material');
        });
    }

    public function down(): void
    {
        Schema::table('presupuesto_items_proyecto', function (Blueprint $table) {
            $table->dropColumn(['fecha_primera_entrega_material', 'alerta_sin_reporte']);
        });
    }
};
