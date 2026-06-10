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
        Schema::create('configuracion_alertas_cerebro', function (Blueprint $table) {
            $table->id();
            $table->string('tipo_alerta')->unique();
            $table->json('parametros');
            $table->foreignId('usuario_actualizador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('configuracion_alertas_cerebro');
    }
};
