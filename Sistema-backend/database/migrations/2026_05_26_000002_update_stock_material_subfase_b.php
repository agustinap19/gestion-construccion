<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_material', function (Blueprint $table) {
            $table->decimal('stock_minimo_alerta', 12, 4)->nullable()->after('costo_promedio');
            $table->decimal('cantidad_en_transito', 12, 4)->default(0)->after('cantidad_reservada');
            $table->decimal('ultimo_precio_entrada', 12, 4)->nullable()->after('costo_promedio');
            $table->timestamp('ultima_fecha_movimiento')->nullable()->after('ultima_actualizacion');
        });
    }

    public function down(): void
    {
        Schema::table('stock_material', function (Blueprint $table) {
            $table->dropColumn([
                'stock_minimo_alerta',
                'cantidad_en_transito',
                'ultimo_precio_entrada',
                'ultima_fecha_movimiento',
            ]);
        });
    }
};
