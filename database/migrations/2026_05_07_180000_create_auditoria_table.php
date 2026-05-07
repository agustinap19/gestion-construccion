<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auditoria', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->unsignedBigInteger('usuario_actor_id')->nullable();
            $table->unsignedBigInteger('usuario_objetivo_id')->nullable();
            $table->string('evento', 100);
            $table->string('tabla_afectada', 50);
            $table->unsignedBigInteger('registro_id')->nullable();
            $table->json('datos_anteriores')->nullable();
            $table->json('datos_nuevos')->nullable();
            $table->text('razon')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->nullable();

            // Foreign keys
            $table->foreign('usuario_actor_id')
                  ->references('id')
                  ->on('usuarios')
                  ->nullOnDelete();

            $table->foreign('usuario_objetivo_id')
                  ->references('id')
                  ->on('usuarios')
                  ->nullOnDelete();

            // Índices
            $table->index('usuario_actor_id');
            $table->index('evento');
            $table->index('tabla_afectada');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auditoria');
    }
};
