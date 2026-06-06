<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fases_proyecto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->integer('orden');
            $table->date('fecha_inicio_planificada')->nullable();
            $table->date('fecha_fin_planificada')->nullable();
            $table->date('fecha_inicio_real')->nullable();
            $table->date('fecha_fin_real')->nullable();
            $table->decimal('avance_porcentaje', 5, 2)->default(0);
            $table->enum('estado', ['pendiente', 'en_progreso', 'completada', 'suspendida'])->default('pendiente');
            $table->foreignId('fase_prerrequisito_id')->nullable()->constrained('fases_proyecto')->nullOnDelete();
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fases_proyecto');
    }
};
