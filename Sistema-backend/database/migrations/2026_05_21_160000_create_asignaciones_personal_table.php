<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asignaciones_personal', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->foreignId('personal_id')->constrained('personal')->cascadeOnDelete();
            $table->string('rol_en_proyecto', 100);
            $table->string('responsabilidades', 1000)->nullable();
            $table->date('fecha_inicio');
            $table->date('fecha_fin')->nullable();
            $table->enum('estado', ['activa', 'finalizada', 'cancelada'])->default('activa');
            $table->boolean('es_responsable_principal')->default(false);
            $table->text('observaciones')->nullable();
            $table->foreignId('usuario_asignador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asignaciones_personal');
    }
};
