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
        Schema::create('tokens_recuperacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->string('token', 80)->unique();
            $table->string('email', 150);
            $table->string('ip_solicitud', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('expira_en');
            $table->boolean('usado')->default(false);
            $table->timestamp('usado_en')->nullable();
            $table->boolean('rostro_verificado')->default(false);
            $table->timestamps();

            // Índices para optimizar búsquedas frecuentes
            $table->index('usuario_id');
            $table->index('expira_en');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tokens_recuperacion');
    }
};
