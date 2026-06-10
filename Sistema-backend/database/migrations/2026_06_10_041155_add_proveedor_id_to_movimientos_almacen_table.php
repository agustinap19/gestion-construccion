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
        Schema::table('movimientos_almacen', function (Blueprint $table) {
            $table->foreignId('proveedor_id')
                  ->nullable()
                  ->after('proveedor_nombre')
                  ->constrained('proveedores')
                  ->nullOnDelete();

            $table->index('proveedor_id');
        });
    }

    public function down(): void
    {
        Schema::table('movimientos_almacen', function (Blueprint $table) {
            $table->dropForeign(['proveedor_id']);
            $table->dropIndex(['proveedor_id']);
            $table->dropColumn('proveedor_id');
        });
    }
};
