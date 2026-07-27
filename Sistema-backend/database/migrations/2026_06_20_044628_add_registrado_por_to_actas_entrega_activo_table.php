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
        Schema::table('actas_entrega_activo', function (Blueprint $table) {
            $table->foreignId('entrega_registrada_por')->nullable()->after('aprobado_por')->constrained('users')->nullOnDelete();
            $table->foreignId('devolucion_registrada_por')->nullable()->after('entrega_registrada_por')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('actas_entrega_activo', function (Blueprint $table) {
            $table->dropConstrainedForeignId('entrega_registrada_por');
            $table->dropConstrainedForeignId('devolucion_registrada_por');
        });
    }
};
