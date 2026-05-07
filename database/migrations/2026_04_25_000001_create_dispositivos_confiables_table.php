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
        Schema::create('dispositivos_confiables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->string('fingerprint', 64);
            $table->string('nombre_dispositivo', 150)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('ip_registro', 45)->nullable();
            $table->timestamp('fecha_registro')->useCurrent();
            $table->timestamp('ultimo_uso')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->unique(['usuario_id', 'fingerprint']);
            $table->index('usuario_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dispositivos_confiables');
    }
};
