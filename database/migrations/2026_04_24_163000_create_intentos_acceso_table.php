<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intentos_acceso', function (Blueprint $table) {
            $table->id();
            $table->string('email', 150);
            $table->unsignedBigInteger('usuario_id')->nullable();
            $table->string('ip_address', 45);
            $table->text('user_agent')->nullable();
            $table->boolean('exitoso')->default(false);
            $table->string('motivo_fallo', 100)->nullable();
            $table->string('pais', 80)->nullable();
            $table->string('ciudad', 80)->nullable();
            $table->timestamp('fecha_intento');
            $table->timestamps();

            $table->foreign('usuario_id')->references('id')->on('usuarios')->nullOnDelete();
            
            $table->index('email');
            $table->index('ip_address');
            $table->index('fecha_intento');
            $table->index('exitoso');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intentos_acceso');
    }
};
