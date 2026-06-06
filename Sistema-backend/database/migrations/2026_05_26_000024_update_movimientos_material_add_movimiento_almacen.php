<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movimientos_material', function (Blueprint $table) {
            $table->foreignId('movimiento_almacen_id')
                  ->nullable()
                  ->after('id')
                  ->constrained('movimientos_almacen')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('movimientos_material', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\MovimientoAlmacen::class, 'movimiento_almacen_id');
            $table->dropColumn('movimiento_almacen_id');
        });
    }
};
