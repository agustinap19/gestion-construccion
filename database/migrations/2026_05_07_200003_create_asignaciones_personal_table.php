<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asignaciones_personal', function (Blueprint $table) {
            $table->engine    = 'InnoDB';
            $table->charset   = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();

            $table->foreignId('proyecto_id')
                  ->constrained('proyectos')
                  ->cascadeOnDelete();

            $table->foreignId('personal_id')
                  ->constrained('personal')
                  ->restrictOnDelete();

            $table->string('rol_en_proyecto', 100)->nullable(); // Ej: "Técnico de campo", "Maestro de obra"

            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_fin')->nullable();

            $table->enum('estado', ['activa', 'finalizada', 'suspendida'])->default('activa');

            // Solo un responsable principal por proyecto (validado en servicio)
            $table->boolean('es_responsable_principal')->default(false);

            $table->text('observaciones')->nullable();

            $table->foreignId('usuario_asignador_id')
                  ->nullable()
                  ->constrained('usuarios')
                  ->nullOnDelete();

            $table->timestamps();

            $table->index('proyecto_id');
            $table->index('personal_id');
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asignaciones_personal');
    }
};
