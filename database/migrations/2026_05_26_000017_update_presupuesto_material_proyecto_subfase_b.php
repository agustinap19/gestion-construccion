<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('presupuesto_material_proyecto', function (Blueprint $table) {
            $table->decimal('cantidad_ajustada', 12, 4)->nullable()->after('monto_total');
            $table->decimal('cantidad_comprada', 12, 4)->default(0)->after('cantidad_ajustada');
            $table->decimal('cantidad_en_almacen_proyecto', 12, 4)->default(0)->after('cantidad_comprada');
            $table->decimal('cantidad_entregada_obra', 12, 4)->default(0)->after('cantidad_en_almacen_proyecto');
            $table->boolean('bloqueado')->default(false)->after('cantidad_entregada_obra');
            $table->foreignId('bloqueado_por_id')->nullable()->constrained('users')->nullOnDelete()->after('bloqueado');
            $table->timestamp('bloqueado_en')->nullable()->after('bloqueado_por_id');
        });
    }

    public function down(): void
    {
        Schema::table('presupuesto_material_proyecto', function (Blueprint $table) {
            $table->dropForeign(['bloqueado_por_id']);
            $table->dropColumn([
                'cantidad_ajustada', 'cantidad_comprada',
                'cantidad_en_almacen_proyecto', 'cantidad_entregada_obra',
                'bloqueado', 'bloqueado_por_id', 'bloqueado_en',
            ]);
        });
    }
};
