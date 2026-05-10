<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fases_proyecto', function (Blueprint $table) {
            $table->engine    = 'InnoDB';
            $table->charset   = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('codigo', 50)->unique(); // FAS-PRJ-2026-0003-01

            $table->foreignId('proyecto_id')
                  ->constrained('proyectos')
                  ->restrictOnDelete();

            $table->string('nombre', 150);
            $table->text('descripcion')->nullable();

            // Posición en la secuencia (1, 2, 3…). Único por proyecto.
            $table->unsignedSmallInteger('orden')->default(1);

            // Auto-referencia: la fase que debe estar completada antes de iniciar esta
            $table->foreignId('fase_prerrequisito_id')
                  ->nullable()
                  ->constrained('fases_proyecto')
                  ->nullOnDelete();

            // Peso de esta fase sobre el total del proyecto (suma de todas = 100)
            $table->decimal('peso_porcentual', 5, 2)->default(0);

            $table->enum('estado', [
                'pendiente',
                'en_proceso',
                'completada',
                'pausada',
                'cancelada',
            ])->default('pendiente');

            // Avance interno: 0–100 %, contribuye al avance total según peso_porcentual
            $table->decimal('porcentaje_avance_interno', 5, 2)->default(0);

            $table->date('fecha_inicio_planificada')->nullable();
            $table->date('fecha_fin_planificada')->nullable();
            $table->date('fecha_inicio_real')->nullable();
            $table->date('fecha_fin_real')->nullable();

            $table->text('observaciones')->nullable();

            $table->foreignId('usuario_creador_id')
                  ->nullable()
                  ->constrained('usuarios')
                  ->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
            $table->index('estado');
            $table->index(['proyecto_id', 'orden']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fases_proyecto');
    }
};
